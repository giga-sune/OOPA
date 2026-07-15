import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { app } from "../firebase/firebaseApp";

const functions = getFunctions(app);

connectFunctionsEmulator(
  functions,
  process.env.EXPO_PUBLIC_FUNCTIONS_EMULATOR_HOST!,
  5001
);

const createPaymentIntentCallable = httpsCallable<
  { amount: number },
  { clientSecret: string }
>(functions, "createPaymentIntent");

export async function createPaymentIntent(
  amountInCents: number
): Promise<string> {
  const result = await createPaymentIntentCallable({
    amount: amountInCents,
  });

  return result.data.clientSecret;
}
