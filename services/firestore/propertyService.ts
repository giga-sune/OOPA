import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/firebaseApp";
import type {
  CreatePropertyInput,
  ListingAllowance,
  LocationData,
  Property,
  PropertyFilters,
  UpdatePropertyInput,
} from "../../types/property/propertyTypes";

const PROPERTIES_COLLECTION = "properties";

const createListingCallable = httpsCallable<
  { listing: CreatePropertyInput },
  { propertyId: string }
>(functions, "createListing");

const deleteListingCallable = httpsCallable<
  { propertyId: string },
  { deleted: boolean }
>(functions, "deleteListing");

const updateListingCallable = httpsCallable<
  { propertyId: string; listing: CreatePropertyInput },
  { updated: boolean }
>(functions, "updateListing");

const getListingAllowanceCallable = httpsCallable<
  Record<string, never>,
  ListingAllowance
>(functions, "getListingAllowance");

type SearchKeywordSource = {
  title?: string;
  description?: string;
  brand?: string;
  condition?: string;
  priceType?: string;
  ratePeriod?: string;
  price?: number;
  location?: LocationData | null;
  city?: string;
  neighborhood?: string;
  priceRangeLabel?: string;
  propertyType?: string;
};

function toDate(value: unknown): Date {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }

  return new Date();
}

function normalizeSearchPhrase(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function hasActiveFilters(filters: PropertyFilters): boolean {
  return filters.condition !== null || filters.priceBand !== null || filters.priceType !== null;
}

function isMissingIndexError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "failed-precondition"
  );
}

function matchesPriceBand(price: number, priceBand: PropertyFilters["priceBand"]): boolean {
  if (priceBand === "under-50") {
    return price < 50;
  }

  if (priceBand === "50-to-150") {
    return price >= 50 && price <= 150;
  }

  if (priceBand === "150-plus") {
    return price > 150;
  }

  return true;
}

async function filterPropertiesWithLocalPriceFallback(
  filters: PropertyFilters,
  limitCount: number
): Promise<Property[]> {
  const fallbackConstraints: QueryConstraint[] = [];

  if (filters.condition) {
    fallbackConstraints.push(where("condition", "==", filters.condition));
  }

  if (filters.priceType) {
    fallbackConstraints.push(where("priceType", "==", filters.priceType));
  }

  const fallbackQuery = fallbackConstraints.length > 0
    ? query(collection(db, PROPERTIES_COLLECTION), ...fallbackConstraints)
    : query(collection(db, PROPERTIES_COLLECTION));

  const querySnapshot = await getDocs(fallbackQuery);

  return querySnapshot.docs
    .map((docSnap) => readProperty(docSnap.data(), docSnap.id))
    .filter((property) => matchesPriceBand(property.price, filters.priceBand))
    .slice(0, limitCount);
}

function appendSearchValue(searchKeywords: Set<string>, value: unknown): void {
  if (typeof value !== "string") return;

  const normalizedPhrase = normalizeSearchPhrase(value);
  if (!normalizedPhrase) return;

  searchKeywords.add(normalizedPhrase);

  normalizedPhrase
    .split(/[^a-z0-9]+/i)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((token) => {
      searchKeywords.add(token);
    });
}

function extractAddressSegment(address: string | undefined, segmentIndex: number): string {
  if (!address) {
    return "";
  }

  const segments = address
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return segments[segmentIndex] ?? "";
}

function buildSearchKeywords(source: SearchKeywordSource): string[] {
  const searchKeywords = new Set<string>();
  const locationAddress = source.location?.address;
  const derivedCity = source.city ?? extractAddressSegment(locationAddress, 1);
  const derivedNeighborhood = source.neighborhood ?? extractAddressSegment(locationAddress, 0);
  const derivedPriceRangeLabel = source.priceRangeLabel ?? (typeof source.price === "number" ? `$${source.price.toFixed(0)}` : "");
  const derivedPropertyType = source.propertyType ?? source.brand;

  appendSearchValue(searchKeywords, source.title);
  appendSearchValue(searchKeywords, source.description);
  appendSearchValue(searchKeywords, source.brand);
  appendSearchValue(searchKeywords, source.condition);
  appendSearchValue(searchKeywords, source.priceType);
  appendSearchValue(searchKeywords, source.ratePeriod);
  appendSearchValue(searchKeywords, derivedCity);
  appendSearchValue(searchKeywords, derivedNeighborhood);
  appendSearchValue(searchKeywords, derivedPriceRangeLabel);
  appendSearchValue(searchKeywords, derivedPropertyType);
  appendSearchValue(searchKeywords, locationAddress);

  if (typeof source.price === "number" && Number.isFinite(source.price)) {
    appendSearchValue(searchKeywords, String(source.price));
    appendSearchValue(searchKeywords, `$${source.price.toFixed(2)}`);
  }

  return Array.from(searchKeywords);
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

function readSearchKeywords(value: unknown, source: SearchKeywordSource): string[] {
  if (Array.isArray(value)) {
    const normalizedKeywords = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => normalizeSearchPhrase(item))
      .filter(Boolean);

    if (normalizedKeywords.length > 0) {
      return Array.from(new Set(normalizedKeywords));
    }
  }

  return buildSearchKeywords(source);
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
    condition: data.condition === "Like new" || data.condition === "Good" || data.condition === "Used" ? data.condition : "Used",
    priceType: data.priceType === "Fixed" || data.priceType === "Flexible" ? data.priceType : "Fixed",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    ratePeriod: data.ratePeriod === "week" || data.ratePeriod === "month"? data.ratePeriod: "month",
    location: readLocation(data.location),
    searchKeywords: readSearchKeywords(data.searchKeywords, data),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function createProperty(input: CreatePropertyInput): Promise<string> {
  const result = await createListingCallable({ listing: input });
  return result.data.propertyId;
}

export async function getAllProperties(): Promise<Property[]> {
  const querySnapshot = await getDocs(collection(db, PROPERTIES_COLLECTION));
  const properties: Property[] = [];

  querySnapshot.forEach((docSnap) => {
    properties.push(readProperty(docSnap.data(), docSnap.id));
  });

  return properties;
}

export async function searchProperties(searchTerm: string, limitCount: number = 20): Promise<Property[]> {
  const normalizedSearchTerm = normalizeSearchPhrase(searchTerm);

  if (!normalizedSearchTerm) {
    return [];
  }

  const searchQuery = query(
    collection(db, PROPERTIES_COLLECTION),
    where("searchKeywords", "array-contains", normalizedSearchTerm),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(searchQuery);

  return querySnapshot.docs.map((docSnap) => readProperty(docSnap.data(), docSnap.id));
}

export async function filterProperties(filters: PropertyFilters, limitCount: number = 20): Promise<Property[]> {
  if (!hasActiveFilters(filters)) {
    return [];
  }

  const constraints: QueryConstraint[] = [];

  if (filters.condition) {
    constraints.push(where("condition", "==", filters.condition));
  }

  if (filters.priceType) {
    constraints.push(where("priceType", "==", filters.priceType));
  }

  if (filters.priceBand === "under-50") {
    constraints.push(where("price", "<", 50));
  } else if (filters.priceBand === "50-to-150") {
    constraints.push(where("price", ">=", 50));
    constraints.push(where("price", "<=", 150));
  } else if (filters.priceBand === "150-plus") {
    constraints.push(where("price", ">", 150));
  }

  constraints.push(limit(limitCount));

  try {
    const filterQuery = query(collection(db, PROPERTIES_COLLECTION), ...constraints);
    const querySnapshot = await getDocs(filterQuery);

    return querySnapshot.docs.map((docSnap) => readProperty(docSnap.data(), docSnap.id));
  } catch (error) {
    const shouldUseLocalPriceFallback =
      isMissingIndexError(error) &&
      filters.priceBand !== null &&
      (filters.condition !== null || filters.priceType !== null);

    if (shouldUseLocalPriceFallback) {
      console.warn("Falling back to local price-band filtering because Firestore composite index is missing.");
      return filterPropertiesWithLocalPriceFallback(filters, limitCount);
    }

    throw error;
  }
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
  const existing = await getPropertyById(id);

  if (!existing) {
    throw new Error("This listing could not be found.");
  }

  await updateListingCallable({
    propertyId: id,
    listing: {
      ownerUid: existing.ownerUid,
      ownerEmail: existing.ownerEmail,
      ownerDisplayName: existing.ownerDisplayName,
      ownerPhotoURL: existing.ownerPhotoURL,
      images: input.images ?? existing.images,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      brand: input.brand ?? existing.brand,
      condition: input.condition ?? existing.condition,
      priceType: input.priceType ?? existing.priceType,
      price: input.price ?? existing.price,
      ratePeriod: input.ratePeriod ?? existing.ratePeriod,
      location: input.location ?? existing.location,
    },
  });
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteListingCallable({ propertyId: id });
}

export async function getListingAllowance(): Promise<ListingAllowance> {
  const result = await getListingAllowanceCallable({});
  return result.data;
}

export async function getUserProperties(ownerUid: string): Promise<Property[]> {
  try {
    const propertiesCollectionRef = collection(db, PROPERTIES_COLLECTION);
    
    const q = query(propertiesCollectionRef, where("ownerUid", "==", ownerUid));
    const querySnapshot = await getDocs(q);
    
    const userProperties: Property[] = [];
    
    querySnapshot.forEach((docSnap) => {
      userProperties.push(readProperty(docSnap.data(), docSnap.id));
    });
    
    return userProperties;
  } catch (error) {
    console.error("Error inside getUserProperties service handler:", error);
    throw error;
  }
}
