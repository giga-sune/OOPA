import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { ensureChatChannel, type PreparedRentalChat } from "../../services/chat/chatService";
import { subscribeToOwnerPayments } from "../../services/firestore/paymentService";
import {
  approveRentalRequest,
  rejectRentalRequest,
  subscribeToRentalsByOwner,
  subscribeToRentalsByRenter,
} from "../../services/firestore/rentalService";
import type { PaymentStatus } from "../../types/payment/paymentTypes";
import type { Rental } from "../../types/rental/rentalTypes";

export type OrdersTab = "My Orders" | "Requests";
export type RentalDecisionProgress = "approving" | "rejecting" | null;
export type RentalActionOutcome =
  | { status: "success"; autoRejectedCount: number }
  | { status: "failure"; message: string };
export type ChatPreparationOutcome =
  | { status: "success"; chat: PreparedRentalChat }
  | { status: "failure"; message: string };

export interface DecisionControlState {
  progress: RentalDecisionProgress;
  acceptDisabled: boolean;
  denyDisabled: boolean;
  lockMessage: string;
}

export interface OrdersViewModelResult {
  activeTab: OrdersTab;
  setActiveTab: (tab: OrdersTab) => void;
  myOrders: Rental[];
  requests: Rental[];
  activeRentals: Rental[];
  isAuthenticated: boolean;
  loading: boolean;
  errorMessage: string;
  getDecisionControls: (rental: Rental) => DecisionControlState;
  approveRequest: (rentalId: string) => Promise<RentalActionOutcome>;
  rejectRequest: (rentalId: string) => Promise<RentalActionOutcome>;
  prepareChat: (rental: Rental) => Promise<ChatPreparationOutcome>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function useOrdersViewModel(): OrdersViewModelResult {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrdersTab>("My Orders");
  const [myOrders, setMyOrders] = useState<Rental[]>([]);
  const [requests, setRequests] = useState<Rental[]>([]);
  const [renterLoaded, setRenterLoaded] = useState(false);
  const [ownerLoaded, setOwnerLoaded] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentStatusError, setPaymentStatusError] = useState("");
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, PaymentStatus>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionProgress, setDecisionProgress] = useState<
    Record<string, Exclude<RentalDecisionProgress, null>>
  >({});
  const decisionsInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMyOrders([]);
    setRequests([]);
    setPaymentStatuses({});
    setDecisionProgress({});
    setErrorMessage("");
    setPaymentStatusError("");
    decisionsInFlightRef.current.clear();

    if (!user?.uid) {
      setRenterLoaded(true);
      setOwnerLoaded(true);
      setPaymentsLoading(false);
      return;
    }

    setRenterLoaded(false);
    setOwnerLoaded(false);
    setPaymentsLoading(true);

    const handleRentalError = (error: Error) => {
      setErrorMessage(getErrorMessage(error, "Could not load your rental requests right now."));
      setRenterLoaded(true);
      setOwnerLoaded(true);
    };

    const unsubscribeRenter = subscribeToRentalsByRenter(
      user.uid,
      (rentals) => {
        setMyOrders(rentals);
        setRenterLoaded(true);
      },
      handleRentalError
    );
    const unsubscribeOwner = subscribeToRentalsByOwner(
      user.uid,
      (rentals) => {
        setRequests(rentals);
        setOwnerLoaded(true);
      },
      handleRentalError
    );
    const unsubscribePayments = subscribeToOwnerPayments(
      user.uid,
      (nextStatuses) => {
        setPaymentStatuses(nextStatuses);
        setPaymentsLoading(false);
        setPaymentStatusError("");
      },
      () => {
        setPaymentStatusError("Could not verify payment status. Rental decisions are temporarily locked.");
        setPaymentsLoading(false);
      }
    );

    return () => {
      unsubscribeRenter();
      unsubscribeOwner();
      unsubscribePayments();
    };
  }, [user?.uid]);

  const runDecision = useCallback(async (
    rentalId: string,
    action: "approving" | "rejecting"
  ): Promise<RentalActionOutcome> => {
    if (!rentalId.trim()) return { status: "failure", message: "Rental ID is required." };
    if (decisionsInFlightRef.current.has(rentalId)) {
      return { status: "failure", message: "This request is already being updated." };
    }

    const rental = requests.find((request) => request.id === rentalId);
    const paymentStatus = paymentStatuses[rentalId] ?? "unpaid";
    if (!rental) return { status: "failure", message: "Rental request could not be found." };
    if (
      paymentsLoading ||
      paymentStatusError ||
      paymentStatus === "processing" ||
      paymentStatus === "paid"
    ) {
      return { status: "failure", message: "This decision is locked by the current payment state." };
    }

    decisionsInFlightRef.current.add(rentalId);
    setDecisionProgress((current) => ({ ...current, [rentalId]: action }));
    setErrorMessage("");

    try {
      if (action === "approving") {
        const result = await approveRentalRequest(rentalId);
        return { status: "success", autoRejectedCount: result.autoRejectedCount };
      }

      await rejectRentalRequest(rentalId);
      return { status: "success", autoRejectedCount: 0 };
    } catch (error) {
      const message = getErrorMessage(
        error,
        action === "approving"
          ? "Could not approve this rental request."
          : "Could not reject this rental request."
      );
      setErrorMessage(message);
      return { status: "failure", message };
    } finally {
      decisionsInFlightRef.current.delete(rentalId);
      setDecisionProgress((current) => {
        const next = { ...current };
        delete next[rentalId];
        return next;
      });
    }
  }, [paymentStatusError, paymentStatuses, paymentsLoading, requests]);

  const approveRequest = useCallback(
    (rentalId: string) => runDecision(rentalId, "approving"),
    [runDecision]
  );
  const rejectRequest = useCallback(
    (rentalId: string) => runDecision(rentalId, "rejecting"),
    [runDecision]
  );

  const prepareChat = useCallback(async (rental: Rental): Promise<ChatPreparationOutcome> => {
    if (!user?.uid) return { status: "failure", message: "You must be signed in to send messages." };
    if (rental.status !== "approved") {
      return { status: "failure", message: "Messaging is available after the rental is approved." };
    }

    try {
      return { status: "success", chat: await ensureChatChannel(rental.id) };
    } catch (error) {
      return {
        status: "failure",
        message: getErrorMessage(error, "Could not open the chat for this rental."),
      };
    }
  }, [user?.uid]);

  const getDecisionControls = useCallback((rental: Rental): DecisionControlState => {
    const progress = decisionProgress[rental.id] ?? null;
    const paymentStatus = paymentStatuses[rental.id] ?? "unpaid";
    const paymentLocked =
      paymentsLoading || Boolean(paymentStatusError) || paymentStatus === "processing" || paymentStatus === "paid";
    let lockMessage = "";
    if (paymentStatus === "paid") lockMessage = "Decision locked after payment";
    else if (paymentStatus === "processing") lockMessage = "Decision locked while payment is processing";
    else if (paymentStatusError) lockMessage = paymentStatusError;

    return {
      progress,
      acceptDisabled: progress !== null || paymentLocked || rental.status === "approved",
      denyDisabled: progress !== null || paymentLocked || rental.status === "rejected",
      lockMessage,
    };
  }, [decisionProgress, paymentStatusError, paymentStatuses, paymentsLoading]);

  const activeRentals = useMemo(
    () => activeTab === "My Orders" ? myOrders : requests,
    [activeTab, myOrders, requests]
  );

  return {
    activeTab,
    setActiveTab,
    myOrders,
    requests,
    activeRentals,
    isAuthenticated: Boolean(user),
    loading: !renterLoaded || !ownerLoaded,
    errorMessage,
    getDecisionControls,
    approveRequest,
    rejectRequest,
    prepareChat,
  };
}
