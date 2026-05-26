import { useMemo, useState } from "react";

import { signUpWithEmail } from "../../services/auth/authService";
import { createUserProfile } from "../../services/firestore/userService";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function validateSignupFields({ email, password, confirmPassword }) {
  const fieldErrors = {
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

export default function useSignupViewModel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const hasFieldErrors = useMemo(() => {
    return Object.values(fieldErrors).some(Boolean);
  }, [fieldErrors]);

  const onSubmit = async () => {
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
        displayName: result.user.displayName ?? null,
        photoURL: result.user.photoURL ?? null,
        phone: result.user.phoneNumber ?? null,
      });

      return true;
    } catch (serviceError) {
      setError(
        serviceError?.message ??
          "Could not create your account. Please try again."
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
