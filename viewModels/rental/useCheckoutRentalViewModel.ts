import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import * as Notifications from "expo-notifications";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase/firebaseApp";
import { getPropertyById } from "../../services/firestore/propertyService";
import {
  calculateRentalTotalPrice,
  checkRentalAvailability,
  createRentalRequest,
} from "../../services/firestore/rentalService";
import type { Property } from "../../types/property/propertyTypes";
import type { RentalAvailabilityStatus } from "../../types/rental/rentalTypes";

const MAX_MESSAGE_LENGTH = 2_000;
const UNAVAILABLE_MESSAGE = "These dates are no longer available.";

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
  availabilityStatus: RentalAvailabilityStatus;
  availabilityMessage: string;
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

function normalizeRentalDate(value: Date): Date {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addCalendarDays(value: Date, numberOfDays: number): Date {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + numberOfDays);
  return normalizeRentalDate(nextDate);
}

function createInitialDates(): { startDate: Date; endDate: Date } {
  const startDate = normalizeRentalDate(new Date());
  return { startDate, endDate: addCalendarDays(startDate, 7) };
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
  const [availabilityStatus, setAvailabilityStatus] =
    useState<RentalAvailabilityStatus>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const availabilityRequestRef = useRef(0);

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

  useEffect(() => {
    if (!user?.uid || !property || endDate.getTime() <= startDate.getTime()) {
      availabilityRequestRef.current += 1;
      setAvailabilityStatus("idle");
      setAvailabilityMessage("");
      return;
    }

    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;
    let isActive = true;
    setAvailabilityStatus("checking");
    setAvailabilityMessage("Checking availability...");

    void checkRentalAvailability(property.id, startDate, endDate)
      .then((available) => {
        if (!isActive || availabilityRequestRef.current !== requestId) return;

        setAvailabilityStatus(available ? "available" : "unavailable");
        setAvailabilityMessage(available ? "Dates are available." : UNAVAILABLE_MESSAGE);
      })
      .catch(() => {
        if (!isActive || availabilityRequestRef.current !== requestId) return;

        setAvailabilityStatus("error");
        setAvailabilityMessage("Could not verify availability. Submit to try again.");
      });

    return () => {
      isActive = false;
    };
  }, [endDate, property, startDate, user?.uid]);

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

  const invalidateAvailability = () => {
    availabilityRequestRef.current += 1;
    setAvailabilityStatus("idle");
    setAvailabilityMessage("");
  };

  const confirmStartDate = (value = temporaryStartDate) => {
    const nextStartDate = normalizeRentalDate(value);
    setErrorMessage("");
    invalidateAvailability();
    setStartDate(nextStartDate);
    setTemporaryStartDate(nextStartDate);

    if (nextStartDate.getTime() >= endDate.getTime()) {
      const nextEndDate = addCalendarDays(nextStartDate, 1);
      setEndDate(nextEndDate);
      setTemporaryEndDate(nextEndDate);
    }

    setShowStartPicker(false);
  };

  const confirmEndDate = (value = temporaryEndDate) => {
    const nextEndDate = normalizeRentalDate(value);
    setErrorMessage("");

    if (nextEndDate.getTime() <= startDate.getTime()) {
      setErrorMessage("End date must be after the start date.");
      return;
    }

    invalidateAvailability();
    setEndDate(nextEndDate);
    setTemporaryEndDate(nextEndDate);
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
    let availabilityVerified = false;

    try {
      const requestId = availabilityRequestRef.current + 1;
      availabilityRequestRef.current = requestId;
      setAvailabilityStatus("checking");
      setAvailabilityMessage("Checking availability...");

      const available = await checkRentalAvailability(propertyId, startDate, endDate);

      if (availabilityRequestRef.current !== requestId) {
        const changedMessage = "Dates changed. Check availability again.";
        return { status: "failure", message: changedMessage };
      }

      if (!available) {
        setAvailabilityStatus("unavailable");
        setAvailabilityMessage(UNAVAILABLE_MESSAGE);
        setErrorMessage(UNAVAILABLE_MESSAGE);
        return { status: "failure", message: UNAVAILABLE_MESSAGE };
      }

      availabilityVerified = true;
      setAvailabilityStatus("available");
      setAvailabilityMessage("Dates are available.");

      const rentalId = await createRentalRequest({
        propertyId,
        renterUid: user.uid,
        startDate,
        endDate,
        message: message.trim() || null,
      });

      try {
        if (property) {
          await addDoc(collection(db, "notifications"), {
            recipientUid: property.ownerUid,
            type: "new_request",
            categoryLabel: "New Rental Request",
            bodyText: `${user.displayName || "A borrower"} has requested to rent "${property.title}".`,
            propertyImageUrl: property.images?.[0] || null,
            createdAt: serverTimestamp(),
            read: false,
          });

          // Keep a local fallback for development builds.
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "New Rental Request",
              body: `${user.displayName || "A borrower"} has requested to rent "${property.title}".`,
              data: { propertyId, rentalId },
            },
            trigger: null,
          });
        }
      } catch (notifError) {
        console.error("Failed to create lender notification:", notifError);
      }

      return { status: "success", rentalId };
    } catch (error) {
      const nextMessage = getErrorMessage(
        error,
        "Could not submit your rental request. Please try again."
      );
      if (!availabilityVerified) {
        setAvailabilityStatus("error");
        setAvailabilityMessage("Could not verify availability. Submit to try again.");
      }
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
    availabilityStatus,
    availabilityMessage,
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