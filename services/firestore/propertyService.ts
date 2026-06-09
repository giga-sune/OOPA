import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../firebase/firebaseApp";
import type {
  CreatePropertyInput,
  Property,
  UpdatePropertyInput,
} from "../../types/property/propertyTypes";

const PROPERTIES_COLLECTION = "properties";

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }

  return new Date();
}

function readImages(value: unknown, fallbackImageUri: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  if (typeof fallbackImageUri === "string" && fallbackImageUri.length > 0) {
    return [fallbackImageUri];
  }

  return [];
}

function readProperty(data: DocumentData, id: string): Property {
  return {
    id,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    ownerEmail: typeof data.ownerEmail === "string" ? data.ownerEmail : null,
    ownerDisplayName: typeof data.ownerDisplayName === "string" ? data.ownerDisplayName : null,
    ownerPhotoURL: typeof data.ownerPhotoURL === "string" ? data.ownerPhotoURL : null,
    images: readImages(data.images, data.imageUri),
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    brand: typeof data.brand === "string" ? data.brand : "",
    condition: data.condition === "Like new" || data.condition === "Good" || data.condition === "Used"
      ? data.condition
      : "Used",
    priceType: data.priceType === "Fixed" || data.priceType === "Flexible"
      ? data.priceType
      : "Fixed",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createProperty(input: CreatePropertyInput): Promise<string> {
  const docRef = await addDoc(collection(db, PROPERTIES_COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getAllProperties(): Promise<Property[]> {
  const querySnapshot = await getDocs(collection(db, PROPERTIES_COLLECTION));
  const properties: Property[] = [];

  querySnapshot.forEach((docSnap) => {
    properties.push(readProperty(docSnap.data(), docSnap.id));
  });

  return properties;
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const docRef = doc(db, PROPERTIES_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return readProperty(docSnap.data(), docSnap.id);
}

export async function updateProperty(id: string, input: UpdatePropertyInput): Promise<void> {
  const docRef = doc(db, PROPERTIES_COLLECTION, id);
  await updateDoc(docRef, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProperty(id: string): Promise<void> {
  const docRef = doc(db, PROPERTIES_COLLECTION, id);
  await deleteDoc(docRef);
}
