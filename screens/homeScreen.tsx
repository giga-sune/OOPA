import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import Feather from "@expo/vector-icons/Feather";

import PropertyCard from "../components/property/PropertyCard";
import { db } from "../services/firebase/firebaseApp";
import { Colors, Radius, Spacing } from "../styles/globalDesignSystem";
import type {
  Property,
  PropertyCondition,
  PropertyFilters,
  PropertyPriceBand,
  PropertyPriceType,
} from "../types/property/propertyTypes";
import usePropertySearchViewModel from "../viewModels/property/usePropertySearchViewModel";

type ListingItem = Pick<Property, "id" | "title" | "price" | "ratePeriod" | "images">;
type FilterChipOption<T extends string> = {
  label: string;
  value: T;
};

const CONDITION_OPTIONS: FilterChipOption<PropertyCondition>[] = [
  { label: "Like new", value: "Like new" },
  { label: "Good", value: "Good" },
  { label: "Used", value: "Used" },
];

const PRICE_OPTIONS: FilterChipOption<PropertyPriceBand>[] = [
  { label: "Under 50", value: "under-50" },
  { label: "50-150", value: "50-to-150" },
  { label: "150+", value: "150-plus" },
];

const PRICE_TYPE_OPTIONS: FilterChipOption<PropertyPriceType>[] = [
  { label: "Fixed", value: "Fixed" },
  { label: "Flexible", value: "Flexible" },
];

function getNormalizedImages(data: Record<string, unknown>): string[] {
  const images = Array.isArray(data.images)
    ? data.images.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  if (images.length > 0) {
    return images;
  }

  return typeof data.imageUri === "string" && data.imageUri.length > 0 ? [data.imageUri] : [];
}

function mapSnapshotDocToListingItem(doc: { id: string; data: () => Record<string, unknown> }): ListingItem {
  const data = doc.data();

  return {
    id: doc.id,
    title: typeof data.title === "string" ? data.title : "Untitled Item",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    ratePeriod: data.ratePeriod === "week" || data.ratePeriod === "month" ? data.ratePeriod : "week",
    images: getNormalizedImages(data),
  };
}

function mapPropertyToListingItem(property: Property): ListingItem {
  return {
    id: property.id,
    title: property.title,
    price: property.price,
    ratePeriod: property.ratePeriod,
    images: property.images,
  };
}

function hasActiveFilters(filters: PropertyFilters): boolean {
  return filters.condition !== null || filters.priceBand !== null || filters.priceType !== null;
}

export default function HomeScreen() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<any>();
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setConditionFilter,
    setPriceBandFilter,
    setPriceTypeFilter,
    clearFilters,
    results,
    loading: discoveryLoading,
    errorMessage,
    activeMode,
  } = usePropertySearchViewModel();

  useEffect(() => {
    const itemsRef = collection(db, "properties");
    const itemsQuery = query(itemsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        setItems(snapshot.docs.map((docSnap) => mapSnapshotDocToListingItem(docSnap)));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching live database stream: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filtersActive = hasActiveFilters(filters);
  const isSearching = activeMode === "search";
  const isFiltering = activeMode === "filter";
  const activeItems = activeMode === "default" ? items : results.map(mapPropertyToListingItem);

  const toggleConditionFilter = (value: PropertyCondition) => {
    setConditionFilter(filters.condition === value ? null : value);
  };

  const togglePriceBandFilter = (value: PropertyPriceBand) => {
    setPriceBandFilter(filters.priceBand === value ? null : value);
  };

  const togglePriceTypeFilter = (value: PropertyPriceType) => {
    setPriceTypeFilter(filters.priceType === value ? null : value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={Colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search properties..."
            placeholderTextColor={Colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.filterHeading}>Quick filters</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <Text style={styles.filterGroupLabel}>Condition</Text>
          {CONDITION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, filters.condition === option.value && styles.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => toggleConditionFilter(option.value)}
            >
              <Text style={[styles.filterChipText, filters.condition === option.value && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.filterGroupLabel}>Price</Text>
          {PRICE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, filters.priceBand === option.value && styles.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => togglePriceBandFilter(option.value)}
            >
              <Text style={[styles.filterChipText, filters.priceBand === option.value && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.filterGroupLabel}>Type</Text>
          {PRICE_TYPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterChip, filters.priceType === option.value && styles.filterChipActive]}
              activeOpacity={0.8}
              onPress={() => togglePriceTypeFilter(option.value)}
            >
              <Text style={[styles.filterChipText, filters.priceType === option.value && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          {filtersActive ? (
            <TouchableOpacity style={styles.clearChip} activeOpacity={0.8} onPress={clearFilters}>
              <Text style={styles.clearChipText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {isSearching && filtersActive ? (
          <Text style={styles.filterNotice}>Filters paused while searching.</Text>
        ) : null}
      </View>

      {loading && activeMode === "default" ? (
        <View style={[styles.stateContainer, styles.center]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : activeMode !== "default" && discoveryLoading ? (
        <View style={[styles.stateContainer, styles.center]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : errorMessage ? (
        <View style={[styles.stateContainer, styles.center]}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : isSearching && activeItems.length === 0 ? (
        <View style={[styles.stateContainer, styles.center]}>
          <Text style={styles.emptyText}>No matching properties found.</Text>
        </View>
      ) : isFiltering && activeItems.length === 0 ? (
        <View style={[styles.stateContainer, styles.center]}>
          <Text style={styles.emptyText}>No properties match these filters.</Text>
        </View>
      ) : activeItems.length === 0 ? (
        <View style={[styles.stateContainer, styles.center]}>
          <Text style={styles.emptyText}>No items available for rent right now.</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={activeItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.rowWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onPress={() => {
                navigation.navigate("Details", { propertyId: item.id });
              }}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: Colors.text,
    fontSize: 15,
  },
  filterHeading: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    color: Colors.subText,
    fontSize: 13,
    fontWeight: "600",
  },
  filtersRow: {
    alignItems: "center",
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  filterGroupLabel: {
    color: Colors.subText,
    fontSize: 12,
    fontWeight: "600",
  },
  filterChip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white || "#FFFFFF",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EEF6FF",
  },
  filterChipText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: Colors.primary,
  },
  clearChip: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  clearChipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  filterNotice: {
    marginTop: Spacing.sm,
    color: Colors.subText,
    fontSize: 12,
  },
  loadingText: {
    marginTop: Spacing.sm,
    color: Colors.subText,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 100,
  },
  rowWrapper: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
});
