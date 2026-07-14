import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../../context/AuthContext";
import {
  calculateRentalTotalPrice,
  createRentalRequest,
} from "../../services/firestore/rentalService";
import { getUserProfile } from "../../services/firestore/userService";
import type { RootStackParamList } from "../../types/navigation/navigationTypes";

type CheckoutRouteParams = RootStackParamList["CheckoutScreen"];

export interface CheckoutRentalViewModelResult {
  fullName: string;
  email: string;
  contactNumber: string;
  message: string;
  startDate: Date | null;
  endDate: Date | null;
  showStartPicker: boolean;
  showEndPicker: boolean;
  submitting: boolean;
  errorMessage: string;
  totalAmount: string;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setContactNumber: (value: string) => void;
  setMessage: (value: string) => void;
  setShowStartPicker: (value: boolean) => void;
  setShowEndPicker: (value: boolean) => void;
  onStartDateChange: (value: Date | null) => void;
  onEndDateChange: (value: Date | null) => void;
  submitRentalRequest: () => Promise<void>;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function isValidEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export default function useCheckoutRentalViewModel(
  params: CheckoutRouteParams
): CheckoutRentalViewModelResult {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function prefillContactDetails() {
      if (!user?.uid) {
        if (isActive) {
          setFullName("");
          setEmail("");
          setContactNumber("");
        }

        return;
      }

      setEmail((currentValue) => currentValue || user.email || "");
      setFullName((currentValue) => currentValue || user.displayName || "");

      try {
        const profile = await getUserProfile(user.uid);

        if (!isActive || !profile) {
          return;
        }

        setFullName((currentValue) => currentValue || profile.userName || user.displayName || "");
        setEmail((currentValue) => currentValue || user.email || profile.email || "");
        setContactNumber((currentValue) => currentValue || profile.phone || "");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error, "Could not prefill your contact details."));
      }
    }

    void prefillContactDetails();

    return () => {
      isActive = false;
    };
  }, [user?.uid, user?.email, user?.displayName]);

  const totalAmount = startDate && endDate
    ? calculateRentalTotalPrice(
        params.price,
        params.ratePeriod,
        startDate,
        endDate
      ).toFixed(2)
    : "0.00";

  const onStartDateChange = (value: Date | null) => {
    setErrorMessage("");
    setStartDate(value);

    if (value && endDate && endDate.getTime() <= value.getTime()) {
      setEndDate(null);
    }
  };

  const onEndDateChange = (value: Date | null) => {
    setErrorMessage("");
    setEndDate(value);
  };

  const submitRentalRequest = async () => {
    setErrorMessage("");

    if (!user?.uid) {
      setErrorMessage("You must be signed in to submit a rental request.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!contactNumber.trim()) {
      setErrorMessage("Please enter your contact number.");
      return;
    }

    if (!startDate) {
      setErrorMessage("Please choose a rental start date.");
      return;
    }

    if (!endDate) {
      setErrorMessage("Please choose a rental end date.");
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setErrorMessage("End date must be after the start date.");
      return;
    }

    setSubmitting(true);

    try {
      await createRentalRequest({
        propertyId: params.propertyId,
        renterUid: user.uid,
        startDate,
        endDate,
        contactName: fullName,
        contactEmail: email,
        contactPhone: contactNumber,
        message,
      });

      Alert.alert("Request Sent", "Your rental request has been submitted.", [
        {
          text: "OK",
          onPress: () => {
            navigation.navigate("MainApp", { screen: "Home" });
          },
        },
      ]);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Could not submit your rental request. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return {
    fullName,
    email,
    contactNumber,
    message,
    startDate,
    endDate,
    showStartPicker,
    showEndPicker,
    submitting,
    errorMessage,
    totalAmount,
    setFullName,
    setEmail,
    setContactNumber,
    setMessage,
    setShowStartPicker,
    setShowEndPicker,
    onStartDateChange,
    onEndDateChange,
    submitRentalRequest,
  };
}
