import { isRecord } from "../shared/runtimeTypeUtils";

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  phone: string | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AppUserProfilePatch {
  email?: string;
  displayName?: string | null;
  photoURL?: string | null;
  phone?: string | null;
}

export interface CreateAppUserProfileOptions {
  createdAtFallback?: unknown;
  updatedAtFallback?: unknown;
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

export function createAppUserProfile(
  input: unknown,
  options: CreateAppUserProfileOptions = {}
): AppUserProfile {
  const source = isRecord(input) ? input : {};

  const createdAt =
    source.createdAt !== undefined ? source.createdAt : options.createdAtFallback ?? null;
  const updatedAt =
    source.updatedAt !== undefined ? source.updatedAt : options.updatedAtFallback ?? null;

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

export function createAppUserProfilePatch(input: unknown): AppUserProfilePatch {
  const source = isRecord(input) ? input : {};
  const patch: AppUserProfilePatch = {};

  if (source.email !== undefined) {
    patch.email = normalizeRequiredString(source.email, "email", {
      trim: true,
    });
  }

  if (source.displayName !== undefined) {
    patch.displayName = normalizeOptionalNullableString(source.displayName);
  }

  if (source.photoURL !== undefined) {
    patch.photoURL = normalizeOptionalNullableString(source.photoURL);
  }

  if (source.phone !== undefined) {
    patch.phone = normalizeOptionalNullableString(source.phone);
  }

  return patch;
}
