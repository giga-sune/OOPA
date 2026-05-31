import { useState, type Dispatch, type SetStateAction } from "react";

import { signInWithEmail } from "../../services/auth/authService";
import { createAuthCredentials } from "../../types/auth/authTypes";
import { readErrorMessage } from "../../types/shared/runtimeTypeUtils";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

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
      const credentials = createAuthCredentials({ email, password });
      await signInWithEmail(credentials);
      return true;
    } catch (serviceError) {
      setError(readErrorMessage(serviceError, "Could not sign in. Please try again."));
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
