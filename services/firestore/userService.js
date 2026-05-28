import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import {
  createAppUserProfile,
  createAppUserProfilePatch,
} from "../../types/user/userTypes";

const USERS_COLLECTION = "users";

/**
 * @param {string} uid
 */
function getUserDocRef(uid) {
  return doc(db, USERS_COLLECTION, uid);
}

/**
 * @param {unknown} userProfile
 * @returns {Promise<ReturnType<typeof createAppUserProfile>>}
 */
export async function createUserProfile(userProfile) {
  const payload = createAppUserProfile(userProfile, {
    createdAtFallback: serverTimestamp(),
    updatedAtFallback: serverTimestamp(),
  });

  await setDoc(getUserDocRef(payload.uid), payload);
  return payload;
}

/**
 * @param {string} uid
 * @returns {Promise<ReturnType<typeof createAppUserProfile>|null>}
 */
export async function getUserProfile(uid) {
  const snapshot = await getDoc(getUserDocRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return createAppUserProfile(snapshot.data());
}

/**
 * @param {string} uid
 * @param {unknown} patch
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, patch) {
  const normalizedPatch = createAppUserProfilePatch(patch);

  const updatePayload = {
    ...normalizedPatch,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(getUserDocRef(uid), updatePayload);
}
