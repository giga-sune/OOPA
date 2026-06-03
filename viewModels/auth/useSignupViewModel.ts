import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { signUpWithEmail } from "../../services/auth/authService";
import { createUserProfile } from "../../services/firestore/userService";

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

export interface SignupFieldErrors {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupViewModelResult {
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  onSubmit: () => Promise<boolean>;
  loading: boolean;
  error: string;
  fieldErrors: SignupFieldErrors;
  hasFieldErrors: boolean;
}

function validateSignupFields({
  email,
  password,
  confirmPassword,
}: {
  email: string;
  password: string;
  confirmPassword: string;
}): SignupFieldErrors {
  const fieldErrors: SignupFieldErrors = {
    email: "",
    password: "",
    confirmPassword: "",
  };

  if (!email.trim()) {
    fieldErrors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(email.trim())) {
    fieldErrors.email = "Please enter a valid email.";
  }

  if (!password) {
    fieldErrors.password = "Password is required.";
  } else if (password.length < 6) {
    fieldErrors.password = "Password must be at least 6 characters.";
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }

  return fieldErrors;
}

export default function useSignupViewModel(): SignupViewModelResult {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const hasFieldErrors = useMemo(() => {
    return Object.values(fieldErrors).some(Boolean);
  }, [fieldErrors]);

  const onSubmit = async (): Promise<boolean> => {
    const nextFieldErrors = validateSignupFields({
      email,
      password,
      confirmPassword,
    });

    setFieldErrors(nextFieldErrors);
    setError("");

    if (Object.values(nextFieldErrors).some(Boolean)) {
      return false;
    }

    setLoading(true);

    try {
      const result = await signUpWithEmail({
        email: email.trim(),
        password,
      });

      await createUserProfile({
        uid: result.user.uid,
        email: result.user.email ?? email.trim(),
        userName: result.user.displayName ?? null,
        photoURL: result.user.photoURL ?? null,
        phone: result.user.phoneNumber ?? null,
      });

      return true;
    } catch (serviceError) {
      setError(
        getErrorMessage(serviceError, "Could not create your account. Please try again.")
      );
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
    confirmPassword,
    setConfirmPassword,
    onSubmit,
    loading,
    error,
    fieldErrors,
    hasFieldErrors,
  };
}
