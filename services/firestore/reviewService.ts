import {
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
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

export interface Review {
  rentalId: string;
  propertyId: string;
  reviewerUid: string;
  reviewerDisplayName: string | null;
  reviewerPhotoURL: string | null;
  rating: number;
  reviewText: string;
  createdAt: Date;
}

// Convert Firestore timestamps cleanly
function toReviewDate(value: any): Date {
  if (value && typeof value === 'object' && 'toDate' in value) {
    return value.toDate();
  }
  return new Date(value || Date.now());
}

/**
 * Fetches all reviews for a specific property (most recent first)
 */
export async function getReviewsForProperty(propertyId: string): Promise<Review[]> {
  if (!propertyId.trim()) return [];

  const reviewsQuery = query(
    collection(db, REVIEWS_COLLECTION),
    where("propertyId", "==", propertyId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(reviewsQuery);
  return snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      rentalId: docSnap.id,
      propertyId: data.propertyId,
      reviewerUid: data.reviewerUid,
      reviewerDisplayName: data.reviewerDisplayName,
      reviewerPhotoURL: data.reviewerPhotoURL,
      rating: data.rating,
      reviewText: data.reviewText,
      createdAt: toReviewDate(data.createdAt),
    };
  });
}

/**
 * Fetches a preview (latest 2 or 3) of reviews and calculates averages
 */
export async function getPropertyReviewSummary(propertyId: string) {
  const allReviews = await getReviewsForProperty(propertyId);
  
  if (allReviews.length === 0) {
    return {
      reviewsPreview: [],
      totalReviews: 0,
      averageRating: 0,
    };
  }

  const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = parseFloat((sum / allReviews.length).toFixed(1));

  return {
    reviewsPreview: allReviews.slice(0, 3), // Latest 3 reviews
    totalReviews: allReviews.length,
    averageRating,
  };
}

// --- Your Existing Write Functions & Helpers ---

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

    // TEMPORARY BYPASS: Comment out the date check so future rentals can be reviewed
    // if (rentalEndTime > Date.now()) {
    //   throw new Error("You can review this item after the rental has ended.");
    // }

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