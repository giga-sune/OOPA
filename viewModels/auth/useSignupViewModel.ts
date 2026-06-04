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
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupViewModelResult {
  userName: string;
  setUserName: Dispatch<SetStateAction<string>>;
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
  userName,
  email,
  password,
  confirmPassword,
}: {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): SignupFieldErrors {
  const fieldErrors: SignupFieldErrors = {
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
  };

  if (!userName.trim()) {
    fieldErrors.userName = "Username is required.";
  } else if (userName.trim().length < 3) {
    fieldErrors.userName = "Username must be at least 3 characters.";
  }

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
  const [userName, setUserName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<SignupFieldErrors>({
    userName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const hasFieldErrors = useMemo(() => {
    return Object.values(fieldErrors).some(Boolean);
  }, [fieldErrors]);

  const onSubmit = async (): Promise<boolean> => {
    const nextFieldErrors = validateSignupFields({
      userName,
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
        userName: userName.trim(),
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
    userName,
    setUserName,
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
