export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  id: string;
  rentalId: string;
  propertyId: string;
  reviewerUid: string;
  reviewerDisplayName: string | null;
  reviewerPhotoURL: string | null;
  rating: ReviewRating;
  reviewText: string;
  createdAt: Date;
}

export interface CreateReviewInput {
  rentalId: string;
  reviewerUid: string;
  rating: ReviewRating;
  reviewText: string;
}

export const MIN_REVIEW_TEXT_LENGTH = 10;
export const MAX_REVIEW_TEXT_LENGTH = 1000;
