import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateYearlySavings,
  formatSubscriptionPrice,
} from "../utils/subscriptionPricing.ts";

test("subscription prices format Stripe minor units as CAD", () => {
  assert.equal(
    formatSubscriptionPrice({amount: 1499, currency: "cad"}),
    "$14.99"
  );
});

test("yearly savings compare twelve monthly payments", () => {
  assert.deepEqual(
    calculateYearlySavings(
      {amount: 1499, currency: "cad"},
      {amount: 14999, currency: "cad"}
    ),
    {amount: 2989, percent: 17}
  );
  assert.equal(
    calculateYearlySavings(
      {amount: 1499, currency: "cad"},
      {amount: 17988, currency: "cad"}
    ),
    null
  );
});
