import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "../firebase/firebaseApp";
import type {
  CreatePaymentIntentResult,
  PaymentStatus,
} from "../../types/payment/paymentTypes";

const functions = getFunctions(app);
const emulatorHost = process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST;

if (__DEV__ && emulatorHost) {
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}

const createPaymentIntentCallable = httpsCallable<
  { rentalId: string },
  CreatePaymentIntentResult
>(functions, "createPaymentIntent");

const cancelPaymentAttemptCallable = httpsCallable<
  { rentalId: string },
  { paymentStatus: PaymentStatus }
>(functions, "cancelPaymentAttempt");

export async function createPaymentIntent(
  rentalId: string
): Promise<CreatePaymentIntentResult> {
  const result = await createPaymentIntentCallable({
    rentalId,
  });

  return result.data;
}

export async function cancelPaymentAttempt(
  rentalId: string
): Promise<PaymentStatus> {
  const result = await cancelPaymentAttemptCallable({ rentalId });
  return result.data.paymentStatus;
}
