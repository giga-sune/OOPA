import { useState, type Dispatch, type SetStateAction } from "react";

import { signInWithEmail } from "../../services/auth/authService";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

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

export interface LoginViewModelResult {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  onSubmit: () => Promise<boolean>;
  loading: boolean;
  error: string;
}

export default function useLoginViewModel(): LoginViewModelResult {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const onSubmit = async (): Promise<boolean> => {
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return false;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Please enter a valid email.");
      return false;
    }

    if (!password) {
      setError("Password is required.");
      return false;
    }

    setLoading(true);

    try {
      await signInWithEmail({
        email: email.trim(),
        password,
      });
      return true;
    } catch (serviceError) {
      setError(getErrorMessage(serviceError, "Could not sign in. Please try again."));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    onSubmit,
    loading,
    error,
  };
}
