import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { filterProperties, searchProperties } from "../../services/firestore/propertyService";
import type {
  Property,
  PropertyCondition,
  PropertyFilters,
  PropertyPriceBand,
  PropertyPriceType,
} from "../../types/property/propertyTypes";

const SEARCH_DEBOUNCE_MS = 500;
const DEFAULT_FILTERS: PropertyFilters = {
  condition: null,
  priceBand: null,
  priceType: null,
};

type PropertyDiscoveryMode = "default" | "search" | "filter";

export interface PropertySearchViewModelResult {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  filters: PropertyFilters;
  setConditionFilter: (value: PropertyCondition | null) => void;
  setPriceBandFilter: (value: PropertyPriceBand | null) => void;
  setPriceTypeFilter: (value: PropertyPriceType | null) => void;
  clearFilters: () => void;
  results: Property[];
  loading: boolean;
  errorMessage: string | null;
  activeMode: PropertyDiscoveryMode;
}

function normalizeSearchQuery(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function hasActiveFilters(filters: PropertyFilters): boolean {
  return filters.condition !== null || filters.priceBand !== null || filters.priceType !== null;
}

function getQueryErrorMessage(error: unknown, context: "search" | "filter"): string {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "failed-precondition"
  ) {
    return context === "filter"
      ? "This filter combination needs a Firestore index before it can run."
      : "This search query needs a Firestore index before it can run.";
  }

  return context === "filter"
    ? "We could not apply these filters right now."
    : "We could not load search results right now.";
}

export default function usePropertySearchViewModel(): PropertySearchViewModelResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const normalizedQuery = normalizeSearchQuery(searchQuery);
  const activeMode: PropertyDiscoveryMode = normalizedQuery ? "search" : hasActiveFilters(filters) ? "filter" : "default";

  useEffect(() => {
    if (activeMode === "default") {
      setErrorMessage(null);
    }
  }, [activeMode]);

  useEffect(() => {
    let isActive = true;

    if (activeMode !== "search") {
      setResults([]);
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setErrorMessage(null);

    const debounceTimer = setTimeout(() => {
      const executeSearch = async () => {
        try {
          setResults([]);
          const fetchedResults = await searchProperties(normalizedQuery);

          if (!isActive) {
            return;
          }

          setResults(fetchedResults);
          setErrorMessage(null);
        } catch (error) {
          if (!isActive) {
            return;
          }

          setResults([]);
          setErrorMessage(getQueryErrorMessage(error, "search"));
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
  }, [activeMode, normalizedQuery]);

  useEffect(() => {
    let isActive = true;

    if (activeMode !== "filter") {
      return () => {
        isActive = false;
      };
    }

    setLoading(true);
    setErrorMessage(null);

    const executeFilter = async () => {
      try {
        setResults([]);
        const fetchedResults = await filterProperties(filters);

        if (!isActive) {
          return;
        }

        setResults(fetchedResults);
        setErrorMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setResults([]);
        setErrorMessage(getQueryErrorMessage(error, "filter"));
        console.error("Error filtering property listings: ", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void executeFilter();

    return () => {
      isActive = false;
    };
  }, [activeMode, filters]);

  const setConditionFilter = (value: PropertyCondition | null) => {
    setFilters((prev) => ({ ...prev, condition: value }));
  };

  const setPriceBandFilter = (value: PropertyPriceBand | null) => {
    setFilters((prev) => ({ ...prev, priceBand: value }));
  };

  const setPriceTypeFilter = (value: PropertyPriceType | null) => {
    setFilters((prev) => ({ ...prev, priceType: value }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setErrorMessage(null);
  };

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setConditionFilter,
    setPriceBandFilter,
    setPriceTypeFilter,
    clearFilters,
    results,
    loading,
    errorMessage,
    activeMode,
  };
}
