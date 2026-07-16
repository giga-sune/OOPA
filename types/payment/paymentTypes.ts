export type PaymentStatus = "unpaid" | "processing" | "paid";

export interface Payment {
  id: string;
  rentalId: string;
  propertyId: string;
  renterUid: string;
  ownerUid: string;
  amountInCents: number;
  currency: "cad";
  provider: "stripe";
  stripePaymentIntentId: string;
  attemptNumber: number;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
}

export interface CreatePaymentIntentResult {
  clientSecret: string;
  paymentStatus: PaymentStatus;
}

