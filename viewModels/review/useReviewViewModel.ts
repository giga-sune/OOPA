import { useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../../context/AuthContext";
import { createReview } from "../../services/firestore/reviewService";
import {
  MAX_REVIEW_TEXT_LENGTH,
  MIN_REVIEW_TEXT_LENGTH,
  type ReviewRating,
} from "../../types/review/reviewTypes";
import type { RootStackParamList } from "../../types/navigation/navigationTypes";

export interface ReviewViewModelResult {
  rating: ReviewRating | 0;
  reviewText: string;
  isSubmitting: boolean;
  errorMessage: string;
  setRating: (value: ReviewRating) => void;
  setReviewText: (value: string) => void;
  submitReview: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not submit your review. Please try again.";
}

export default function useReviewViewModel(
  rentalId: string
): ReviewViewModelResult {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [rating, setRatingState] = useState<ReviewRating | 0>(0);
  const [reviewText, setReviewTextState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const setRating = (value: ReviewRating) => {
    setErrorMessage("");
    setRatingState(value);
  };

  const setReviewText = (value: string) => {
    setErrorMessage("");
    setReviewTextState(value);
  };

  const submitReview = async () => {
    if (isSubmitting) {
      return;
    }

    setErrorMessage("");

    if (!user?.uid) {
      setErrorMessage("You must be signed in to leave a review.");
      return;
    }

    if (rating === 0) {
      setErrorMessage("Please choose a rating from 1 to 5.");
      return;
    }

    const trimmedTextLength = reviewText.trim().length;

    if (
      trimmedTextLength < MIN_REVIEW_TEXT_LENGTH ||
      trimmedTextLength > MAX_REVIEW_TEXT_LENGTH
    ) {
      setErrorMessage(
        `Your review must be ${MIN_REVIEW_TEXT_LENGTH} to ${MAX_REVIEW_TEXT_LENGTH} characters.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await createReview({
        rentalId,
        reviewerUid: user.uid,
        rating,
        reviewText,
      });

      Alert.alert("Review Submitted", "Thank you for sharing your experience.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    rating,
    reviewText,
    isSubmitting,
    errorMessage,
    setRating,
    setReviewText,
    submitReview,
  };
}
