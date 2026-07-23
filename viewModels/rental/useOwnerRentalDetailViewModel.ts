import { useRef, useState } from "react";

import { ensureChatChannel, type PreparedRentalChat } from "../../services/chat/chatService";
import {
  approveRentalRequest,
  rejectRentalRequest,
} from "../../services/firestore/rentalService";
import usePaymentStatusViewModel from "../payment/usePaymentStatusViewModel";
import useRentalDetailData from "./useRentalDetailData";

export type OwnerDecisionProgress = "approving" | "rejecting" | null;
export type OwnerDecisionOutcome =
  | { status: "success" }
  | { status: "failure"; message: string };
export type OwnerChatOutcome =
  | { status: "success"; chat: PreparedRentalChat }
  | { status: "failure"; message: string };

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function useOwnerRentalDetailViewModel(rentalId: string) {
  const detail = useRentalDetailData(rentalId, "owner");
  const payment = usePaymentStatusViewModel(rentalId);
  const decisionInFlightRef = useRef(false);
  const [decisionProgress, setDecisionProgress] = useState<OwnerDecisionProgress>(null);
  const currentStatus = detail.rental?.status ?? "pending";
  const paymentLocked =
    payment.isPaymentLoading ||
    Boolean(payment.paymentStatusError) ||
    payment.paymentStatus === "processing" ||
    payment.paymentStatus === "paid";

  const updateStatus = async (
    nextStatus: "approved" | "rejected"
  ): Promise<OwnerDecisionOutcome> => {
    if (!detail.isAuthorized || !detail.rental) {
      return { status: "failure", message: "You do not have access to update this rental." };
    }
    if (paymentLocked) {
      return { status: "failure", message: "This decision is locked by the current payment state." };
    }
    if (decisionInFlightRef.current) {
      return { status: "failure", message: "This request is already being updated." };
    }

    decisionInFlightRef.current = true;
    setDecisionProgress(nextStatus === "approved" ? "approving" : "rejecting");
    try {
      if (nextStatus === "approved") await approveRentalRequest(rentalId);
      else await rejectRentalRequest(rentalId);
      return { status: "success" };
    } catch (error) {
      return {
        status: "failure",
        message: getErrorMessage(error, "Failed to update request status."),
      };
    } finally {
      decisionInFlightRef.current = false;
      setDecisionProgress(null);
    }
  };

  const prepareChat = async (): Promise<OwnerChatOutcome> => {
    if (!detail.isAuthorized || !detail.rental) {
      return { status: "failure", message: "You do not have access to this rental." };
    }
    if (detail.rental.status !== "approved") {
      return { status: "failure", message: "Messaging is available after approval." };
    }

    try {
      return { status: "success", chat: await ensureChatChannel(detail.rental.id) };
    } catch (error) {
      return {
        status: "failure",
        message: getErrorMessage(error, "Unable to load messaging details."),
      };
    }
  };

  return {
    ...detail,
    ...payment,
    decisionProgress,
    currentStatus,
    isPaymentLocked: paymentLocked,
    acceptDisabled:
      !detail.isAuthorized || decisionProgress !== null || paymentLocked || currentStatus === "approved",
    denyDisabled:
      !detail.isAuthorized || decisionProgress !== null || paymentLocked || currentStatus === "rejected",
    updateStatus,
    prepareChat,
  };
}
