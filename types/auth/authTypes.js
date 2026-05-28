function normalizeRequiredString(value, fieldName, { trim = false } = {}) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const nextValue = trim ? value.trim() : value;

  if (!nextValue) {
    throw new Error(`${fieldName} is required.`);
  }

  return nextValue;
}

function normalizeOptionalNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const nextValue = value.trim();
  return nextValue ? nextValue : null;
}

/**
 * @param {unknown} input
 * @returns {{ email: string, password: string }}
 */
export function createAuthCredentials(input) {
  const source =
    typeof input === "object" && input !== null ? input : {};

  return {
    email: normalizeRequiredString(source.email, "email", {
      trim: true,
    }),
    password: normalizeRequiredString(source.password, "password"),
  };
}

/**
 * @param {unknown} input
 * @returns {{
 *   email: string,
 *   password: string,
 *   confirmPassword: string,
 *   displayName: string | null,
 *   photoURL: string | null,
 *   phone: string | null
 * }}
 */
export function createSignupInput(input) {
  const source =
    typeof input === "object" && input !== null ? input : {};

  return {
    email: normalizeRequiredString(source.email, "email", {
      trim: true,
    }),
    password: normalizeRequiredString(source.password, "password"),
    confirmPassword: normalizeRequiredString(
      source.confirmPassword,
      "confirmPassword"
    ),
    displayName: normalizeOptionalNullableString(source.displayName),
    photoURL: normalizeOptionalNullableString(source.photoURL),
    phone: normalizeOptionalNullableString(source.phone),
  };
}

/**
 * @param {unknown} user
 * @returns {{ user: import("firebase/auth").User }}
 */
export function createAuthResult(user) {
  if (!user || typeof user !== "object") {
    throw new Error("user is required.");
  }

  return { user };
}

/**
 * @param {unknown} input
 * @returns {{ code: string, message: string }}
 */
export function createServiceError(input) {
  const source =
    typeof input === "object" && input !== null ? input : {};

  const code =
    typeof source.code === "string" && source.code
      ? source.code
      : "auth/unknown";
  const message =
    typeof source.message === "string" && source.message
      ? source.message
      : "Something went wrong. Please try again.";

  return { code, message };
}
