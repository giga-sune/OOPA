/* eslint-disable @typescript-eslint/no-var-requires, max-len, require-jsdoc */
const assert = require("node:assert/strict");
const test = require("node:test");

const {getApps, initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {approveRentalRequestForUser} = require("../lib/rentals.js");

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

if (hasEmulator && getApps().length === 0) {
  initializeApp({projectId: "oopa-rental-guardrails-test"});
}

function rentalData(propertyId, renterUid, overrides = {}) {
  return {
    propertyId,
    renterUid,
    ownerUid: "owner-user",
    status: "pending",
    startDate: Timestamp.fromDate(new Date("2026-08-10T00:00:00.000Z")),
    endDate: Timestamp.fromDate(new Date("2026-08-15T00:00:00.000Z")),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

test("conflicting approval makes no writes", {skip: !hasEmulator}, async () => {
  const db = getFirestore();
  const suffix = `${Date.now()}-conflict`;
  const propertyId = `property-${suffix}`;
  const targetRef = db.collection("rentals").doc(`target-${suffix}`);
  const approvedRef = db.collection("rentals").doc(`approved-${suffix}`);

  await Promise.all([
    targetRef.set(rentalData(propertyId, "renter-one")),
    approvedRef.set(rentalData(propertyId, "renter-two", {status: "approved"})),
  ]);

  await assert.rejects(
    approveRentalRequestForUser("owner-user", targetRef.id, db),
    (error) => error.code === "failed-precondition" &&
      error.message === "These dates are no longer available."
  );
  assert.equal((await targetRef.get()).get("status"), "pending");
});

test("concurrent overlapping approvals produce one approved and one rejected", {skip: !hasEmulator}, async () => {
  const db = getFirestore();
  const suffix = `${Date.now()}-concurrent`;
  const propertyId = `property-${suffix}`;
  const firstRef = db.collection("rentals").doc(`first-${suffix}`);
  const secondRef = db.collection("rentals").doc(`second-${suffix}`);

  await Promise.all([
    firstRef.set(rentalData(propertyId, "renter-one")),
    secondRef.set(rentalData(propertyId, "renter-two")),
  ]);

  const results = await Promise.allSettled([
    approveRentalRequestForUser("owner-user", firstRef.id, db),
    approveRentalRequestForUser("owner-user", secondRef.id, db),
  ]);
  const statuses = [
    (await firstRef.get()).get("status"),
    (await secondRef.get()).get("status"),
  ].sort();

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.deepEqual(statuses, ["approved", "rejected"]);
});
