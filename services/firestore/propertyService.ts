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
  LocationData,
} from "../../types/property/propertyTypes";
import { query, where } from "firebase/firestore";

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

// Safely parses nested location structure data objects out from database entries
function readLocation(locationData: unknown): LocationData | null {
  if (locationData && typeof locationData === "object") {
    const loc = locationData as Record<string, unknown>;
    if (
      typeof loc.address === "string" &&
      typeof loc.latitude === "number" &&
      typeof loc.longitude === "number"
    ) {
      return {
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
    }
  }
  return null;
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
    ratePeriod: data.ratePeriod === "week" || data.ratePeriod === "month" 
      ? data.ratePeriod 
      : "month",
    location: readLocation(data.location), //Returns parsed location object or null for older data.
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

export async function getUserProperties(ownerUid: string): Promise<Property[]> {
  try {
    const propertiesCollectionRef = collection(db, PROPERTIES_COLLECTION);
    
    // Create a firestore query matching the ownerUid field
    const q = query(propertiesCollectionRef, where("ownerUid", "==", ownerUid));
    const querySnapshot = await getDocs(q);
    
    const userProperties: Property[] = [];
    
    querySnapshot.forEach((docSnap) => {
      // Reuses your existing mapping function to clean and parse data uniformly
      userProperties.push(readProperty(docSnap.data(), docSnap.id));
    });
    
    return userProperties;
  } catch (error) {
    console.error("Error inside getUserProperties service handler:", error);
    throw error;
  }
}