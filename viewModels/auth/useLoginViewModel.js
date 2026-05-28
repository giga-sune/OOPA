import { useState } from "react";

import { signInWithEmail } from "../../services/auth/authService";
import { createAuthCredentials } from "../../types/auth/authTypes";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export default function useLoginViewModel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
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
      setError(
        serviceError?.message ??
          "Could not sign in. Please try again."
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
    onSubmit,
    loading,
    error,
  };
}
