import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import {
  type AppUserProfile,
  type AppUserProfilePatch,
} from "../../types/user/userTypes";

const USERS_COLLECTION = "users";

type CreateUserProfileInput = {
  uid: string;
  email: string;
  userName?: string | null;
  photoURL?: string | null;
  profilePictureUrl?: string | null;
  phone?: string | null;
};

function getUserDocRef(uid: string) {
  return doc(db, USERS_COLLECTION, uid);
}

export async function createUserProfile(userProfile: CreateUserProfileInput): Promise<AppUserProfile> {
  const payload: AppUserProfile = {
    uid: userProfile.uid,
    email: userProfile.email.trim(),
    userName: userProfile.userName ?? null,
    photoURL: userProfile.photoURL ?? null,
    profilePictureUrl: userProfile.profilePictureUrl ?? null,
    phone: userProfile.phone ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(getUserDocRef(payload.uid), payload);
  return payload;
}

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  const snapshot = await getDoc(getUserDocRef(uid));

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as AppUserProfile;
}

export async function updateUserProfile(uid: string, patch: AppUserProfilePatch): Promise<void> {
  const updatePayload = {
    ...patch,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(getUserDocRef(uid), updatePayload);
}

export async function updateUserProfilePicture(
  uid: string,
  profilePictureUrl: string
): Promise<void> {
  await updateDoc(getUserDocRef(uid), {
    profilePictureUrl,
    updatedAt: serverTimestamp(),
  });
}