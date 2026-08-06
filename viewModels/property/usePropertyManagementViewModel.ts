import { useState } from "react";
import { getAllProperties, deleteProperty } from "../../services/firestore/propertyService";
import type { Property } from "../../types/property/propertyTypes";

export interface PropertyManagementViewModelResult {
  properties: Property[];
  loading: boolean;
  error: string;
  loadProperties: () => Promise<void>;
  onDeleteListing: (propertyId: string) => Promise<boolean>;
}

export default function usePropertyManagementViewModel(): PropertyManagementViewModelResult {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const loadProperties = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAllProperties();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retrieve real estate listings.");
    } finally {
      setLoading(false);
    }
  };

  const onDeleteListing = async (propertyId: string): Promise<boolean> => {
    setLoading(true);
    setError("");
    try {
      await deleteProperty(propertyId);
      // Remove the item locally without another fetch.
      setProperties((prev) => prev.filter((p) => p.id !== propertyId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this listing.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    properties,
    loading,
    error,
    loadProperties,
    onDeleteListing,
  };
}

