import {
  type DocumentData,
  FieldValue,
  type Firestore,
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";

/* eslint-disable require-jsdoc */

const PAYMENTS_COLLECTION = "payments";
const PROPERTIES_COLLECTION = "properties";
const RENTALS_COLLECTION = "rentals";
const UNAVAILABLE_MESSAGE = "These dates are no longer available.";

interface RentalDateRange {
  startDate: Timestamp;
  endDate: Timestamp;
}

interface AvailabilityInput extends RentalDateRange {
  propertyId: string;
}

interface RentalDocumentLike {
  id: string;
  data: DocumentData;
}

interface RentalClassification {
  approvedConflict: boolean;
  overlappingPendingIds: string[];
}

export interface RentalApprovalResult {
  autoRejectedCount: number;
}

function requireBoundedString(
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

function requireTimestamp(value: unknown, field: string): Timestamp {
  if (typeof value !== "string" || value.length > 64) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }

  return Timestamp.fromDate(parsedDate);
}

function requireAvailabilityInput(value: unknown): AvailabilityInput {
  if (!value || typeof value !== "object") {
    throw new HttpsError(
      "invalid-argument",
      "Property and rental dates are required."
    );
  }

  const data = value as Record<string, unknown>;
  const startDate = requireTimestamp(data.startDate, "Start date");
  const endDate = requireTimestamp(data.endDate, "End date");

  if (endDate.toMillis() <= startDate.toMillis()) {
    throw new HttpsError(
      "invalid-argument",
      "End date must be after the start date."
    );
  }

  return {
    propertyId: requireBoundedString(data.propertyId, "Property ID", 1500),
    startDate,
    endDate,
  };
}

function requireRentalId(value: unknown): string {
  return requireBoundedString(value, "Rental ID", 1500);
}

function readRentalDateRange(data: DocumentData): RentalDateRange | null {
  if (!(data.startDate instanceof Timestamp) ||
      !(data.endDate instanceof Timestamp)) {
    return null;
  }

  return {
    startDate: data.startDate,
    endDate: data.endDate,
  };
}

function datesOverlap(
  first: RentalDateRange,
  second: RentalDateRange
): boolean {
  return first.startDate.toMillis() <= second.endDate.toMillis() &&
    first.endDate.toMillis() >= second.startDate.toMillis();
}

function classifyRentals(
  rentals: RentalDocumentLike[],
  targetRentalId: string | null,
  requestedDates: RentalDateRange
): RentalClassification {
  let approvedConflict = false;
  const overlappingPendingIds: string[] = [];

  rentals.forEach((rental) => {
    if (rental.id === targetRentalId) {
      return;
    }

    const dates = readRentalDateRange(rental.data);

    if (!dates) {
      if (rental.data.status === "approved") {
        approvedConflict = true;
      }
      return;
    }

    if (!datesOverlap(dates, requestedDates)) {
      return;
    }

    if (rental.data.status === "approved") {
      approvedConflict = true;
    } else if (rental.data.status === "pending") {
      overlappingPendingIds.push(rental.id);
    }
  });

  return {approvedConflict, overlappingPendingIds};
}

export async function checkRentalAvailabilityForInput(
  input: AvailabilityInput,
  database: Firestore = getFirestore()
): Promise<boolean> {
  const [propertySnapshot, rentalSnapshot] = await Promise.all([
    database.collection(PROPERTIES_COLLECTION).doc(input.propertyId).get(),
    database.collection(RENTALS_COLLECTION)
      .where("propertyId", "==", input.propertyId)
      .get(),
  ]);

  if (!propertySnapshot.exists) {
    throw new HttpsError("not-found", "This listing could not be found.");
  }

  const classification = classifyRentals(
    rentalSnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      data: snapshot.data(),
    })),
    null,
    input
  );

  return !classification.approvedConflict;
}

export async function approveRentalRequestForUser(
  uid: string,
  rentalId: string,
  database: Firestore = getFirestore()
): Promise<RentalApprovalResult> {
  const rentalRef = database.collection(RENTALS_COLLECTION).doc(rentalId);
  const paymentRef = database.collection(PAYMENTS_COLLECTION).doc(rentalId);

  return database.runTransaction(async (transaction) => {
    const [rentalSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(rentalRef),
      transaction.get(paymentRef),
    ]);
    const rental = rentalSnapshot.data();

    if (!rentalSnapshot.exists || !rental) {
      throw new HttpsError(
        "not-found",
        "This rental request could not be found."
      );
    }

    if (rental.ownerUid !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Only the listing owner can approve this rental request."
      );
    }

    if (rental.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        "Only pending rental requests can be approved."
      );
    }

    if (paymentSnapshot.exists && paymentSnapshot.get("status") !== "unpaid") {
      throw new HttpsError(
        "failed-precondition",
        "This decision is locked by the current payment state."
      );
    }

    const propertyId = requireBoundedString(
      rental.propertyId,
      "Stored property ID",
      1500
    );
    const requestedDates = readRentalDateRange(rental);

    if (!requestedDates) {
      throw new HttpsError(
        "failed-precondition",
        "This rental request has invalid dates."
      );
    }

    const propertyRentalsSnapshot = await transaction.get(
      database.collection(RENTALS_COLLECTION)
        .where("propertyId", "==", propertyId)
    );
    const classification = classifyRentals(
      propertyRentalsSnapshot.docs.map((snapshot) => ({
        id: snapshot.id,
        data: snapshot.data(),
      })),
      rentalId,
      requestedDates
    );

    if (classification.approvedConflict) {
      throw new HttpsError("failed-precondition", UNAVAILABLE_MESSAGE);
    }

    const now = FieldValue.serverTimestamp();

    transaction.update(rentalRef, {
      status: "approved",
      updatedAt: now,
    });
    classification.overlappingPendingIds.forEach((pendingRentalId) => {
      transaction.update(
        database.collection(RENTALS_COLLECTION).doc(pendingRentalId),
        {
          status: "rejected",
          updatedAt: now,
        }
      );
    });

    return {
      autoRejectedCount: classification.overlappingPendingIds.length,
    };
  });
}

export const checkRentalAvailability = onCall(
  {invoker: "public"},
  async (request): Promise<{available: boolean}> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to check rental availability."
      );
    }

    const input = requireAvailabilityInput(request.data);
    return {available: await checkRentalAvailabilityForInput(input)};
  }
);

export const approveRentalRequest = onCall(
  {invoker: "public"},
  async (request): Promise<RentalApprovalResult> => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to approve a rental request."
      );
    }

    return approveRentalRequestForUser(
      request.auth.uid,
      requireRentalId(request.data?.rentalId)
    );
  }
);

export const rentalTestHelpers = {
  classifyRentals,
  datesOverlap,
  requireAvailabilityInput,
  requireRentalId,
};
