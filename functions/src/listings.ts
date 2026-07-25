import {
  FieldValue,
  getFirestore,
  type Transaction,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";

/* eslint-disable require-jsdoc */

const ENTITLEMENTS_COLLECTION = "entitlements";
const LISTING_STATS_COLLECTION = "listingStats";
const PROPERTIES_COLLECTION = "properties";
const FREE_LISTING_LIMIT = 3;

interface LocationInput {
  address: string;
  latitude: number;
  longitude: number;
}

interface CreateListingInput {
  images: string[];
  title: string;
  description: string;
  brand: string;
  condition: "Like new" | "Good" | "Used";
  priceType: "Fixed" | "Flexible";
  price: number;
  ratePeriod: "week" | "month";
  location: LocationInput;
}

export interface ListingAllowance {
  activeCount: number;
  limit: number | null;
  canCreate: boolean;
  isPro: boolean;
}

function requireString(
  value: unknown,
  field: string,
  maxLength: number
): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${field} is required and must be at most ${maxLength} characters.`
    );
  }

  return value.trim();
}

function requireImages(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) {
    throw new HttpsError(
      "invalid-argument",
      "A listing must contain between 1 and 8 images."
    );
  }

  const images = value.map((image) => requireString(image, "Image URL", 2048));

  if (images.some((image) => !/^https:\/\//i.test(image))) {
    throw new HttpsError(
      "invalid-argument",
      "Listing images must use secure HTTPS URLs."
    );
  }

  return images;
}

function requireLocation(value: unknown): LocationInput {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Listing location is required.");
  }

  const location = value as Partial<LocationInput>;
  const address = requireString(location.address, "Location address", 500);

  if (
    typeof location.latitude !== "number" ||
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    typeof location.longitude !== "number" ||
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new HttpsError(
      "invalid-argument",
      "Listing coordinates are invalid."
    );
  }

  return {
    address,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}

function requireListingInput(value: unknown): CreateListingInput {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", "Listing data is required.");
  }

  const data = value as Record<string, unknown>;
  const condition = data.condition;
  const priceType = data.priceType;
  const ratePeriod = data.ratePeriod;
  const price = data.price;

  if (!(["Like new", "Good", "Used"] as unknown[]).includes(condition)) {
    throw new HttpsError("invalid-argument", "Listing condition is invalid.");
  }

  if (!(["Fixed", "Flexible"] as unknown[]).includes(priceType)) {
    throw new HttpsError("invalid-argument", "Listing price type is invalid.");
  }

  if (!(["week", "month"] as unknown[]).includes(ratePeriod)) {
    throw new HttpsError("invalid-argument", "Listing rate period is invalid.");
  }

  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0 ||
    price > 1000000
  ) {
    throw new HttpsError("invalid-argument", "Listing price is invalid.");
  }

  return {
    images: requireImages(data.images),
    title: requireString(data.title, "Title", 200),
    description: requireString(data.description, "Description", 5000),
    brand: requireString(data.brand, "Brand", 100),
    condition: condition as CreateListingInput["condition"],
    priceType: priceType as CreateListingInput["priceType"],
    price,
    ratePeriod: ratePeriod as CreateListingInput["ratePeriod"],
    location: requireLocation(data.location),
  };
}

function appendSearchValue(values: Set<string>, value: string): void {
  const normalized = value.toLowerCase().trim().replace(/\s+/g, " ");

  if (!normalized) {
    return;
  }

  values.add(normalized);
  normalized.split(/[^a-z0-9]+/i).filter(Boolean).forEach((token) => {
    values.add(token);
  });
}

function buildSearchKeywords(input: CreateListingInput): string[] {
  const values = new Set<string>();

  appendSearchValue(values, input.title);
  appendSearchValue(values, input.description);
  appendSearchValue(values, input.brand);
  appendSearchValue(values, input.condition);
  appendSearchValue(values, input.priceType);
  appendSearchValue(values, input.ratePeriod);
  appendSearchValue(values, input.location.address);
  appendSearchValue(values, String(input.price));
  appendSearchValue(values, `$${input.price.toFixed(2)}`);

  return [...values].slice(0, 200);
}

function readActiveCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ?
    value :
    0;
}

function readIsPro(value: unknown): boolean {
  return value === true;
}

async function allowanceForUser(uid: string): Promise<ListingAllowance> {
  const db = getFirestore();
  const [statsSnapshot, entitlementSnapshot] = await Promise.all([
    db.collection(LISTING_STATS_COLLECTION).doc(uid).get(),
    db.collection(ENTITLEMENTS_COLLECTION).doc(uid).get(),
  ]);
  const activeCount = readActiveCount(statsSnapshot.get("activeCount"));
  const isPro = readIsPro(entitlementSnapshot.get("active"));

  return {
    activeCount,
    limit: isPro ? null : FREE_LISTING_LIMIT,
    canCreate: isPro || activeCount < FREE_LISTING_LIMIT,
    isPro,
  };
}

export const getListingAllowance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to check your listing allowance."
    );
  }

  return allowanceForUser(request.auth.uid);
});

async function readTrustedOwnerProfile(
  transaction: Transaction,
  uid: string
): Promise<{
  displayName: string;
  photoURL: string | null;
}> {
  const profileSnapshot = await transaction.get(
    getFirestore().collection("users").doc(uid)
  );
  const profile = profileSnapshot.data();

  return {
    displayName: typeof profile?.userName === "string" && profile.userName ?
      profile.userName :
      "OOPA User",
    photoURL: typeof profile?.profilePictureUrl === "string" ?
      profile.profilePictureUrl :
      typeof profile?.photoURL === "string" ?
        profile.photoURL :
        null,
  };
}

export const createListing = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to create a listing."
    );
  }

  const input = requireListingInput(request.data?.listing);
  const uid = request.auth.uid;
  const db = getFirestore();
  const propertyRef = db.collection(PROPERTIES_COLLECTION).doc();
  const statsRef = db.collection(LISTING_STATS_COLLECTION).doc(uid);
  const entitlementRef = db.collection(ENTITLEMENTS_COLLECTION).doc(uid);

  await db.runTransaction(async (transaction) => {
    const [statsSnapshot, entitlementSnapshot, ownerProfile] =
      await Promise.all([
        transaction.get(statsRef),
        transaction.get(entitlementRef),
        readTrustedOwnerProfile(transaction, uid),
      ]);
    const activeCount = readActiveCount(statsSnapshot.get("activeCount"));
    const isPro = readIsPro(entitlementSnapshot.get("active"));

    if (!isPro && activeCount >= FREE_LISTING_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        "Free accounts are limited to three active listings."
      );
    }

    const now = FieldValue.serverTimestamp();

    transaction.create(propertyRef, {
      ...input,
      ownerUid: uid,
      ownerDisplayName: ownerProfile.displayName,
      ownerPhotoURL: ownerProfile.photoURL,
      searchKeywords: buildSearchKeywords(input),
      createdAt: now,
      updatedAt: now,
    });
    transaction.set(statsRef, {
      activeCount: activeCount + 1,
      updatedAt: now,
    }, {merge: true});
  });

  return {propertyId: propertyRef.id};
});

export const updateListing = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to update a listing."
    );
  }

  const propertyId = requireString(
    request.data?.propertyId,
    "Property ID",
    1500
  );
  const input = requireListingInput(request.data?.listing);
  const propertyRef = getFirestore()
    .collection(PROPERTIES_COLLECTION)
    .doc(propertyId);
  const propertySnapshot = await propertyRef.get();

  if (!propertySnapshot.exists) {
    throw new HttpsError("not-found", "This listing could not be found.");
  }

  if (propertySnapshot.get("ownerUid") !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Only the listing owner can update this listing."
    );
  }

  await propertyRef.update({
    ...input,
    searchKeywords: buildSearchKeywords(input),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {updated: true};
});

export const deleteListing = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to delete a listing."
    );
  }

  const propertyId = requireString(
    request.data?.propertyId,
    "Property ID",
    1500
  );
  const uid = request.auth.uid;
  const db = getFirestore();
  const propertyRef = db.collection(PROPERTIES_COLLECTION).doc(propertyId);
  const statsRef = db.collection(LISTING_STATS_COLLECTION).doc(uid);

  await db.runTransaction(async (transaction) => {
    const [propertySnapshot, statsSnapshot] = await Promise.all([
      transaction.get(propertyRef),
      transaction.get(statsRef),
    ]);

    if (!propertySnapshot.exists) {
      return;
    }

    if (propertySnapshot.get("ownerUid") !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Only the listing owner can delete this listing."
      );
    }

    const activeCount = readActiveCount(statsSnapshot.get("activeCount"));
    const now = FieldValue.serverTimestamp();

    transaction.delete(propertyRef);
    if (activeCount <= 1) {
      transaction.delete(statsRef);
    } else {
      transaction.set(statsRef, {
        activeCount: activeCount - 1,
        updatedAt: now,
      }, {merge: true});
    }
  });

  return {deleted: true};
});

export const listingTestHelpers = {
  requireListingInput,
  buildSearchKeywords,
  readActiveCount,
  readIsPro,
};
