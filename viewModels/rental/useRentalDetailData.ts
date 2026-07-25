import { useEffect, useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { getPropertyById } from "../../services/firestore/propertyService";
import { subscribeToRental } from "../../services/firestore/rentalService";
import type { LocationData } from "../../types/property/propertyTypes";
import type { Rental } from "../../types/rental/rentalTypes";
import type { AppUserProfile } from "../../types/user/userTypes";

export type RentalViewerRole = "owner" | "renter";

export interface RentalDetailDataResult {
  rental: Rental | null;
  counterpartyProfile: AppUserProfile | null;
  propertyLocation: LocationData | null;
  loading: boolean;
  errorMessage: string;
  isAuthorized: boolean;
}

function getSubscriptionError(error: Error): string {
  const code = (error as Error & { code?: string }).code;
  return code === "permission-denied"
    ? "You do not have access to this rental."
    : "Could not load the rental details.";
}

export default function useRentalDetailData(
  rentalId: string,
  viewerRole: RentalViewerRole
): RentalDetailDataResult {
  const { user } = useAuth();
  const [rental, setRental] = useState<Rental | null>(null);
  const [counterpartyProfile, setCounterpartyProfile] = useState<AppUserProfile | null>(null);
  const [propertyLocation, setPropertyLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isActive = true;
    let detailVersion = 0;
    setRental(null);
    setCounterpartyProfile(null);
    setPropertyLocation(null);
    setErrorMessage("");
    setIsAuthorized(false);
    setLoading(true);

    if (!rentalId.trim()) {
      setErrorMessage("Missing rental identification reference.");
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    if (!user?.uid) {
      setErrorMessage("You must be signed in to view this rental.");
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const unsubscribe = subscribeToRental(
      rentalId,
      (nextRental) => {
        if (!isActive) return;
        const currentVersion = ++detailVersion;

        if (!nextRental) {
          setRental(null);
          setErrorMessage("Rental details could not be located.");
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        const expectedViewerUid = viewerRole === "owner" ? nextRental.ownerUid : nextRental.renterUid;
        if (expectedViewerUid !== user.uid) {
          setRental(null);
          setErrorMessage("You do not have access to this rental view.");
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setRental(nextRental);
        setIsAuthorized(true);
        setErrorMessage("");

        void getPropertyById(nextRental.propertyId).then((property) => {
          if (!isActive || currentVersion !== detailVersion) return;
          setCounterpartyProfile(null);
          setPropertyLocation(property?.location ?? null);
          setLoading(false);
        }).catch(() => {
          if (!isActive || currentVersion !== detailVersion) return;
          setCounterpartyProfile(null);
          setPropertyLocation(null);
          setErrorMessage("The listing location is currently unavailable.");
          setLoading(false);
        });
      },
      (error) => {
        if (!isActive) return;
        setErrorMessage(getSubscriptionError(error));
        setRental(null);
        setIsAuthorized(false);
        setLoading(false);
      }
    );

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [rentalId, user?.uid, viewerRole]);

  return {
    rental,
    counterpartyProfile,
    propertyLocation,
    loading,
    errorMessage,
    isAuthorized,
  };
}
