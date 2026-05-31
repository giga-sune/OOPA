import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import {
  createAppUserProfile,
  createAppUserProfilePatch,
  type AppUserProfile,
  type AppUserProfilePatch,
} from "../../types/user/userTypes";

const USERS_COLLECTION = "users";

function getUserDocRef(uid: string) {
  return doc(db, USERS_COLLECTION, uid);
}

export async function createUserProfile(userProfile: unknown): Promise<AppUserProfile> {
  const payload = createAppUserProfile(userProfile, {
    createdAtFallback: serverTimestamp(),
    updatedAtFallback: serverTimestamp(),
  });

  await setDoc(getUserDocRef(payload.uid), payload);
  return payload;
}

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  const snapshot = await getDoc(getUserDocRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return createAppUserProfile(snapshot.data());
}

export async function updateUserProfile(uid: string, patch: unknown): Promise<void> {
  const normalizedPatch: AppUserProfilePatch = createAppUserProfilePatch(patch);

  const updatePayload = {
    ...normalizedPatch,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(getUserDocRef(uid), updatePayload);
}
