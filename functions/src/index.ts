import { defineSecret } from "firebase-functions/params";
import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

interface PaymentIntentData {
  amount: number;
}

export const createPaymentIntent = onCall(
  { secrets: [stripeSecretKey] },
  async (request: CallableRequest<PaymentIntentData>) => { 
    const stripe = new Stripe(stripeSecretKey.value());

    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.data.amount,
      currency: "cad",
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  }
);