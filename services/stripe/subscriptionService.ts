import {doc, onSnapshot, type Unsubscribe} from "firebase/firestore";
import {httpsCallable} from "firebase/functions";

import {db, functions} from "../firebase/firebaseApp";
import type {
  BillingPortalSessionResult,
  CreateSubscriptionResult,
  Entitlement,
  EntitlementStatus,
  SubscriptionInterval,
  SubscriptionPlansResult,
} from "../../types/subscription/subscriptionTypes";

const ENTITLEMENT_STATUSES = new Set<EntitlementStatus>([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

const createSubscriptionCallable = httpsCallable<
  {interval: SubscriptionInterval},
  CreateSubscriptionResult
>(functions, "createSubscription");

const createBillingPortalSessionCallable = httpsCallable<
  Record<string, never>,
  BillingPortalSessionResult
>(functions, "createBillingPortalSession");

const getSubscriptionPlansCallable = httpsCallable<
  Record<string, never>,
  SubscriptionPlansResult
>(functions, "getSubscriptionPlans");

function toDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as {toDate?: unknown}).toDate === "function"
  ) {
    return (value as {toDate: () => Date}).toDate();
  }

  return null;
}

function readEntitlement(data: Record<string, unknown>): Entitlement | null {
  const interval = data.interval;
  const providerStatus = data.providerStatus;

  if (
    data.tier !== "pro" ||
    (interval !== "monthly" && interval !== "yearly") ||
    typeof data.active !== "boolean" ||
    data.provider !== "stripe" ||
    typeof providerStatus !== "string" ||
    !ENTITLEMENT_STATUSES.has(providerStatus as EntitlementStatus)
  ) {
    return null;
  }

  return {
    tier: "pro",
    active: data.active,
    provider: "stripe",
    interval,
    providerStatus: providerStatus as EntitlementStatus,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
    currentPeriodEnd: toDate(data.currentPeriodEnd),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createProSubscription(
  interval: SubscriptionInterval
): Promise<CreateSubscriptionResult> {
  const result = await createSubscriptionCallable({interval});
  return result.data;
}

export async function createBillingPortalSession(): Promise<string> {
  const result = await createBillingPortalSessionCallable({});
  return result.data.url;
}

export async function getSubscriptionPlans() {
  const result = await getSubscriptionPlansCallable({});
  return result.data.plans;
}

export function subscribeToEntitlement(
  uid: string,
  onValue: (entitlement: Entitlement | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, "entitlements", uid),
    (snapshot) => {
      onValue(snapshot.exists() ? readEntitlement(snapshot.data()) : null);
    },
    (error) => onError(error)
  );
}
