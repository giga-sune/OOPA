export type RentalRatePeriod = "week" | "month";

export type RentalAvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export type RentalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export interface Rental {
  id: string;
  propertyId: string;

  renterUid: string;
  renterDisplayName: string | null;

  ownerUid: string;
  ownerDisplayName: string | null;

  propertyTitle: string;
  propertyImageUrl: string | null;
  propertyRatePeriod: RentalRatePeriod;
  propertyPrice: number;

  startDate: Date;
  endDate: Date;
  totalUnits: number;
  totalPrice: number;

  message: string | null;
  status: RentalStatus;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRentalRequestInput {
  propertyId: string;
  renterUid: string;
  startDate: Date;
  endDate: Date;
  message: string | null;
}

export interface RentalApprovalResult {
  autoRejectedCount: number;
}
