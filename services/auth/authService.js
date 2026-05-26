import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase/firebaseApp";

/**
 * @typedef {import("../../types/auth/authTypes").AuthCredentials} AuthCredentials
 * @typedef {import("../../types/auth/authTypes").AuthResult} AuthResult
 * @typedef {import("../../types/auth/authTypes").ServiceError} ServiceError
 */

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
 * @returns {ServiceError}
 */
export function mapAuthError(error) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : "auth/unknown";

  return {
    code,
    message:
      AUTH_ERROR_MESSAGES[code] ??
      "Something went wrong. Please try again.",
  };
}

/**
 * @param {AuthCredentials} credentials
 * @returns {Promise<AuthResult>}
 */
export async function signUpWithEmail({ email, password }) {
  try {
    const userCredential =
      await createUserWithEmailAndPassword(auth, email, password);

    return { user: userCredential.user };
  } catch (error) {
    throw mapAuthError(error);
  }
}

/**
 * @param {AuthCredentials} credentials
 * @returns {Promise<AuthResult>}
 */
export async function signInWithEmail({ email, password }) {
  try {
    const userCredential =
      await signInWithEmailAndPassword(auth, email, password);

    return { user: userCredential.user };
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
