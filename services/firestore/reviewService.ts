import {
  doc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import {
  MAX_REVIEW_TEXT_LENGTH,
  MIN_REVIEW_TEXT_LENGTH,
  type CreateReviewInput,
} from "../../types/review/reviewTypes";

const RENTALS_COLLECTION = "rentals";
const REVIEWS_COLLECTION = "reviews";
const USERS_COLLECTION = "users";

function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function readDisplayName(profile: DocumentData | undefined): string | null {
  const userName = profile?.userName;

  return typeof userName === "string" &&
    userName.length >= 1 &&
    userName.length <= 100
    ? userName
    : null;
}

function isValidPublicUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 2048 &&
    (value.startsWith("https://") || value.startsWith("http://"))
  );
}

function readProfilePhotoURL(profile: DocumentData | undefined): string | null {
  if (isValidPublicUrl(profile?.profilePictureUrl)) {
    return profile.profilePictureUrl;
  }

  return isValidPublicUrl(profile?.photoURL) ? profile.photoURL : null;
}

function readRentalEndTime(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return null;
}

function validateInput(input: CreateReviewInput): string {
  if (!input.rentalId.trim()) {
    throw new Error("Rental ID is required.");
  }

  if (!input.reviewerUid.trim()) {
    throw new Error("You must be signed in to leave a review.");
  }

  if (!isValidRating(input.rating)) {
    throw new Error("Please choose a rating from 1 to 5.");
  }

  const reviewText = input.reviewText.trim();

  if (
    reviewText.length < MIN_REVIEW_TEXT_LENGTH ||
    reviewText.length > MAX_REVIEW_TEXT_LENGTH
  ) {
    throw new Error(
      `Your review must be ${MIN_REVIEW_TEXT_LENGTH} to ${MAX_REVIEW_TEXT_LENGTH} characters.`
    );
  }

  return reviewText;
}

export async function createReview(input: CreateReviewInput): Promise<string> {
  const rentalId = input.rentalId.trim();
  const reviewerUid = input.reviewerUid.trim();
  const reviewText = validateInput(input);

  const rentalRef = doc(db, RENTALS_COLLECTION, rentalId);
  const reviewRef = doc(db, REVIEWS_COLLECTION, rentalId);
  const reviewerRef = doc(db, USERS_COLLECTION, reviewerUid);

  await runTransaction(db, async (transaction) => {
    const [rentalSnapshot, reviewSnapshot, reviewerSnapshot] = await Promise.all([
      transaction.get(rentalRef),
      transaction.get(reviewRef),
      transaction.get(reviewerRef),
    ]);

    if (!rentalSnapshot.exists()) {
      throw new Error("This rental could not be found.");
    }

    if (reviewSnapshot.exists()) {
      throw new Error("You have already reviewed this rental.");
    }

    const rental = rentalSnapshot.data();

    if (rental.renterUid !== reviewerUid) {
      throw new Error("Only the renter can review this item.");
    }

    if (rental.status !== "approved") {
      throw new Error("Only approved rentals can be reviewed.");
    }

    const rentalEndTime = readRentalEndTime(rental.endDate);

    if (rentalEndTime === null) {
      throw new Error("This rental has an invalid end date.");
    }

    if (rentalEndTime > Date.now()) {
      throw new Error("You can review this item after the rental has ended.");
    }

    if (typeof rental.propertyId !== "string" || !rental.propertyId.trim()) {
      throw new Error("This rental is missing its item reference.");
    }

    const reviewerProfile = reviewerSnapshot.exists()
      ? reviewerSnapshot.data()
      : undefined;

    transaction.set(reviewRef, {
      rentalId,
      propertyId: rental.propertyId,
      reviewerUid,
      reviewerDisplayName: readDisplayName(reviewerProfile),
      reviewerPhotoURL: readProfilePhotoURL(reviewerProfile),
      rating: input.rating,
      reviewText,
      createdAt: serverTimestamp(),
    });
  });

  return reviewRef.id;
}
