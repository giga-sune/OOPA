import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import { getPropertyById } from "./propertyService";
import { getUserProfile } from "./userService";
import { sendNativePush } from "../notification/pushNotificationService";
import type {
  CreateRentalRequestInput,
  Rental,
  RentalRatePeriod,
  RentalStatus,
} from "../../types/rental/rentalTypes";

const RENTALS_COLLECTION = "rentals";
const NOTIFICATIONS_COLLECTION = "notifications";
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
  const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_IN_MS);

  if (ratePeriod === "week") {
    return Math.max(1, Math.ceil(durationInDays / 7));
  }

  return Math.max(1, Math.ceil(durationInDays / 30));
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

// CREATE RENTAL REQUEST (Creates a Pending Request & Notifies the Lender/Owner)
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
    totalPrice: property.price * totalUnits,
    message: getTrimmedOrNull(input.message),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // In-App Notification (Real-time center fetch)
  const callerName = renterDisplayName || "A borrower";
  try {
    await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
      recipientUid: property.ownerUid,
      type: "new_request",
      categoryLabel: "New Request",
      bodyText: `${callerName} requested to borrow your "${propertyTitle}".`,
      propertyImageUrl,
      createdAt: serverTimestamp(),
      read: false,
    });
  } catch (error) {
    console.error("Failed to generate checkout notification:", error);
  }

  // Lock-screen System Native Push Notification
  try {
    const ownerDoc = await getDoc(doc(db, "users", property.ownerUid));
    if (ownerDoc.exists()) {
      const ownerData = ownerDoc.data();
      if (ownerData?.expoPushToken) {
        await sendNativePush(
          ownerData.expoPushToken,
          "🎁 New Rental Request!",
          `${callerName} wants to borrow your "${propertyTitle}".`
        );
      }
    }
  } catch (pushError) {
    console.error("Failed to deliver native push request:", pushError);
  }

  return docRef.id;
}

export async function getRentalsByRenter(renterUid: string): Promise<Rental[]> {
  if (!renterUid.trim()) {
    return [];
  }

  const rentalsQuery = query(
    collection(db, RENTALS_COLLECTION),
    where("renterUid", "==", renterUid)
  );
  const querySnapshot = await getDocs(rentalsQuery);

  return sortRentalsByUpdatedAt(
    querySnapshot.docs.map((docSnap) => readRental(docSnap.data(), docSnap.id))
  );
}

export async function getRentalsByOwner(ownerUid: string): Promise<Rental[]> {
  if (!ownerUid.trim()) {
    return [];
  }

  const rentalsQuery = query(
    collection(db, RENTALS_COLLECTION),
    where("ownerUid", "==", ownerUid)
  );
  const querySnapshot = await getDocs(rentalsQuery);

  return sortRentalsByUpdatedAt(
    querySnapshot.docs.map((docSnap) => readRental(docSnap.data(), docSnap.id))
  );
}

// APPROVE RENTAL REQUEST (Approves, Notifies the Borrower, & Inits Chat Channel)
export async function approveRentalRequest(rentalId: string): Promise<void> {
  // Update status to approved in the rentals collection
  await updateRentalStatus(rentalId, "approved");

  try {
    const rentalSnap = await getDoc(doc(db, RENTALS_COLLECTION, rentalId));
    if (rentalSnap.exists()) {
      const rentalData = rentalSnap.data();
      const targetItemTitle = rentalData.propertyTitle || "your requested item";
      
      // In-App Notification Write
      await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        recipientUid: rentalData.renterUid,
        type: "request_approved",
        categoryLabel: "Rental Approved",
        bodyText: `Great news! Your request to borrow "${targetItemTitle}" has been approved.`,
        propertyImageUrl: rentalData.propertyImageUrl || null,
        createdAt: serverTimestamp(),
        read: false,
      });

      //Lock-screen System Native Push Notification
      const renterDoc = await getDoc(doc(db, "users", rentalData.renterUid));
      if (renterDoc.exists()) {
        const renterProfileData = renterDoc.data();
        if (renterProfileData?.expoPushToken) {
          await sendNativePush(
            renterProfileData.expoPushToken,
            "✅ Rental Approved!",
            `Great news! Your request for "${targetItemTitle}" has been approved.`
          );
        }
      }

      //AUTOMATICALLY INITIALIZE CHAT CHANNEL
      // Use setDoc with { merge: true } so it creates the document if it's missing,
      const CHATS_COLLECTION = "chats";
      await setDoc(doc(db, CHATS_COLLECTION, rentalId), {
        rentalId: rentalId,
        propertyId: rentalData.propertyId || "",
        propertyTitle: targetItemTitle,
        propertyImageUrl: rentalData.propertyImageUrl || null,
        renterUid: rentalData.renterUid,
        renterDisplayName: rentalData.renterDisplayName || "Borrower",
        ownerUid: rentalData.ownerUid,
        ownerDisplayName: rentalData.ownerDisplayName || "Lender",
        lastMessage: "System: Rental request approved! You can now message each other.",
        lastMessageTimestamp: serverTimestamp(),
        unreadBy: [rentalData.renterUid], // Alerts the borrower there's a new channel open
      }, { merge: true }); 
      
    }
  } catch (error) {
    console.error("Failed to generate approval notification or chat channels:", error);
  }
}

// REJECT RENTAL REQUEST (Rejects & Notifies the Borrower/Renter)
export async function rejectRentalRequest(rentalId: string): Promise<void> {
  await updateRentalStatus(rentalId, "rejected");

  try {
    const rentalSnap = await getDoc(doc(db, RENTALS_COLLECTION, rentalId));
    if (rentalSnap.exists()) {
      const rentalData = rentalSnap.data();
      const targetItemTitle = rentalData.propertyTitle || "your requested item";
      
      // In-App Notification Write
      await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
        recipientUid: rentalData.renterUid,
        type: "request_rejected",
        categoryLabel: "Rental Declined",
        bodyText: `Sorry, your request to borrow "${targetItemTitle}" was declined by the owner.`,
        propertyImageUrl: rentalData.propertyImageUrl || null,
        createdAt: serverTimestamp(),
        read: false,
      });

      // Lock-screen System Native Push Notification
      const renterDoc = await getDoc(doc(db, "users", rentalData.renterUid));
      if (renterDoc.exists()) {
        const renterProfileData = renterDoc.data();
        if (renterProfileData?.expoPushToken) {
          await sendNativePush(
            renterProfileData.expoPushToken,
            "❌ Rental Request Update",
            `Your request for "${targetItemTitle}" was declined.`
          );
        }
      }
    }
  } catch (error) {
    console.error("Failed to generate rejection notification routes:", error);
  }
}