import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase/firebaseApp";
import {
  createAuthCredentials,
  createAuthResult,
  createServiceError,
} from "../../types/auth/authTypes";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "This email is already in use.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/missing-password": "Password is required.",
  "auth/network-request-failed": "Network error. Please try again.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/too-many-requests": "Too many attempts. Please try later.",
  "auth/user-disabled": "This user account is disabled.",
  "auth/user-not-found": "No account found for this email.",
  "auth/weak-password":
    "Password is too weak. Use at least 6 characters.",
  "auth/wrong-password": "Email or password is incorrect.",
};

/**
 * @param {unknown} error
 * @returns {{ code: string, message: string }}
 */
export function mapAuthError(error) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "auth/unknown";

  return createServiceError({
    code,
    message:
      AUTH_ERROR_MESSAGES[code] ??
      "Something went wrong. Please try again.",
  });
}

/**
 * @param {unknown} credentials
 * @returns {Promise<{ user: import("firebase/auth").User }>}
 */
export async function signUpWithEmail(credentials) {
  const { email, password } = createAuthCredentials(credentials);

  try {
    const userCredential =
      await createUserWithEmailAndPassword(auth, email, password);

    return createAuthResult(userCredential.user);
  } catch (error) {
    throw mapAuthError(error);
  }
}

/**
 * @param {unknown} credentials
 * @returns {Promise<{ user: import("firebase/auth").User }>}
 */
export async function signInWithEmail(credentials) {
  const { email, password } = createAuthCredentials(credentials);

  try {
    const userCredential =
      await signInWithEmailAndPassword(auth, email, password);

    return createAuthResult(userCredential.user);
  } catch (error) {
    throw mapAuthError(error);
  }
}

/**
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw mapAuthError(error);
  }
}

/**
 * @param {(user: import("firebase/auth").User|null) => void} callback
 * @returns {() => void}
 */
export function subscribeToAuthSession(callback) {
  return onAuthStateChanged(auth, callback);
}
