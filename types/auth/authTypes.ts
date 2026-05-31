import type { User } from "firebase/auth";
import { isRecord, readString } from "../shared/runtimeTypeUtils";

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignupInput extends AuthCredentials {
  confirmPassword: string;
  displayName: string | null;
  photoURL: string | null;
  phone: string | null;
}

export interface AuthResult {
  user: User;
}

export interface ServiceError {
  code: string;
  message: string;
}

function normalizeRequiredString(
  value: unknown,
  fieldName: string,
  { trim = false }: { trim?: boolean } = {}
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const nextValue = trim ? value.trim() : value;

  if (!nextValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return nextValue;
}

function normalizeOptionalNullableString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const nextValue = value.trim();
  return nextValue ? nextValue : null;
}

export function createAuthCredentials(input: unknown): AuthCredentials {
  const source = isRecord(input) ? input : {};

  return {
    email: normalizeRequiredString(source.email, "email", {
      trim: true,
    }),
    password: normalizeRequiredString(source.password, "password"),
  };
}

export function createSignupInput(input: unknown): SignupInput {
  const source = isRecord(input) ? input : {};

  return {
    email: normalizeRequiredString(source.email, "email", {
      trim: true,
    }),
    password: normalizeRequiredString(source.password, "password"),
    confirmPassword: normalizeRequiredString(source.confirmPassword, "confirmPassword"),
    displayName: normalizeOptionalNullableString(source.displayName),
    photoURL: normalizeOptionalNullableString(source.photoURL),
    phone: normalizeOptionalNullableString(source.phone),
  };
}

export function createAuthResult(user: unknown): AuthResult {
  if (!isRecord(user)) {
    throw new Error("user is required.");
  }

  return { user: user as unknown as User };
}

export function createServiceError(input: unknown): ServiceError {
  const source = isRecord(input) ? input : {};
  const maybeCode = readString(source.code);
  const code = maybeCode ? maybeCode : "auth/unknown";
  const message =
    (readString(source.message) ?? "") || "Something went wrong. Please try again.";

  return { code, message };
}
