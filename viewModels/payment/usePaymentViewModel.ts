import { useState } from "react";
import { Alert } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";

import { createPaymentIntent } from "../../services/stripe/stripeService";

export default function usePaymentViewModel() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isPaying, setIsPaying] = useState(false);

  const pay = async (totalPrice: number) => {
    setIsPaying(true);

    try {
      const clientSecret = await createPaymentIntent(
        Math.round(totalPrice * 100)
      );

      const { error: initializationError } = await initPaymentSheet({
        merchantDisplayName: "OOPA",
        paymentIntentClientSecret: clientSecret,
      });

      if (initializationError) {
        Alert.alert("Payment Error", initializationError.message);
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        Alert.alert("Payment Error", paymentError.message);
        return;
      }

      Alert.alert("Payment Successful", "Your payment was completed.");
    } catch (error) {
      Alert.alert(
        "Payment Error",
        error instanceof Error ? error.message : "Unable to process payment."
      );
    } finally {
      setIsPaying(false);
    }
  };

  return {
    isPaying,
    pay,
  };
}
