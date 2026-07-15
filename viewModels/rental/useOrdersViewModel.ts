import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../../context/AuthContext";
import {
  approveRentalRequest,
  getRentalsByOwner,
  getRentalsByRenter,
  rejectRentalRequest,
} from "../../services/firestore/rentalService";
import type { Rental, RentalStatus } from "../../types/rental/rentalTypes";

export interface RentalOrderItem {
  id: string;
  title: string;
  price: number;
  ratePeriod: string;
  startDate: string;
  endDate: string;
  status: string;
  imageUrl?: string;
}

export interface OrdersViewModelResult {
  myOrders: RentalOrderItem[];
  requests: RentalOrderItem[];
  loading: boolean;
  errorMessage: string;
  updatingRentalId: string | null;
  refreshOrders: () => Promise<void>;
  approveRequest: (rentalId: string) => Promise<void>;
  rejectRequest: (rentalId: string) => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-GB");
}

function formatStatus(status: RentalStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function mapRentalToOrderItem(rental: Rental): RentalOrderItem {
  return {
    id: rental.id,
    title: rental.propertyTitle,
    price: rental.propertyPrice,
    ratePeriod: rental.propertyRatePeriod,
    startDate: formatDate(rental.startDate),
    endDate: formatDate(rental.endDate),
    status: formatStatus(rental.status),
    imageUrl: rental.propertyImageUrl ?? undefined,
  };
}

export default function useOrdersViewModel(): OrdersViewModelResult {
  const { user } = useAuth();
  const [myOrders, setMyOrders] = useState<RentalOrderItem[]>([]);
  const [requests, setRequests] = useState<RentalOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingRentalId, setUpdatingRentalId] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    if (!user?.uid) {
      setMyOrders([]);
      setRequests([]);
      setLoading(false);
      setErrorMessage("");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const [renterRentals, ownerRentals] = await Promise.all([
        getRentalsByRenter(user.uid),
        getRentalsByOwner(user.uid),
      ]);

      setMyOrders(renterRentals.map(mapRentalToOrderItem));
      setRequests(ownerRentals.map(mapRentalToOrderItem));
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not load your rental requests right now."));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useFocusEffect(
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders])
  );

  const approveRequest = useCallback(async (rentalId: string) => {
    setUpdatingRentalId(rentalId);
    setErrorMessage("");

    try {
      await approveRentalRequest(rentalId);
      await refreshOrders();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not approve this rental request."));
    } finally {
      setUpdatingRentalId(null);
    }
  }, [refreshOrders]);

  const rejectRequest = useCallback(async (rentalId: string) => {
    setUpdatingRentalId(rentalId);
    setErrorMessage("");

    try {
      await rejectRentalRequest(rentalId);
      await refreshOrders();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Could not reject this rental request."));
    } finally {
      setUpdatingRentalId(null);
    }
  }, [refreshOrders]);

  return {
    myOrders,
    requests,
    loading,
    errorMessage,
    updatingRentalId,
    refreshOrders,
    approveRequest,
    rejectRequest,
  };
}
