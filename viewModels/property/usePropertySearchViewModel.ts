import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { searchProperties } from "../../services/firestore/propertyService";
import type { Property } from "../../types/property/propertyTypes";

const SEARCH_DEBOUNCE_MS = 500;

export interface PropertySearchViewModelResult {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  results: Property[];
  loading: boolean;
}

function normalizeSearchQuery(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

export default function usePropertySearchViewModel(): PropertySearchViewModelResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    let isActive = true;

    if (!normalizedQuery) {
      setResults([]);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);

    const debounceTimer = setTimeout(() => {
      const executeSearch = async () => {
        try {
          setResults([]);
          const fetchedResults = await searchProperties(normalizedQuery);

          if (!isActive) {
            return;
          }

          setResults(fetchedResults);
        } catch (error) {
          if (!isActive) {
            return;
          }

          setResults([]);
          console.error("Error searching property listings: ", error);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      void executeSearch();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(debounceTimer);
    };
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    results,
    loading,
  };
}
