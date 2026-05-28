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
 * @param {{
 *   createdAtFallback?: any,
 *   updatedAtFallback?: any
 * }=} options
 * @returns {{
 *   uid: string,
 *   email: string,
 *   displayName: string | null,
 *   photoURL: string | null,
 *   phone: string | null,
 *   createdAt: any,
 *   updatedAt: any
 * }}
 */
export function createAppUserProfile(input, options = {}) {
  const source =
    typeof input === "object" && input !== null ? input : {};

  const createdAt =
    source.createdAt !== undefined
      ? source.createdAt
      : options.createdAtFallback ?? null;
  const updatedAt =
    source.updatedAt !== undefined
      ? source.updatedAt
      : options.updatedAtFallback ?? null;

  return {
    uid: normalizeRequiredString(source.uid, "uid"),
    email: normalizeRequiredString(source.email, "email", {
      trim: true,
    }),
    displayName: normalizeOptionalNullableString(source.displayName),
    photoURL: normalizeOptionalNullableString(source.photoURL),
    phone: normalizeOptionalNullableString(source.phone),
    createdAt,
    updatedAt,
  };
}

/**
 * @param {unknown} input
 * @returns {{
 *   email?: string,
 *   displayName?: string | null,
 *   photoURL?: string | null,
 *   phone?: string | null
 * }}
 */
export function createAppUserProfilePatch(input) {
  const source =
    typeof input === "object" && input !== null ? input : {};
  const patch = {};

  if (source.email !== undefined) {
    patch.email = normalizeRequiredString(source.email, "email", {
      trim: true,
    });
  }

  if (source.displayName !== undefined) {
    patch.displayName = normalizeOptionalNullableString(
      source.displayName
    );
  }

  if (source.photoURL !== undefined) {
    patch.photoURL = normalizeOptionalNullableString(
      source.photoURL
    );
  }

  if (source.phone !== undefined) {
    patch.phone = normalizeOptionalNullableString(source.phone);
  }

  return patch;
}
