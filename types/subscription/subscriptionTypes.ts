export type SubscriptionInterval = "monthly" | "yearly";

export type EntitlementStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export type OopaCallableErrorCode =
  | "unauthenticated"
  | "invalid-argument"
  | "already-exists"
  | "failed-precondition"
  | "permission-denied"
  | "resource-exhausted"
  | "internal";

export interface CreateSubscriptionResult {
  subscriptionId: string;
  clientSecret: string;
  customerId: string;
  customerEphemeralKeySecret: string;
}

export interface BillingPortalSessionResult {
  url: string;
}

export interface SubscriptionPlan {
  interval: SubscriptionInterval;
  amount: number;
  currency: string;
}

export interface SubscriptionPlansResult {
  plans: SubscriptionPlan[];
}

export interface Entitlement {
  tier: "pro";
  active: boolean;
  provider: "stripe" | "apple" | "google";
  interval: SubscriptionInterval;
  providerStatus: EntitlementStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  updatedAt: Date | null;
}
