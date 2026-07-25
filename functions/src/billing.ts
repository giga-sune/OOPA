import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import {defineSecret, defineString} from "firebase-functions/params";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import Stripe from "stripe";

/* eslint-disable require-jsdoc */

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const monthlyPriceId = defineString("STRIPE_PRO_MONTHLY_PRICE_ID", {
  default: "price_1TwWFRFp7jFgclc5Pm37q4SB",
});
const yearlyPriceId = defineString("STRIPE_PRO_YEARLY_PRICE_ID", {
  default: "price_1TwWFSFp7jFgclc5ltt8CGsw",
});
const proProductId = defineString("STRIPE_PRO_PRODUCT_ID", {
  default: "prod_UvL358ArR9deYK",
});
const portalConfigurationId = defineString("STRIPE_PORTAL_CONFIGURATION_ID", {
  default: "bpc_1TwWFlFp7jFgclc5FANCxAAU",
});

const ENTITLEMENTS_COLLECTION = "entitlements";
const STRIPE_CUSTOMERS_COLLECTION = "stripeCustomers";
const STRIPE_CUSTOMER_LINKS_COLLECTION = "stripeCustomerLinks";
const STRIPE_EVENTS_COLLECTION = "stripeEvents";
const STRIPE_API_VERSION = "2026-06-24.dahlia";

export type SubscriptionInterval = "monthly" | "yearly";

export interface CreateSubscriptionResult {
  subscriptionId: string;
  clientSecret: string;
  customerId: string;
  customerEphemeralKeySecret: string;
}

export interface SubscriptionPlan {
  interval: SubscriptionInterval;
  amount: number;
  currency: string;
}

interface StoredStripeCustomer {
  customerId?: string;
  subscriptionId?: string;
  subscriptionAttempt?: number;
}

function requireInterval(value: unknown): SubscriptionInterval {
  if (value !== "monthly" && value !== "yearly") {
    throw new HttpsError(
      "invalid-argument",
      "Subscription interval must be monthly or yearly."
    );
  }

  return value;
}

function configuredPriceIds(): Record<SubscriptionInterval, string> {
  return {
    monthly: monthlyPriceId.value(),
    yearly: yearlyPriceId.value(),
  };
}

function readTrustedPlan(
  interval: SubscriptionInterval,
  expectedPriceId: string,
  expectedProductId: string,
  price: Stripe.Price
): SubscriptionPlan {
  const expectedRecurringInterval = interval === "monthly" ? "month" : "year";
  const productId = typeof price.product === "string" ?
    price.product :
    price.product.id;

  if (
    price.id !== expectedPriceId ||
    productId !== expectedProductId ||
    !price.active ||
    price.type !== "recurring" ||
    price.recurring?.interval !== expectedRecurringInterval ||
    typeof price.unit_amount !== "number" ||
    !Number.isInteger(price.unit_amount) ||
    price.unit_amount <= 0 ||
    typeof price.currency !== "string" ||
    price.currency.toLowerCase() !== "cad"
  ) {
    throw new HttpsError(
      "failed-precondition",
      `The configured ${interval} Stripe price is invalid.`
    );
  }

  return {
    interval,
    amount: price.unit_amount,
    currency: price.currency.toLowerCase(),
  };
}

function customerIdFromValue(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (typeof customer === "string") {
    return customer;
  }

  return customer?.id ?? null;
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const details = invoice.parent?.subscription_details;
  const subscription = details?.subscription;

  if (typeof subscription === "string") {
    return subscription;
  }

  return subscription?.id ?? null;
}

function isBlockingSubscriptionStatus(
  status: Stripe.Subscription.Status
): boolean {
  return status !== "canceled" && status !== "incomplete_expired";
}

function hasProAccess(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

function rethrowSubscriptionCreationError(error: unknown): never {
  if (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.message.includes("head office address")
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Stripe Tax setup requires OOPA's head-office address."
    );
  }

  throw error;
}

function planFromSubscription(subscription: Stripe.Subscription): {
  interval: SubscriptionInterval;
  priceId: string;
  currentPeriodEnd: Timestamp;
} | null {
  const item = subscription.items.data[0];

  if (!item) {
    return null;
  }

  const prices = configuredPriceIds();
  const interval = item.price.id === prices.monthly ?
    "monthly" :
    item.price.id === prices.yearly ?
      "yearly" :
      null;

  if (!interval || item.price.product !== proProductId.value()) {
    return null;
  }

  return {
    interval,
    priceId: item.price.id,
    currentPeriodEnd: Timestamp.fromMillis(item.current_period_end * 1000),
  };
}

async function findOrCreateCustomer(
  stripe: Stripe,
  uid: string,
  email: string | undefined
): Promise<string> {
  const db = getFirestore();
  const customerRef = db.collection(STRIPE_CUSTOMERS_COLLECTION).doc(uid);
  const customerSnapshot = await customerRef.get();
  const stored = customerSnapshot.data() as StoredStripeCustomer | undefined;

  if (stored?.customerId) {
    const customer = await stripe.customers.retrieve(stored.customerId);

    if (!customer.deleted) {
      return customer.id;
    }
  }

  const customer = await stripe.customers.create(
    {
      email,
      metadata: {firebaseUid: uid},
    },
    {idempotencyKey: `oopa-customer-${uid}`}
  );
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(customerRef, {
    customerId: customer.id,
    createdAt: customerSnapshot.exists ?
      customerSnapshot.get("createdAt") :
      now,
    updatedAt: now,
  }, {merge: true});
  batch.set(
    db.collection(STRIPE_CUSTOMER_LINKS_COLLECTION).doc(customer.id),
    {uid, createdAt: now, updatedAt: now},
    {merge: true}
  );
  await batch.commit();

  return customer.id;
}

async function rejectDuplicateSubscription(
  stripe: Stripe,
  customerId: string
): Promise<void> {
  const prices = new Set(Object.values(configuredPriceIds()));
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  const duplicate = subscriptions.data.find((subscription) =>
    isBlockingSubscriptionStatus(subscription.status) &&
    subscription.items.data.some((item) => prices.has(item.price.id))
  );

  if (duplicate) {
    throw new HttpsError(
      "already-exists",
      "An OOPA Pro subscription already exists for this account."
    );
  }
}

async function reserveSubscriptionAttempt(uid: string): Promise<number> {
  const db = getFirestore();
  const customerRef = db.collection(STRIPE_CUSTOMERS_COLLECTION).doc(uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(customerRef);
    const current = snapshot.data()?.subscriptionAttempt;
    const next = typeof current === "number" ? current + 1 : 1;

    transaction.set(customerRef, {
      subscriptionAttempt: next,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});

    return next;
  });
}

export const createSubscription = onCall(
  {secrets: [stripeSecretKey]},
  async (request): Promise<CreateSubscriptionResult> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to subscribe to OOPA Pro."
      );
    }

    const interval = requireInterval(request.data?.interval);
    const uid = request.auth.uid;
    const email = typeof request.auth.token.email === "string" ?
      request.auth.token.email :
      undefined;
    const stripe = new Stripe(stripeSecretKey.value());
    const customerId = await findOrCreateCustomer(stripe, uid, email);

    await rejectDuplicateSubscription(stripe, customerId);

    const attempt = await reserveSubscriptionAttempt(uid);
    const priceId = configuredPriceIds()[interval];
    let subscription: Stripe.Subscription;

    try {
      subscription = await stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{price: priceId}],
          payment_behavior: "default_incomplete",
          payment_settings: {
            save_default_payment_method: "on_subscription",
          },
          billing_mode: {type: "flexible"},
          // MVP: Stripe Tax is intentionally disabled. Before production,
          // configure seller/customer tax locations and enable it deliberately.
          metadata: {
            firebaseUid: uid,
            tier: "pro",
            interval,
          },
          expand: ["latest_invoice.confirmation_secret"],
        },
        {idempotencyKey: `oopa-subscription-${uid}-${attempt}`}
      );
    } catch (error) {
      rethrowSubscriptionCreationError(error);
    }
    const invoice = typeof subscription.latest_invoice === "string" ?
      null :
      subscription.latest_invoice;
    const clientSecret = invoice?.confirmation_secret?.client_secret;

    if (!clientSecret) {
      throw new HttpsError(
        "internal",
        "Stripe did not return a subscription payment secret."
      );
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      {customer: customerId},
      {apiVersion: STRIPE_API_VERSION}
    );

    if (!ephemeralKey.secret) {
      throw new HttpsError(
        "internal",
        "Stripe did not return a customer session secret."
      );
    }

    await getFirestore()
      .collection(STRIPE_CUSTOMERS_COLLECTION)
      .doc(uid)
      .set({
        subscriptionId: subscription.id,
        priceId,
        updatedAt: FieldValue.serverTimestamp(),
      }, {merge: true});

    return {
      subscriptionId: subscription.id,
      clientSecret,
      customerId,
      customerEphemeralKeySecret: ephemeralKey.secret,
    };
  }
);

export const getSubscriptionPlans = onCall(
  {secrets: [stripeSecretKey]},
  async (request): Promise<{plans: SubscriptionPlan[]}> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to view OOPA Pro plans."
      );
    }

    const stripe = new Stripe(stripeSecretKey.value());
    const prices = configuredPriceIds();
    const [monthlyPrice, yearlyPrice] = await Promise.all([
      stripe.prices.retrieve(prices.monthly),
      stripe.prices.retrieve(prices.yearly),
    ]);
    const productId = proProductId.value();

    return {
      plans: [
        readTrustedPlan("monthly", prices.monthly, productId, monthlyPrice),
        readTrustedPlan("yearly", prices.yearly, productId, yearlyPrice),
      ],
    };
  }
);

export const createBillingPortalSession = onCall(
  {secrets: [stripeSecretKey]},
  async (request): Promise<{url: string}> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to manage billing."
      );
    }

    const customerSnapshot = await getFirestore()
      .collection(STRIPE_CUSTOMERS_COLLECTION)
      .doc(request.auth.uid)
      .get();
    const customerId = customerSnapshot.get("customerId");

    if (typeof customerId !== "string" || !customerId) {
      throw new HttpsError(
        "failed-precondition",
        "No Stripe billing account exists for this user."
      );
    }

    const stripe = new Stripe(stripeSecretKey.value());
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration: portalConfigurationId.value(),
      return_url: "oopa://subscription",
    });

    return {url: session.url};
  }
);

async function uidForSubscription(
  subscription: Stripe.Subscription
): Promise<string | null> {
  const customerId = customerIdFromValue(subscription.customer);

  if (!customerId) {
    return null;
  }

  const db = getFirestore();
  const linkSnapshot = await db
    .collection(STRIPE_CUSTOMER_LINKS_COLLECTION)
    .doc(customerId)
    .get();
  const linkedUid = linkSnapshot.get("uid");

  if (typeof linkedUid === "string" && linkedUid) {
    return linkedUid;
  }

  const metadataUid = subscription.metadata.firebaseUid;

  if (typeof metadataUid !== "string" || !metadataUid) {
    return null;
  }

  await db.collection(STRIPE_CUSTOMER_LINKS_COLLECTION).doc(customerId).set({
    uid: metadataUid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, {merge: true});

  return metadataUid;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  eventCreated: number
): Promise<void> {
  const plan = planFromSubscription(subscription);

  if (!plan) {
    return;
  }

  const uid = await uidForSubscription(subscription);
  const customerId = customerIdFromValue(subscription.customer);

  if (!uid || !customerId) {
    throw new Error("Unable to resolve the Firebase user for subscription.");
  }

  const db = getFirestore();
  const customerRef = db.collection(STRIPE_CUSTOMERS_COLLECTION).doc(uid);
  const entitlementRef = db.collection(ENTITLEMENTS_COLLECTION).doc(uid);

  await db.runTransaction(async (transaction) => {
    const customerSnapshot = await transaction.get(customerRef);
    const lastEventCreated = customerSnapshot.get("lastStripeEventCreated");

    if (
      typeof lastEventCreated === "number" &&
      lastEventCreated > eventCreated
    ) {
      return;
    }

    const now = FieldValue.serverTimestamp();

    transaction.set(entitlementRef, {
      tier: "pro",
      active: hasProAccess(subscription.status),
      provider: "stripe",
      interval: plan.interval,
      providerStatus: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: plan.currentPeriodEnd,
      updatedAt: now,
    }, {merge: true});
    transaction.set(customerRef, {
      customerId,
      subscriptionId: subscription.id,
      priceId: plan.priceId,
      lastStripeEventCreated: eventCreated,
      updatedAt: now,
    }, {merge: true});
  });
}

function isSubscriptionEvent(type: Stripe.Event.Type): boolean {
  return type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted" ||
    type === "invoice.paid" ||
    type === "invoice.payment_failed" ||
    type === "invoice.payment_action_required";
}

export async function handleSubscriptionWebhook(
  event: Stripe.Event,
  stripe: Stripe
): Promise<boolean> {
  if (!isSubscriptionEvent(event.type)) {
    return false;
  }

  const db = getFirestore();
  const eventRef = db.collection(STRIPE_EVENTS_COLLECTION).doc(event.id);
  const eventSnapshot = await eventRef.get();

  if (eventSnapshot.get("processed") === true) {
    return true;
  }

  let subscriptionId: string | null = null;

  if (event.type.startsWith("customer.subscription.")) {
    subscriptionId = (event.data.object as Stripe.Subscription).id;
  } else {
    subscriptionId = subscriptionIdFromInvoice(
      event.data.object as Stripe.Invoice
    );
  }

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(subscription, event.created);
  }

  await eventRef.set({
    type: event.type,
    stripeCreatedAt: Timestamp.fromMillis(event.created * 1000),
    processed: true,
    processedAt: FieldValue.serverTimestamp(),
  });

  return true;
}

export const billingTestHelpers = {
  requireInterval,
  isBlockingSubscriptionStatus,
  hasProAccess,
  readTrustedPlan,
};
