import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {defineSecret} from "firebase-functions/params";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import Stripe from "stripe";

if (getApps().length === 0) {
  initializeApp();
}

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const RENTALS_COLLECTION = "rentals";
const PAYMENTS_COLLECTION = "payments";
const CURRENCY = "cad";

type StoredPaymentStatus = "unpaid" | "processing" | "paid";

interface StoredPayment {
  rentalId: string;
  propertyId: string;
  renterUid: string;
  ownerUid: string;
  amountInCents: number;
  currency: typeof CURRENCY;
  provider: "stripe";
  stripePaymentIntentId: string;
  attemptNumber: number;
  status: StoredPaymentStatus;
}

/**
 * Validates and normalizes a callable rental identifier.
 *
 * @param {unknown} value Callable input value.
 * @return {string} Normalized rental identifier.
 */
function requireRentalId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", "Rental ID is required.");
  }

  return value.trim();
}

/**
 * Converts a trusted Firestore rental total into Stripe cents.
 *
 * @param {unknown} value Rental total stored in Firestore.
 * @return {number} Positive integer amount in cents.
 */
function readAmountInCents(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "The rental has an invalid total price."
    );
  }

  const amountInCents = Math.round(value * 100);

  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "The rental has an invalid total price."
    );
  }

  return amountInCents;
}

/**
 * Checks whether an existing Stripe intent can be safely reused.
 *
 * @param {Stripe.PaymentIntent} paymentIntent Stripe payment intent.
 * @return {boolean} Whether the intent may be presented again.
 */
function isReusablePaymentIntent(paymentIntent: Stripe.PaymentIntent): boolean {
  return paymentIntent.status !== "canceled" &&
    paymentIntent.status !== "succeeded";
}

/**
 * Reads the minimum trusted payment fields used by backend decisions.
 *
 * @param {unknown} value Firestore payment document data.
 * @return {StoredPayment | null} Parsed payment data when usable.
 */
function readStoredPayment(value: unknown): StoredPayment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payment = value as Partial<StoredPayment>;

  if (
    typeof payment.stripePaymentIntentId !== "string" ||
    typeof payment.attemptNumber !== "number"
  ) {
    return null;
  }

  return payment as StoredPayment;
}

/**
 * Applies a verified Stripe webhook status to the current payment attempt.
 *
 * @param {Stripe.PaymentIntent} paymentIntent Verified Stripe intent.
 * @param {StoredPaymentStatus} status Application payment status.
 * @return {Promise<void>} Resolves when the transaction finishes.
 */
async function markPaymentFromWebhook(
  paymentIntent: Stripe.PaymentIntent,
  status: StoredPaymentStatus
): Promise<void> {
  const rentalId = paymentIntent.metadata.rentalId;

  if (!rentalId) {
    return;
  }

  const db = getFirestore();
  const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(rentalId);

  await db.runTransaction(async (transaction) => {
    const paymentSnapshot = await transaction.get(paymentRef);

    if (!paymentSnapshot.exists) {
      return;
    }

    const storedPayment = readStoredPayment(paymentSnapshot.data());

    if (
      !storedPayment ||
      storedPayment.stripePaymentIntentId !== paymentIntent.id
    ) {
      return;
    }

    transaction.update(paymentRef, {
      status,
      updatedAt: FieldValue.serverTimestamp(),
      paidAt: status === "paid" ? FieldValue.serverTimestamp() : null,
    });
  });
}

export const createPaymentIntent = onCall(
  {invoker: "public", secrets: [stripeSecretKey]},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to pay for a rental."
      );
    }

    const rentalId = requireRentalId(request.data?.rentalId);
    const db = getFirestore();
    const rentalRef = db.collection(RENTALS_COLLECTION).doc(rentalId);
    const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(rentalId);
    const [rentalSnapshot, paymentSnapshot] = await Promise.all([
      rentalRef.get(),
      paymentRef.get(),
    ]);

    if (!rentalSnapshot.exists) {
      throw new HttpsError("not-found", "This rental could not be found.");
    }

    const rental = rentalSnapshot.data();

    if (!rental || rental.renterUid !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Only the renter can pay for this rental."
      );
    }

    if (rental.status !== "approved") {
      throw new HttpsError(
        "failed-precondition",
        "The rental must be approved before payment."
      );
    }

    if (
      typeof rental.propertyId !== "string" ||
      rental.propertyId.length === 0 ||
      typeof rental.ownerUid !== "string" ||
      rental.ownerUid.length === 0
    ) {
      throw new HttpsError(
        "failed-precondition",
        "The rental is missing trusted payment information."
      );
    }

    const amountInCents = readAmountInCents(rental.totalPrice);
    const existingPayment = readStoredPayment(paymentSnapshot.data());

    if (existingPayment?.status === "paid") {
      throw new HttpsError(
        "already-exists",
        "This rental has already been paid."
      );
    }

    const stripe = new Stripe(stripeSecretKey.value());
    let paymentIntent: Stripe.PaymentIntent | null = null;
    let attemptNumber = existingPayment?.attemptNumber ?? 0;

    if (existingPayment?.stripePaymentIntentId) {
      paymentIntent = await stripe.paymentIntents.retrieve(
        existingPayment.stripePaymentIntentId
      );

      if (paymentIntent.status === "succeeded") {
        await paymentRef.update({
          status: "paid",
          updatedAt: FieldValue.serverTimestamp(),
          paidAt: FieldValue.serverTimestamp(),
        });

        throw new HttpsError(
          "already-exists",
          "This rental has already been paid."
        );
      }

      if (
        paymentIntent.amount !== amountInCents ||
        paymentIntent.currency !== CURRENCY ||
        !isReusablePaymentIntent(paymentIntent)
      ) {
        paymentIntent = null;
      }
    }

    if (!paymentIntent) {
      attemptNumber += 1;
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountInCents,
          currency: CURRENCY,
          automatic_payment_methods: {enabled: true},
          metadata: {
            rentalId,
            renterUid: rental.renterUid,
            ownerUid: rental.ownerUid,
          },
        },
        {
          idempotencyKey: `rental-${rentalId}-attempt-${attemptNumber}`,
        }
      );
    }

    if (!paymentIntent.client_secret) {
      throw new HttpsError(
        "internal",
        "Stripe did not return a payment secret."
      );
    }

    await db.runTransaction(async (transaction) => {
      const [latestRentalSnapshot, latestPaymentSnapshot] = await Promise.all([
        transaction.get(rentalRef),
        transaction.get(paymentRef),
      ]);
      const latestRental = latestRentalSnapshot.data();
      const latestPayment = readStoredPayment(latestPaymentSnapshot.data());

      if (
        !latestRentalSnapshot.exists ||
        !latestRental ||
        latestRental.renterUid !== request.auth?.uid ||
        latestRental.status !== "approved"
      ) {
        throw new HttpsError(
          "failed-precondition",
          "The rental is no longer available for payment."
        );
      }

      if (latestPayment?.status === "paid") {
        throw new HttpsError(
          "already-exists",
          "This rental has already been paid."
        );
      }

      const now = FieldValue.serverTimestamp();

      transaction.set(paymentRef, {
        rentalId,
        propertyId: rental.propertyId,
        renterUid: rental.renterUid,
        ownerUid: rental.ownerUid,
        amountInCents,
        currency: CURRENCY,
        provider: "stripe",
        stripePaymentIntentId: paymentIntent.id,
        attemptNumber,
        status: "processing",
        createdAt: latestPaymentSnapshot.exists ?
          latestPaymentSnapshot.get("createdAt") :
          now,
        updatedAt: now,
        paidAt: null,
      });
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentStatus: "processing" as StoredPaymentStatus,
    };
  }
);

export const cancelPaymentAttempt = onCall(
  {invoker: "public", secrets: [stripeSecretKey]},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to cancel a payment attempt."
      );
    }

    const rentalId = requireRentalId(request.data?.rentalId);
    const db = getFirestore();
    const paymentRef = db.collection(PAYMENTS_COLLECTION).doc(rentalId);
    const paymentSnapshot = await paymentRef.get();

    if (!paymentSnapshot.exists) {
      return {paymentStatus: "unpaid" as StoredPaymentStatus};
    }

    const payment = readStoredPayment(paymentSnapshot.data());

    if (!payment || payment.renterUid !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Only the renter can cancel this payment attempt."
      );
    }

    if (payment.status === "paid") {
      throw new HttpsError(
        "failed-precondition",
        "A completed payment cannot be cancelled here."
      );
    }

    const stripe = new Stripe(stripeSecretKey.value());
    const paymentIntent = await stripe.paymentIntents.retrieve(
      payment.stripePaymentIntentId
    );

    if (paymentIntent.status === "succeeded") {
      await paymentRef.update({
        status: "paid",
        updatedAt: FieldValue.serverTimestamp(),
        paidAt: FieldValue.serverTimestamp(),
      });

      throw new HttpsError(
        "failed-precondition",
        "This payment has already completed."
      );
    }

    if (paymentIntent.status !== "canceled") {
      await stripe.paymentIntents.cancel(paymentIntent.id);
    }

    await paymentRef.update({
      status: "unpaid",
      updatedAt: FieldValue.serverTimestamp(),
      paidAt: null,
    });

    return {paymentStatus: "unpaid" as StoredPaymentStatus};
  }
);

export const stripePaymentWebhook = onRequest(
  {
    invoker: "public",
    secrets: [stripeSecretKey, stripeWebhookSecret],
  },
  async (request, response) => {
    const signatureHeader = request.headers["stripe-signature"];
    const signature = Array.isArray(signatureHeader) ?
      signatureHeader[0] :
      signatureHeader;

    if (!signature) {
      response.status(400).send("Missing Stripe signature.");
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value());
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        stripeWebhookSecret.value()
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid event.";
      response.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    if (event.type === "payment_intent.succeeded") {
      await markPaymentFromWebhook(paymentIntent, "paid");
    } else if (event.type === "payment_intent.processing") {
      await markPaymentFromWebhook(paymentIntent, "processing");
    } else if (event.type === "payment_intent.payment_failed") {
      if (paymentIntent.status !== "canceled") {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      }
      await markPaymentFromWebhook(paymentIntent, "unpaid");
    } else if (event.type === "payment_intent.canceled") {
      await markPaymentFromWebhook(paymentIntent, "unpaid");
    }

    response.sendStatus(200);
  }
);
