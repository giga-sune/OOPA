import {defineSecret} from "firebase-functions/params";
import {onCall} from "firebase-functions/v2/https";
import Stripe from "stripe";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

export const createPaymentIntent = onCall(
  {secrets: [stripeSecretKey]},
  async (request) => {
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
