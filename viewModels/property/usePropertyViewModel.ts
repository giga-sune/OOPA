import { useState } from "react";

import { createProperty } from "../../services/firestore/propertyService";
import type {
  CreatePropertyInput,
  PropertyCondition,
  PropertyPriceType,
} from "../../types/property/propertyTypes";

const VALID_CONDITIONS: PropertyCondition[] = ["Like new", "Good", "Used"];
const VALID_PRICE_TYPES: PropertyPriceType[] = ["Fixed", "Flexible"];

export interface PublishPropertyInput
  extends Omit<CreatePropertyInput, "condition" | "priceType"> {
  condition: PropertyCondition | null;
  priceType: PropertyPriceType | null;
}

export interface PropertyViewModelResult {
  publishProperty: (input: PublishPropertyInput) => Promise<boolean>;
  loading: boolean;
  error: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}

function validatePublishInput(input: PublishPropertyInput): string {
  if (!input.ownerUid.trim()) {
    return "You must be signed in to publish a listing.";
  }

  if (!input.title.trim()) {
    return "Title is required.";
  }

  if (!input.description.trim()) {
    return "Description is required.";
  }

  if (!input.brand.trim()) {
    return "Brand is required.";
  }

  if (input.condition === null || !VALID_CONDITIONS.includes(input.condition)) {
    return "Please choose a valid condition.";
  }

  if (input.priceType === null || !VALID_PRICE_TYPES.includes(input.priceType)) {
    return "Please choose a valid price type.";
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    return "Enter a valid price.";
  }

  return "";
}

export default function usePropertyViewModel(): PropertyViewModelResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const publishProperty = async (input: PublishPropertyInput): Promise<boolean> => {
    const validationError = validatePublishInput(input);
    setError(validationError);

    if (validationError) {
      return false;
    }

    setError("");
    setLoading(true);

    try {
      const sanitizedInput: CreatePropertyInput = {
        ownerUid: input.ownerUid,
        ownerEmail: input.ownerEmail,
        ownerDisplayName: input.ownerDisplayName,
        ownerPhotoURL: input.ownerPhotoURL,
        title: input.title.trim(),
        description: input.description.trim(),
        brand: input.brand.trim(),
        condition: input.condition as PropertyCondition,
        priceType: input.priceType as PropertyPriceType,
        price: input.price,
      };

      await createProperty(sanitizedInput);

      return true;
    } catch (serviceError) {
      setError(
        getErrorMessage(serviceError, "Could not publish this listing. Please try again.")
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    publishProperty,
    loading,
    error,
  };
}
