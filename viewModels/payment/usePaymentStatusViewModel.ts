import { useEffect, useState } from "react";

import { subscribeToPayment } from "../../services/firestore/paymentService";
import type { PaymentStatus } from "../../types/payment/paymentTypes";

interface PaymentStatusViewModelResult {
  paymentStatus: PaymentStatus;
  isPaymentLoading: boolean;
  paymentStatusError: string;
}

export default function usePaymentStatusViewModel(
  rentalId: string
): PaymentStatusViewModelResult {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [isPaymentLoading, setIsPaymentLoading] = useState(true);
  const [paymentStatusError, setPaymentStatusError] = useState("");

  useEffect(() => {
    setIsPaymentLoading(true);
    setPaymentStatusError("");

    return subscribeToPayment(
      rentalId,
      (payment) => {
        setPaymentStatus(payment?.status ?? "unpaid");
        setIsPaymentLoading(false);
      },
      () => {
        setPaymentStatusError("Could not verify the payment status.");
        setIsPaymentLoading(false);
      }
    );
  }, [rentalId]);

  return {
    paymentStatus,
    isPaymentLoading,
    paymentStatusError,
  };
}

