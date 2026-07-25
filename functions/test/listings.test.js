/* eslint-disable @typescript-eslint/no-var-requires, max-len, require-jsdoc */
const assert = require("node:assert/strict");
const test = require("node:test");

const {listingTestHelpers} = require("../lib/listings.js");

function validListing() {
  return {
    images: ["https://example.com/camera.jpg"],
    title: " Camera kit ",
    description: "A complete camera kit",
    brand: "Canon",
    condition: "Good",
    priceType: "Fixed",
    price: 50,
    ratePeriod: "week",
    location: {
      address: "Toronto, Ontario",
      latitude: 43.65,
      longitude: -79.38,
    },
  };
}

test("listing validation normalizes valid data and ignores owner spoofing", () => {
  const listing = listingTestHelpers.requireListingInput({
    ...validListing(),
    ownerUid: "attacker-controlled",
    ownerEmail: "attacker@example.com",
  });
  assert.equal(listing.title, "Camera kit");
  assert.equal(Object.hasOwn(listing, "ownerUid"), false);
  assert.equal(Object.hasOwn(listing, "ownerEmail"), false);
});

test("listing validation rejects invalid price, images, and coordinates", () => {
  assert.throws(
    () => listingTestHelpers.requireListingInput({...validListing(), price: 0}),
    (error) => error.code === "invalid-argument"
  );
  assert.throws(
    () => listingTestHelpers.requireListingInput({
      ...validListing(),
      images: ["http://example.com/insecure.jpg"],
    }),
    (error) => error.code === "invalid-argument"
  );
  assert.throws(
    () => listingTestHelpers.requireListingInput({
      ...validListing(),
      location: {...validListing().location, latitude: 91},
    }),
    (error) => error.code === "invalid-argument"
  );
});

test("listing helpers fail closed for malformed counts and entitlements", () => {
  assert.equal(listingTestHelpers.readActiveCount(3), 3);
  for (const value of [-1, 1.5, "3", null, undefined]) {
    assert.equal(listingTestHelpers.readActiveCount(value), 0);
  }
  assert.equal(listingTestHelpers.readIsPro(true), true);
  for (const value of [false, "true", 1, null]) {
    assert.equal(listingTestHelpers.readIsPro(value), false);
  }
});

test("search keywords are bounded and include normalized listing terms", () => {
  const input = listingTestHelpers.requireListingInput(validListing());
  const keywords = listingTestHelpers.buildSearchKeywords(input);
  assert.ok(keywords.includes("camera kit"));
  assert.ok(keywords.includes("canon"));
  assert.ok(keywords.includes("$50.00"));
  assert.ok(keywords.length <= 200);
});
