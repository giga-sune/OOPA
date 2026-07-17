import { useRef, useState } from "react";
import { Alert } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";

import {
  cancelPaymentAttempt,
  createPaymentIntent,
} from "../../services/stripe/stripeService";
import usePaymentStatusViewModel from "./usePaymentStatusViewModel";

export default function usePaymentViewModel(rentalId: string) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const paymentInFlightRef = useRef(false);
  const paymentCompletedRef = useRef(false);
  const [isPaying, setIsPaying] = useState(false);
  const [didCompletePayment, setDidCompletePayment] = useState(false);
  const paymentState = usePaymentStatusViewModel(rentalId);

  const releasePaymentAttempt = async () => {
    try {
      await cancelPaymentAttempt(rentalId);
    } catch {
      // The Firestore listener keeps the UI locked if cancellation did not finish.
    }
  };

  const pay = async () => {
    if (
      paymentInFlightRef.current ||
      paymentCompletedRef.current ||
      !rentalId.trim() ||
      paymentState.paymentStatus === "paid"
    ) {
      return;
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
        Alert.alert("Payment Error", initializationError.message);
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        await releasePaymentAttempt();

        if (paymentError.code !== "Canceled") {
          Alert.alert("Payment Error", paymentError.message);
        }
        return;
      }

      paymentCompletedRef.current = true;
      setDidCompletePayment(true);
      Alert.alert("Payment Successful", "Your payment was completed.");
    } catch (error) {
      Alert.alert(
        "Payment Error",
        error instanceof Error ? error.message : "Unable to process payment."
      );
    } finally {
      paymentInFlightRef.current = false;
      setIsPaying(false);
    }
  };

  return {
    ...paymentState,
    isPaying,
    isPaymentComplete:
      didCompletePayment || paymentState.paymentStatus === "paid",
    pay,
  };
}
