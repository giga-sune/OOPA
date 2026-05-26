import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebaseApp";

/**
 * @typedef {import("../../types/user/userTypes").AppUserProfile} AppUserProfile
 */

const USERS_COLLECTION = "users";

/**
 * @param {string} uid
 */
function getUserDocRef(uid) {
  return doc(db, USERS_COLLECTION, uid);
}

/**
 * @param {Partial<AppUserProfile> & Pick<AppUserProfile, "uid" | "email">} userProfile
 * @returns {Promise<AppUserProfile>}
 */
export async function createUserProfile(userProfile) {
  const payload = {
    uid: userProfile.uid,
    email: userProfile.email,
    displayName: userProfile.displayName ?? null,
    photoURL: userProfile.photoURL ?? null,
    phone: userProfile.phone ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(getUserDocRef(userProfile.uid), payload);
  return payload;
}

/**
 * @param {string} uid
 * @returns {Promise<AppUserProfile|null>}
 */
export async function getUserProfile(uid) {
  const snapshot = await getDoc(getUserDocRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return /** @type {AppUserProfile} */ (snapshot.data());
}

/**
 * @param {string} uid
 * @param {Partial<Pick<AppUserProfile, "displayName" | "photoURL" | "phone" | "email">>} patch
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, patch) {
  const updatePayload = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(getUserDocRef(uid), updatePayload);
}
