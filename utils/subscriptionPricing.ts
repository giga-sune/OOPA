export interface SubscriptionPriceLike {
  amount: number;
  currency: string;
}

export function formatSubscriptionPrice(plan: SubscriptionPriceLike): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: plan.currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(plan.amount / 100);
}

export function calculateYearlySavings(
  monthly: SubscriptionPriceLike | undefined,
  yearly: SubscriptionPriceLike | undefined
): {amount: number; percent: number} | null {
  if (!monthly || !yearly || monthly.currency !== yearly.currency) {
    return null;
  }

  const annualMonthlyCost = monthly.amount * 12;
  const amount = annualMonthlyCost - yearly.amount;

  if (amount <= 0) {
    return null;
  }

  return {
    amount,
    percent: Math.round((amount / annualMonthlyCost) * 100),
  };
}
