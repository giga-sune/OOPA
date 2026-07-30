import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";
import { getSavedProperties } from "../../services/firestore/favoritesService";
import type { Property } from "../../types/property/propertyTypes";

export default function useSavedItemsViewModel() {
  const [savedProperties, setSavedProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const fetchSaved = useCallback(async () => {
    if (!currentUser) {
      setSavedProperties([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const items = await getSavedProperties(currentUser.uid);
      setSavedProperties(items);
    } catch (error) {
      console.error("Error fetching saved properties:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void fetchSaved();
  }, [fetchSaved]);

  return {
    savedProperties,
    loading,
    currentUserId: currentUser?.uid ?? null,
    refreshSaved: fetchSaved,
  };
}