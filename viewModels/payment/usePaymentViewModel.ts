import { useEffect, useRef, useState } from "react";
import { useStripe } from "@stripe/stripe-react-native";

import {
  cancelPaymentAttempt,
  createPaymentIntent,
} from "../../services/stripe/stripeService";
import usePaymentStatusViewModel from "./usePaymentStatusViewModel";

export type PaymentAttemptOutcome =
  | { status: "success" }
  | { status: "cancelled" }
  | { status: "failure"; message: string };

export default function usePaymentViewModel(rentalId: string) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const paymentInFlightRef = useRef(false);
  const paymentCompletedRef = useRef(false);
  const [isPaying, setIsPaying] = useState(false);
  const [didCompletePayment, setDidCompletePayment] = useState(false);
  const paymentState = usePaymentStatusViewModel(rentalId);

  useEffect(() => {
    paymentInFlightRef.current = false;
    paymentCompletedRef.current = false;
    setIsPaying(false);
    setDidCompletePayment(false);
  }, [rentalId]);

  const releasePaymentAttempt = async () => {
    try {
      await cancelPaymentAttempt(rentalId);
    } catch {
      // Keep checkout locked until Firestore confirms cancellation.
    }
  };

  const pay = async (): Promise<PaymentAttemptOutcome> => {
    if (!rentalId.trim()) return { status: "failure", message: "Rental ID is required." };
    if (paymentInFlightRef.current) {
      return { status: "failure", message: "A payment is already in progress." };
    }
    if (paymentCompletedRef.current || paymentState.paymentStatus === "paid") {
      return { status: "failure", message: "This rental has already been paid." };
    }

    paymentInFlightRef.current = true;
    setIsPaying(true);

    try {
      const { clientSecret } = await createPaymentIntent(rentalId);
      const { error: initializationError } = await initPaymentSheet({
        merchantDisplayName: "OOPA",
        paymentIntentClientSecret: clientSecret,
      });

      if (initializationError) {
        await releasePaymentAttempt();
        return { status: "failure", message: initializationError.message };
      }

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        await releasePaymentAttempt();
        return paymentError.code === "Canceled"
          ? { status: "cancelled" }
          : { status: "failure", message: paymentError.message };
      }

      paymentCompletedRef.current = true;
      setDidCompletePayment(true);
      return { status: "success" };
    } catch (error) {
      return {
        status: "failure",
        message: error instanceof Error ? error.message : "Unable to process payment.",
      };
    } finally {
      paymentInFlightRef.current = false;
      setIsPaying(false);
    }
  };

  return {
    ...paymentState,
    isPaying,
    isPaymentComplete: didCompletePayment || paymentState.paymentStatus === "paid",
    pay,
  };
}
