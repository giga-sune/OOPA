/* eslint-disable @typescript-eslint/no-var-requires, max-len */
const assert = require("node:assert/strict");
const test = require("node:test");

const {billingTestHelpers} = require("../lib/billing.js");

test("subscription intervals accept only trusted server choices", () => {
  assert.equal(billingTestHelpers.requireInterval("monthly"), "monthly");
  assert.equal(billingTestHelpers.requireInterval("yearly"), "yearly");
  for (const value of ["price_attacker", "weekly", "", null, undefined]) {
    assert.throws(
      () => billingTestHelpers.requireInterval(value),
      (error) => error.code === "invalid-argument"
    );
  }
});

test("only active and trialing Stripe states grant Pro access", () => {
  for (const status of ["active", "trialing"]) {
    assert.equal(billingTestHelpers.hasProAccess(status), true);
  }
  for (const status of [
    "past_due",
    "unpaid",
    "incomplete",
    "incomplete_expired",
    "canceled",
    "paused",
  ]) {
    assert.equal(billingTestHelpers.hasProAccess(status), false);
  }
});

test("duplicate prevention blocks incomplete and billable subscriptions", () => {
  for (const status of ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]) {
    assert.equal(billingTestHelpers.isBlockingSubscriptionStatus(status), true);
  }
  assert.equal(billingTestHelpers.isBlockingSubscriptionStatus("canceled"), false);
  assert.equal(
    billingTestHelpers.isBlockingSubscriptionStatus("incomplete_expired"),
    false
  );
});

test("plan catalog accepts only the configured active recurring price", () => {
  const price = {
    id: "price_monthly",
    product: "prod_oopa",
    active: true,
    type: "recurring",
    recurring: {interval: "month"},
    unit_amount: 1499,
    currency: "CAD",
  };

  assert.deepEqual(
    billingTestHelpers.readTrustedPlan(
      "monthly",
      "price_monthly",
      "prod_oopa",
      price
    ),
    {interval: "monthly", amount: 1499, currency: "cad"}
  );

  for (const override of [
    {id: "price_attacker"},
    {product: "prod_attacker"},
    {active: false},
    {type: "one_time"},
    {recurring: {interval: "week"}},
    {unit_amount: null},
    {currency: "usd"},
  ]) {
    assert.throws(
      () => billingTestHelpers.readTrustedPlan(
        "monthly",
        "price_monthly",
        "prod_oopa",
        {...price, ...override}
      ),
      (error) => error.code === "failed-precondition"
    );
  }
});
