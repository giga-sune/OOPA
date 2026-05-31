import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import { auth } from "../firebase/firebaseApp";
import {
  createAuthCredentials,
  createAuthResult,
  createServiceError,
  type AuthResult,
  type ServiceError,
} from "../../types/auth/authTypes";
import { isRecord, readString } from "../../types/shared/runtimeTypeUtils";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "This email is already in use.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/missing-password": "Password is required.",
  "auth/network-request-failed": "Network error. Please try again.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/too-many-requests": "Too many attempts. Please try later.",
  "auth/user-disabled": "This user account is disabled.",
  "auth/user-not-found": "No account found for this email.",
  "auth/weak-password": "Password is too weak. Use at least 6 characters.",
  "auth/wrong-password": "Email or password is incorrect.",
};

export function mapAuthError(error: unknown): ServiceError {
  const source = isRecord(error) ? error : {};
  const code = readString(source.code) ?? "auth/unknown";

  return createServiceError({
    code,
    message: AUTH_ERROR_MESSAGES[code] ?? "Something went wrong. Please try again.",
  });
}

export async function signUpWithEmail(credentials: unknown): Promise<AuthResult> {
  const { email, password } = createAuthCredentials(credentials);

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    return createAuthResult(userCredential.user);
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function signInWithEmail(credentials: unknown): Promise<AuthResult> {
  const { email, password } = createAuthCredentials(credentials);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    return createAuthResult(userCredential.user);
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw mapAuthError(error);
  }
}

export function subscribeToAuthSession(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}
