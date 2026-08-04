import { useState, type Dispatch, type SetStateAction } from "react";

import { requestPasswordReset } from "../../services/auth/authService";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }

  return "Could not send the reset link. Please try again.";
}

export interface ForgotPasswordViewModelResult {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  onSubmit: () => Promise<void>;
  loading: boolean;
  error: string;
  sent: boolean;
}

export default function useForgotPasswordViewModel(
  initialEmail = ""
): ForgotPasswordViewModelResult {
  const [email, setEmailState] = useState(initialEmail.trim());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const setEmail: Dispatch<SetStateAction<string>> = (value) => {
    setSent(false);
    setError("");
    setEmailState(value);
  };

  const onSubmit = async (): Promise<void> => {
    const normalizedEmail = email.trim();
    setError("");
    setSent(false);

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Please enter a valid email.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(normalizedEmail);
      setEmailState(normalizedEmail);
      setSent(true);
    } catch (serviceError) {
      setError(getErrorMessage(serviceError));
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    onSubmit,
    loading,
    error,
    sent,
  };
}
