import { httpsCallable } from "firebase/functions";

import { functions } from "../firebase/firebaseApp";
import type {
  CreatePaymentIntentResult,
  PaymentStatus,
} from "../../types/payment/paymentTypes";

const createPaymentIntentCallable = httpsCallable<
  { rentalId: string },
  CreatePaymentIntentResult
>(functions, "createPaymentIntent");

const cancelPaymentAttemptCallable = httpsCallable<
  { rentalId: string },
  { paymentStatus: PaymentStatus }
>(functions, "cancelPaymentAttempt");

function getCallableErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const callableError = error as { code?: string; message?: string };

    if (callableError.code === "functions/internal") {
      return "Payment service is unavailable. Make sure Firebase Functions and Stripe are configured.";
    }

    if (
      typeof callableError.message === "string" &&
      callableError.message.length > 0 &&
      callableError.message !== "internal"
    ) {
      return callableError.message;
    }
  }

  if (error instanceof Error && error.message && error.message !== "internal") {
    return error.message;
  }

  return fallback;
}

export async function createPaymentIntent(
  rentalId: string
): Promise<CreatePaymentIntentResult> {
  try {
    const result = await createPaymentIntentCallable({
      rentalId,
    });

    return result.data;
  } catch (error) {
    throw new Error(getCallableErrorMessage(error, "Unable to start payment."));
  }
}

export async function cancelPaymentAttempt(
  rentalId: string
): Promise<PaymentStatus> {
  try {
    const result = await cancelPaymentAttemptCallable({ rentalId });
    return result.data.paymentStatus;
  } catch (error) {
    throw new Error(getCallableErrorMessage(error, "Unable to cancel payment."));
  }
}
