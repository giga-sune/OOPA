import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase/firebaseApp";
import { getPropertyById } from "./propertyService";
import type { Property } from "../../types/property/propertyTypes";

const USERS_COLLECTION = "users";
const SAVED_ITEMS_SUBCOLLECTION = "savedItems";

/**
 * Toggles a property in the user's saved items subcollection.
 */
export async function toggleSaveProperty(userId: string, propertyId: string, isCurrentlySaved: boolean): Promise<boolean> {
  if (!userId || !propertyId) return isCurrentlySaved;

  const docRef = doc(db, USERS_COLLECTION, userId, SAVED_ITEMS_SUBCOLLECTION, propertyId);

  if (isCurrentlySaved) {
    await deleteDoc(docRef);
    return false;
  } else {
    await setDoc(docRef, {
      propertyId,
      createdAt: serverTimestamp(),
    });
    return true;
  }
}

/**
 * Subscribes to the user's saved item IDs for real-time heart icon updates.
 */
export function subscribeToSavedPropertyIds(
  userId: string,
  onChange: (savedIds: string[]) => void
): Unsubscribe {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  const colRef = collection(db, USERS_COLLECTION, userId, SAVED_ITEMS_SUBCOLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const ids = snapshot.docs.map((docSnap) => docSnap.id);
    onChange(ids);
  });
}

/**
 * Fetches all full property details for items saved by the user.
 */
export async function getSavedProperties(userId: string): Promise<Property[]> {
  if (!userId) return [];

  const colRef = collection(db, USERS_COLLECTION, userId, SAVED_ITEMS_SUBCOLLECTION);
  const snapshot = await getDocs(colRef);
  
  const propertyIds = snapshot.docs.map((docSnap) => docSnap.id);
  if (propertyIds.length === 0) return [];

  const propertyPromises = propertyIds.map((id) => getPropertyById(id));
  const properties = await Promise.all(propertyPromises);

  return properties.filter((p): p is Property => p !== null);
}