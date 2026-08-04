/* eslint-disable @typescript-eslint/no-var-requires, max-len, require-jsdoc */
const assert = require("node:assert/strict");
const test = require("node:test");

const {Timestamp} = require("firebase-admin/firestore");
const {rentalTestHelpers} = require("../lib/rentals.js");

function range(start, end) {
  return {
    startDate: Timestamp.fromDate(new Date(start)),
    endDate: Timestamp.fromDate(new Date(end)),
  };
}

function rental(id, status, start, end) {
  return {
    id,
    data: {
      status,
      ...range(start, end),
    },
  };
}

test("availability input accepts bounded IDs and valid ordered ISO dates", () => {
  const input = rentalTestHelpers.requireAvailabilityInput({
    propertyId: " property-one ",
    startDate: "2026-08-10T00:00:00.000Z",
    endDate: "2026-08-15T00:00:00.000Z",
  });

  assert.equal(input.propertyId, "property-one");
  assert.equal(input.startDate.toDate().toISOString(), "2026-08-10T00:00:00.000Z");
  assert.throws(
    () => rentalTestHelpers.requireAvailabilityInput({
      propertyId: "property-one",
      startDate: "invalid",
      endDate: "2026-08-15T00:00:00.000Z",
    }),
    (error) => error.code === "invalid-argument"
  );
  assert.throws(
    () => rentalTestHelpers.requireAvailabilityInput({
      propertyId: "property-one",
      startDate: "2026-08-15T00:00:00.000Z",
      endDate: "2026-08-15T00:00:00.000Z",
    }),
    (error) => error.code === "invalid-argument"
  );
});

test("inclusive overlap blocks the same boundary but permits the next day", () => {
  const booked = range(
    "2026-08-10T00:00:00.000Z",
    "2026-08-15T00:00:00.000Z"
  );

  assert.equal(rentalTestHelpers.datesOverlap(
    booked,
    range("2026-08-15T00:00:00.000Z", "2026-08-18T00:00:00.000Z")
  ), true);
  assert.equal(rentalTestHelpers.datesOverlap(
    booked,
    range("2026-08-16T00:00:00.000Z", "2026-08-18T00:00:00.000Z")
  ), false);
});

test("classification blocks approved and auto-rejects only overlapping pending rentals", () => {
  const requested = range(
    "2026-08-10T00:00:00.000Z",
    "2026-08-15T00:00:00.000Z"
  );
  const classification = rentalTestHelpers.classifyRentals([
    rental("approved", "approved", "2026-08-01T00:00:00.000Z", "2026-08-10T00:00:00.000Z"),
    rental("pending-overlap", "pending", "2026-08-12T00:00:00.000Z", "2026-08-20T00:00:00.000Z"),
    rental("pending-clear", "pending", "2026-08-16T00:00:00.000Z", "2026-08-20T00:00:00.000Z"),
    rental("rejected", "rejected", "2026-08-12T00:00:00.000Z", "2026-08-20T00:00:00.000Z"),
    rental("completed", "completed", "2026-08-12T00:00:00.000Z", "2026-08-20T00:00:00.000Z"),
    rental("cancelled", "cancelled", "2026-08-12T00:00:00.000Z", "2026-08-20T00:00:00.000Z"),
    rental("target", "pending", "2026-08-10T00:00:00.000Z", "2026-08-15T00:00:00.000Z"),
  ], "target", requested);

  assert.equal(classification.approvedConflict, true);
  assert.deepEqual(classification.overlappingPendingIds, ["pending-overlap"]);
});
