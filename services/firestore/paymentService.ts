import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "../firebase/firebaseApp";
import type { Payment, PaymentStatus } from "../../types/payment/paymentTypes";

const PAYMENTS_COLLECTION = "payments";

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

function toNullableDate(value: unknown): Date | null {
  return value == null ? null : toDate(value);
}

function readPaymentStatus(value: unknown): PaymentStatus {
  return value === "processing" || value === "paid" ? value : "unpaid";
}

function readPayment(data: DocumentData, id: string): Payment {
  return {
    id,
    rentalId: typeof data.rentalId === "string" ? data.rentalId : id,
    propertyId: typeof data.propertyId === "string" ? data.propertyId : "",
    renterUid: typeof data.renterUid === "string" ? data.renterUid : "",
    ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
    amountInCents:
      typeof data.amountInCents === "number" ? data.amountInCents : 0,
    currency: "cad",
    provider: "stripe",
    stripePaymentIntentId:
      typeof data.stripePaymentIntentId === "string"
        ? data.stripePaymentIntentId
        : "",
    attemptNumber:
      typeof data.attemptNumber === "number" ? data.attemptNumber : 1,
    status: readPaymentStatus(data.status),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    paidAt: toNullableDate(data.paidAt),
  };
}

export function subscribeToPayment(
  rentalId: string,
  onChange: (payment: Payment | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!rentalId.trim()) {
    onChange(null);
    return () => undefined;
  }

  return onSnapshot(
    doc(db, PAYMENTS_COLLECTION, rentalId),
    (snapshot) => {
      onChange(snapshot.exists() ? readPayment(snapshot.data(), snapshot.id) : null);
    },
    (error) => onError?.(error)
  );
}

export function subscribeToOwnerPayments(
  ownerUid: string,
  onChange: (paymentsByRentalId: Record<string, PaymentStatus>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!ownerUid.trim()) {
    onChange({});
    return () => undefined;
  }

  const paymentsQuery = query(
    collection(db, PAYMENTS_COLLECTION),
    where("ownerUid", "==", ownerUid)
  );

  return onSnapshot(
    paymentsQuery,
    (snapshot) => {
      const nextStatuses: Record<string, PaymentStatus> = {};

      snapshot.forEach((paymentSnapshot) => {
        const payment = readPayment(paymentSnapshot.data(), paymentSnapshot.id);
        nextStatuses[payment.rentalId] = payment.status;
      });

      onChange(nextStatuses);
    },
    (error) => onError?.(error)
  );
}

