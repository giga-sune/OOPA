import {getApps, initializeApp} from "firebase-admin/app";
import {
  type DocumentData,
  FieldValue,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import {defineSecret} from "firebase-functions/params";
import {logger} from "firebase-functions";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import {HttpsError, onCall, onRequest} from "firebase-functions/v2/https";
import Stripe from "stripe";

if (getApps().length === 0) {
  initializeApp();
}

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const RENTALS_COLLECTION = "rentals";
const PAYMENTS_COLLECTION = "payments";
const CHATS_COLLECTION = "chats";
const NOTIFICATIONS_COLLECTION = "notifications";
const PUSH_TOKENS_COLLECTION = "pushTokens";
const CURRENCY = "cad";

type RentalEventType =
  | "new_request"
  | "request_approved"
  | "request_rejected";

interface PreparedRentalChat {
  rentalId: string;
  title: string;
  recipientUid: string;
  recipientName: string;
}

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

/* eslint-disable valid-jsdoc */
/** Returns a trimmed required string field or null. */
function readRequiredString(
  data: DocumentData,
  field: string
): string | null {
  const value = data[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Builds trusted chat metadata from a rental document. */
function buildChatData(
  rentalId: string,
  rental: DocumentData,
  existing?: DocumentData
) {
  const renterUid = readRequiredString(rental, "renterUid") ?? "";
  const ownerUid = readRequiredString(rental, "ownerUid") ?? "";
  const existingLastMessage = existing?.lastMessage;
  const lastMessage = typeof existingLastMessage === "string" &&
    existingLastMessage.length >= 1 &&
    existingLastMessage.length <= 2000 ?
    existingLastMessage :
    "Rental request approved. You can now message each other.";
  const lastMessageTimestamp = existing?.lastMessageTimestamp instanceof
    Timestamp ?
    existing.lastMessageTimestamp :
    FieldValue.serverTimestamp();
  const unreadBy = Array.isArray(existing?.unreadBy) ?
    [...new Set(existing.unreadBy.filter(
      (uid): uid is string => uid === renterUid || uid === ownerUid
    ))].slice(0, 2) :
    [renterUid];

  return {
    rentalId,
    propertyId: readRequiredString(rental, "propertyId") ?? "",
    propertyTitle: readRequiredString(rental, "propertyTitle") ?? "Rental",
    propertyImageUrl: typeof rental.propertyImageUrl === "string" ?
      rental.propertyImageUrl :
      null,
    renterUid,
    renterDisplayName:
      readRequiredString(rental, "renterDisplayName") ?? "Borrower",
    ownerUid,
    ownerDisplayName:
      readRequiredString(rental, "ownerDisplayName") ?? "Lender",
    lastMessage,
    lastMessageTimestamp,
    unreadBy,
  };
}

/** Creates a rental chat once without overwriting an existing channel. */
async function ensureRentalChat(
  rentalId: string,
  rental: DocumentData
): Promise<void> {
  const db = getFirestore();
  const chatRef = db.collection(CHATS_COLLECTION).doc(rentalId);

  await db.runTransaction(async (transaction) => {
    const chatSnapshot = await transaction.get(chatRef);

    transaction.set(
      chatRef,
      buildChatData(rentalId, rental, chatSnapshot.data())
    );
  });
}

/** Writes an idempotent in-app rental notification. */
async function writeRentalNotification(
  rentalId: string,
  type: RentalEventType,
  recipientUid: string,
  categoryLabel: string,
  bodyText: string,
  propertyImageUrl: string | null
): Promise<void> {
  await getFirestore()
    .collection(NOTIFICATIONS_COLLECTION)
    .doc(`${rentalId}_${type}`)
    .set({
      rentalId,
      recipientUid,
      type,
      categoryLabel,
      bodyText,
      propertyImageUrl,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    });
}

/** Sends a native push using a server-readable private token. */
async function sendRentalPush(
  recipientUid: string,
  title: string,
  body: string,
  rentalId: string
): Promise<void> {
  const tokenSnapshot = await getFirestore()
    .collection(PUSH_TOKENS_COLLECTION)
    .doc(recipientUid)
    .get();
  const token = tokenSnapshot.data()?.token;

  if (typeof token !== "string" || !token) {
    return;
  }

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      to: token,
      sound: "default",
      title,
      body,
      data: {rentalId},
    }),
  });

  if (!response.ok) {
    throw new Error(`Expo push request failed with status ${response.status}.`);
  }
}

/** Persists and delivers a rental lifecycle notification. */
async function deliverRentalEvent(
  rentalId: string,
  rental: DocumentData,
  type: RentalEventType
): Promise<void> {
  const propertyTitle =
    readRequiredString(rental, "propertyTitle") ?? "Rental";
  const propertyImageUrl = typeof rental.propertyImageUrl === "string" ?
    rental.propertyImageUrl :
    null;
  const isNewRequest = type === "new_request";
  const recipientUid = readRequiredString(
    rental,
    isNewRequest ? "ownerUid" : "renterUid"
  );

  if (!recipientUid) {
    logger.error("Rental event has no recipient", {rentalId, type});
    return;
  }

  const renterName =
    readRequiredString(rental, "renterDisplayName") ?? "A borrower";
  const notification = isNewRequest ?
    {
      category: "New Request",
      body: `${renterName} requested to borrow your "${propertyTitle}".`,
      pushTitle: "New Rental Request",
    } :
    type === "request_approved" ?
      {
        category: "Rental Approved",
        body: `Your request to borrow "${propertyTitle}" was approved.`,
        pushTitle: "Rental Approved",
      } :
      {
        category: "Rental Declined",
        body: `Your request to borrow "${propertyTitle}" was declined.`,
        pushTitle: "Rental Request Update",
      };

  await writeRentalNotification(
    rentalId,
    type,
    recipientUid,
    notification.category,
    notification.body,
    propertyImageUrl
  );

  try {
    await sendRentalPush(
      recipientUid,
      notification.pushTitle,
      notification.body,
      rentalId
    );
  } catch (error) {
    logger.error("Failed to deliver rental push", {rentalId, type, error});
  }
}

export const notifyRentalCreated = onDocumentCreated(
  `${RENTALS_COLLECTION}/{rentalId}`,
  async (event) => {
    const rental = event.data?.data();

    if (rental) {
      await deliverRentalEvent(event.params.rentalId, rental, "new_request");
    }
  }
);

export const notifyRentalDecision = onDocumentUpdated(
  `${RENTALS_COLLECTION}/{rentalId}`,
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after || before.status === after.status) {
      return;
    }

    const rentalId = event.params.rentalId;

    if (after.status === "approved") {
      await ensureRentalChat(rentalId, after);
      await deliverRentalEvent(rentalId, after, "request_approved");
    } else if (after.status === "rejected") {
      await deliverRentalEvent(rentalId, after, "request_rejected");
    }
  }
);

export const prepareRentalChat = onCall(
  {invoker: "public"},
  async (request): Promise<PreparedRentalChat> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in to chat.");
    }

    const rentalId = requireRentalId(request.data?.rentalId);
    const rentalSnapshot = await getFirestore()
      .collection(RENTALS_COLLECTION)
      .doc(rentalId)
      .get();
    const rental = rentalSnapshot.data();

    if (!rentalSnapshot.exists || !rental) {
      throw new HttpsError("not-found", "This rental could not be found.");
    }

    const renterUid = readRequiredString(rental, "renterUid");
    const ownerUid = readRequiredString(rental, "ownerUid");

    if (!renterUid || !ownerUid) {
      throw new HttpsError(
        "failed-precondition",
        "This rental is missing participant information."
      );
    }

    if (request.auth.uid !== renterUid && request.auth.uid !== ownerUid) {
      throw new HttpsError(
        "permission-denied",
        "Only rental participants can open this chat."
      );
    }

    if (rental.status !== "approved") {
      throw new HttpsError(
        "failed-precondition",
        "Chat becomes available after approval."
      );
    }

    await ensureRentalChat(rentalId, rental);

    const isOwner = request.auth.uid === ownerUid;
    return {
      rentalId,
      title: readRequiredString(rental, "propertyTitle") ?? "Rental",
      recipientUid: isOwner ? renterUid : ownerUid,
      recipientName: isOwner ?
        readRequiredString(rental, "renterDisplayName") ?? "Borrower" :
        readRequiredString(rental, "ownerDisplayName") ?? "Lender",
    };
  }
);
/* eslint-enable valid-jsdoc */

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
  {secrets: [stripeSecretKey]},
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
  {secrets: [stripeSecretKey]},
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
  {secrets: [stripeSecretKey, stripeWebhookSecret]},
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
