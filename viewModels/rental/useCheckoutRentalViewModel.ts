import { useEffect, useMemo, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { getPropertyById } from "../../services/firestore/propertyService";
import {
  calculateRentalTotalPrice,
  createRentalRequest,
} from "../../services/firestore/rentalService";
import type { Property } from "../../types/property/propertyTypes";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2_000;

export type CheckoutSubmissionOutcome =
  | { status: "success"; rentalId: string }
  | { status: "failure"; message: string };

export interface CheckoutRentalViewModelResult {
  property: Property | null;
  loadingProperty: boolean;
  message: string;
  startDate: Date;
  endDate: Date;
  temporaryStartDate: Date;
  temporaryEndDate: Date;
  showStartPicker: boolean;
  showEndPicker: boolean;
  submitting: boolean;
  errorMessage: string;
  totalPrice: number;
  setMessage: (value: string) => void;
  openStartPicker: () => void;
  openEndPicker: () => void;
  cancelStartPicker: () => void;
  cancelEndPicker: () => void;
  setTemporaryStartDate: (value: Date) => void;
  setTemporaryEndDate: (value: Date) => void;
  confirmStartDate: (value?: Date) => void;
  confirmEndDate: (value?: Date) => void;
  submitRentalRequest: () => Promise<CheckoutSubmissionOutcome>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function createInitialDates(): { startDate: Date; endDate: Date } {
  const startDate = new Date();
  return { startDate, endDate: new Date(startDate.getTime() + 7 * DAY_IN_MS) };
}

export default function useCheckoutRentalViewModel(
  propertyId: string
): CheckoutRentalViewModelResult {
  const { user } = useAuth();
  const initialDates = useMemo(createInitialDates, []);
  const [property, setProperty] = useState<Property | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [message, setMessageState] = useState("");
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);
  const [temporaryStartDate, setTemporaryStartDate] = useState(initialDates.startDate);
  const [temporaryEndDate, setTemporaryEndDate] = useState(initialDates.endDate);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    setLoadingProperty(true);
    setProperty(null);
    setErrorMessage("");

    if (!propertyId.trim()) {
      setErrorMessage("Missing property identification reference.");
      setLoadingProperty(false);
      return () => {
        isActive = false;
      };
    }

    void getPropertyById(propertyId)
      .then((nextProperty) => {
        if (!isActive) return;
        setProperty(nextProperty);
        if (!nextProperty) {
          setErrorMessage("Could not find item details.");
        }
      })
      .catch((error) => {
        if (!isActive) return;
        setErrorMessage(getErrorMessage(error, "Could not load item details."));
      })
      .finally(() => {
        if (isActive) setLoadingProperty(false);
      });

    return () => {
      isActive = false;
    };
  }, [propertyId]);

  const totalPrice = property
    ? calculateRentalTotalPrice(property.price, property.ratePeriod, startDate, endDate)
    : 0;

  const setMessage = (value: string) => {
    setErrorMessage("");
    setMessageState(value);
  };

  const openStartPicker = () => {
    setTemporaryStartDate(startDate);
    setShowStartPicker(true);
  };

  const openEndPicker = () => {
    setTemporaryEndDate(endDate);
    setShowEndPicker(true);
  };

  const cancelStartPicker = () => {
    setTemporaryStartDate(startDate);
    setShowStartPicker(false);
  };

  const cancelEndPicker = () => {
    setTemporaryEndDate(endDate);
    setShowEndPicker(false);
  };

  const confirmStartDate = (value = temporaryStartDate) => {
    setErrorMessage("");
    setStartDate(value);
    setTemporaryStartDate(value);

    if (value.getTime() >= endDate.getTime()) {
      const nextEndDate = new Date(value.getTime() + DAY_IN_MS);
      setEndDate(nextEndDate);
      setTemporaryEndDate(nextEndDate);
    }

    setShowStartPicker(false);
  };

  const confirmEndDate = (value = temporaryEndDate) => {
    setErrorMessage("");

    if (value.getTime() <= startDate.getTime()) {
      setErrorMessage("End date must be after the start date.");
      return;
    }

    setEndDate(value);
    setTemporaryEndDate(value);
    setShowEndPicker(false);
  };

  const submitRentalRequest = async (): Promise<CheckoutSubmissionOutcome> => {
    if (submitting) {
      return { status: "failure", message: "Your rental request is already being submitted." };
    }

    let validationError = "";
    if (!user?.uid) validationError = "You must be signed in to submit a rental request.";
    else if (!property) validationError = "The requested property could not be found.";
    else if (property.ownerUid === user.uid) validationError = "You cannot rent your own listing.";
    else if (endDate.getTime() <= startDate.getTime()) validationError = "End date must be after the start date.";
    else if (message.trim().length > MAX_MESSAGE_LENGTH) validationError = `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
    else if (!Number.isFinite(totalPrice) || totalPrice <= 0) validationError = "Rental total must be greater than $0.00.";

    if (validationError || !user) {
      const nextMessage = validationError || "You must be signed in to submit a rental request.";
      setErrorMessage(nextMessage);
      return { status: "failure", message: nextMessage };
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const rentalId = await createRentalRequest({
        propertyId,
        renterUid: user.uid,
        startDate,
        endDate,
        message: message.trim() || null,
      });
      return { status: "success", rentalId };
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Could not submit your rental request. Please try again."
      );
      setErrorMessage(nextMessage);
      return { status: "failure", message: nextMessage };
    } finally {
      setSubmitting(false);
    }
  };

  return {
    property,
    loadingProperty,
    message,
    startDate,
    endDate,
    temporaryStartDate,
    temporaryEndDate,
    showStartPicker,
    showEndPicker,
    submitting,
    errorMessage,
    totalPrice,
    setMessage,
    openStartPicker,
    openEndPicker,
    cancelStartPicker,
    cancelEndPicker,
    setTemporaryStartDate,
    setTemporaryEndDate,
    confirmStartDate,
    confirmEndDate,
    submitRentalRequest,
  };
}
