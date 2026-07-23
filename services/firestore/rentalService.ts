import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import { getPropertyById } from "./propertyService";
import { getUserProfile } from "./userService";
import type {
  CreateRentalRequestInput,
  Rental,
  RentalRatePeriod,
  RentalStatus,
} from "../../types/rental/rentalTypes";

const RENTALS_COLLECTION = "rentals";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function toDate(value: unknown): Date {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }

  return new Date();
}

function readRentalStatus(value: unknown): RentalStatus {
  return value === "approved" ||
    value === "rejected" ||
    value === "completed" ||
    value === "cancelled"
    ? value
    : "pending";
}

function readRentalRatePeriod(value: unknown): RentalRatePeriod {
  return value === "week" || value === "month" ? value : "month";
}

function readRental(data: DocumentData, id: string): Rental {
  return {
    id,
    propertyId: typeof data.propertyId === "string" ? data.propertyId : "",
    renterUid: typeof data.renterUid === "string" ? data.renterUid : "",
    renterDisplayName:
      typeof data.renterDisplayName === "string" ? data.renterDisplayName : null,
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    ownerDisplayName:
      typeof data.ownerDisplayName === "string" ? data.ownerDisplayName : null,
    propertyTitle: typeof data.propertyTitle === "string" ? data.propertyTitle : "",
    propertyImageUrl:
      typeof data.propertyImageUrl === "string" ? data.propertyImageUrl : null,
    propertyRatePeriod: readRentalRatePeriod(data.propertyRatePeriod),
    propertyPrice:
      typeof data.propertyPrice === "number"
        ? data.propertyPrice
        : Number(data.propertyPrice) || 0,
    startDate: toDate(data.startDate),
    endDate: toDate(data.endDate),
    totalUnits:
      typeof data.totalUnits === "number" ? data.totalUnits : Number(data.totalUnits) || 0,
    totalPrice:
      typeof data.totalPrice === "number" ? data.totalPrice : Number(data.totalPrice) || 0,
    message: typeof data.message === "string" ? data.message : null,
    status: readRentalStatus(data.status),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function getTrimmedOrNull(value: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function getDisplayName(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function validateCreateRentalRequestInput(input: CreateRentalRequestInput): void {
  if (!input.propertyId.trim()) {
    throw new Error("Property ID is required.");
  }

  if (!input.renterUid.trim()) {
    throw new Error("Renter ID is required.");
  }

  if (!(input.startDate instanceof Date) || Number.isNaN(input.startDate.getTime())) {
    throw new Error("A valid start date is required.");
  }

  if (!(input.endDate instanceof Date) || Number.isNaN(input.endDate.getTime())) {
    throw new Error("A valid end date is required.");
  }

  if (input.endDate.getTime() <= input.startDate.getTime()) {
    throw new Error("End date must be after start date.");
  }
}

function calculateTotalUnits(
  startDate: Date,
  endDate: Date,
  ratePeriod: RentalRatePeriod
): number {
  const startDay = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const endDay = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  const durationInDays = Math.ceil((endDay - startDay) / DAY_IN_MS);

  if (ratePeriod === "week") {
    return Math.max(1, Math.ceil(durationInDays / 7));
  }

  return Math.max(1, Math.ceil(durationInDays / 30));
}

export function calculateRentalTotalPrice(
  price: number,
  ratePeriod: RentalRatePeriod,
  startDate: Date,
  endDate: Date
): number {
  return price * calculateTotalUnits(startDate, endDate, ratePeriod);
}

function sortRentalsByUpdatedAt(rentals: Rental[]): Rental[] {
  return [...rentals].sort((firstRental, secondRental) => {
    return secondRental.updatedAt.getTime() - firstRental.updatedAt.getTime();
  });
}

async function updateRentalStatus(rentalId: string, status: RentalStatus): Promise<void> {
  if (!rentalId.trim()) {
    throw new Error("Rental ID is required.");
  }

  await updateDoc(doc(db, RENTALS_COLLECTION, rentalId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

// CREATE RENTAL REQUEST (trusted Functions create notifications after this write)
export async function createRentalRequest(
  input: CreateRentalRequestInput
): Promise<string> {
  validateCreateRentalRequestInput(input);

  const property = await getPropertyById(input.propertyId);

  if (!property) {
    throw new Error("The requested property could not be found.");
  }

  if (property.ownerUid === input.renterUid) {
    throw new Error("You cannot rent your own listing.");
  }

  const renterProfile = await getUserProfile(input.renterUid);
  const totalUnits = calculateTotalUnits(
    input.startDate,
    input.endDate,
    property.ratePeriod
  );

  const renterDisplayName = getDisplayName(renterProfile?.userName);
  const propertyTitle = property.title;
  const propertyImageUrl = property.images[0] ?? null;

  // Create the rental document in Firestore
  const docRef = await addDoc(collection(db, RENTALS_COLLECTION), {
    propertyId: property.id,
    renterUid: input.renterUid.trim(),
    renterDisplayName,
    ownerUid: property.ownerUid,
    ownerDisplayName: getDisplayName(property.ownerDisplayName),
    propertyTitle,
    propertyImageUrl,
    propertyRatePeriod: property.ratePeriod,
    propertyPrice: property.price,
    startDate: input.startDate,
    endDate: input.endDate,
    totalUnits,
    totalPrice: calculateRentalTotalPrice(
      property.price,
      property.ratePeriod,
      input.startDate,
      input.endDate
    ),
    message: getTrimmedOrNull(input.message),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export function subscribeToRental(
  rentalId: string,
  onChange: (rental: Rental | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!rentalId.trim()) {
    onChange(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, RENTALS_COLLECTION, rentalId),
    (snapshot) => {
      onChange(snapshot.exists() ? readRental(snapshot.data(), snapshot.id) : null);
    },
    (error) => onError?.(error)
  );
}

export function subscribeToRentalsByRenter(
  renterUid: string,
  onChange: (rentals: Rental[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!renterUid.trim()) {
    onChange([]);
    return () => undefined;
  }

  const rentalsQuery = query(
    collection(db, RENTALS_COLLECTION),
    where("renterUid", "==", renterUid)
  );
  return onSnapshot(
    rentalsQuery,
    (snapshot) => {
      onChange(
        sortRentalsByUpdatedAt(
          snapshot.docs.map((document) => readRental(document.data(), document.id))
        )
      );
    },
    (error) => onError?.(error)
  );
}

export function subscribeToRentalsByOwner(
  ownerUid: string,
  onChange: (rentals: Rental[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!ownerUid.trim()) {
    onChange([]);
    return () => undefined;
  }

  const rentalsQuery = query(
    collection(db, RENTALS_COLLECTION),
    where("ownerUid", "==", ownerUid)
  );
  return onSnapshot(
    rentalsQuery,
    (snapshot) => {
      onChange(
        sortRentalsByUpdatedAt(
          snapshot.docs.map((document) => readRental(document.data(), document.id))
        )
      );
    },
    (error) => onError?.(error)
  );
}

// APPROVE RENTAL REQUEST (trusted Functions create notification and chat)
export async function approveRentalRequest(rentalId: string): Promise<void> {
  await updateRentalStatus(rentalId, "approved");
}

// REJECT RENTAL REQUEST (trusted Functions create the notification)
export async function rejectRentalRequest(rentalId: string): Promise<void> {
  await updateRentalStatus(rentalId, "rejected");
}
