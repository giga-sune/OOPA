import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Platform,
} from "react-native";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Feather from "@expo/vector-icons/Feather";

import PropertyCard from "../components/property/PropertyCard";
import { db, auth } from "../services/firebase/firebaseApp";
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

function mapSnapshotDocToListingItem(docSnap: { id: string; data: () => Record<string, unknown> }): ListingItem {
  const data = docSnap.data();

  return {
    id: docSnap.id,
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
  const [isFilterModalVisible, setIsFilterModalVisible] = useState<boolean>(false);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  const navigation = useNavigation<any>();
  const currentUser = auth.currentUser;

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

    const unsubscribeProperties = onSnapshot(
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

    let unsubscribeSaved = () => { };
    if (currentUser) {
      const savedRef = collection(db, "users", currentUser.uid, "savedItems");
      unsubscribeSaved = onSnapshot(
        savedRef,
        (snapshot) => {
          const ids = new Set<string>();
          snapshot.docs.forEach((d) => ids.add(d.id));
          setSavedPropertyIds(ids);
        },
        (error) => {
          console.error("Error fetching saved items stream: ", error);
        }
      );
    }

    return () => {
      unsubscribeProperties();
      unsubscribeSaved();
    };
  }, [currentUser]);

  const handleToggleFavorite = async (propertyId: string) => {
    if (!currentUser) return;
    const favRef = doc(db, "users", currentUser.uid, "savedItems", propertyId);
    const isCurrentlySaved = savedPropertyIds.has(propertyId);

    // Update immediately, then roll back if persistence fails.
    setSavedPropertyIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlySaved) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });

    try {
      if (isCurrentlySaved) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, { propertyId, createdAt: serverTimestamp() });
      }
    } catch (err) {
      console.error("Failed to sync favorite state with Firestore:", err);
      setSavedPropertyIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) {
          next.add(propertyId);
        } else {
          next.delete(propertyId);
        }
        return next;
      });
    }
  };

  const filtersActive = hasActiveFilters(filters);
  const isSearching = activeMode === "search";
  const isFiltering = activeMode === "filter";
  const activeItems = activeMode === "default" ? items : results.map(mapPropertyToListingItem);

  const activeFilterCount = [
    filters.condition ? 1 : 0,
    filters.priceBand ? 1 : 0,
    filters.priceType ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const toggleConditionFilter = (value: PropertyCondition) => {
    setConditionFilter(filters.condition === value ? null : value);
  };

  const togglePriceBandFilter = (value: PropertyPriceBand) => {
    setPriceBandFilter(filters.priceBand === value ? null : value);
  };

  const togglePriceTypeFilter = (value: PropertyPriceType) => {
    setPriceTypeFilter(filters.priceType === value ? null : value);
  };

  const showInitialLoadingSpinner = loading || items.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
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

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.8}
          >
            <Feather name="bell" size={18} color={Colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterToggleButton,
              activeFilterCount > 0 && styles.filterToggleButtonActive,
            ]}
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Feather
              name="filter"
              size={18}
              color={activeFilterCount > 0 ? "#FFFFFF" : Colors.text}
            />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {isSearching && filtersActive ? (
          <Text style={styles.filterNotice}>Filters paused while searching.</Text>
        ) : null}
      </View>

      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissTap}
            activeOpacity={1}
            onPress={() => setIsFilterModalVisible(false)}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              {filtersActive && (
                <TouchableOpacity onPress={clearFilters} activeOpacity={0.7}>
                  <Text style={styles.modalClearText}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollBody}>
              <Text style={styles.filterSectionHeading}>Condition</Text>
              <View style={styles.chipGroup}>
                {CONDITION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterChip, filters.condition === option.value && styles.filterChipActive]}
                    onPress={() => toggleConditionFilter(option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, filters.condition === option.value && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionHeading}>Price Range</Text>
              <View style={styles.chipGroup}>
                {PRICE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterChip, filters.priceBand === option.value && styles.filterChipActive]}
                    onPress={() => togglePriceBandFilter(option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, filters.priceBand === option.value && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterSectionHeading}>Price Type</Text>
              <View style={styles.chipGroup}>
                {PRICE_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.filterChip, filters.priceType === option.value && styles.filterChipActive]}
                    onPress={() => togglePriceTypeFilter(option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, filters.priceType === option.value && styles.filterChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <SafeAreaView style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneButton}
                activeOpacity={0.9}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {showInitialLoadingSpinner && !isSearching ? (
        activeMode === "default" ? (
          <View style={[styles.stateContainer, styles.center]}>
            <ActivityIndicator size="large" color="#FF7A21" />
          </View>
        ) : discoveryLoading ? (
          <View style={[styles.stateContainer, styles.center]}>
            <ActivityIndicator size="large" color="#FF7A21" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : null
      ) : activeMode !== "default" && discoveryLoading ? (
        <View style={[styles.stateContainer, styles.center]}>
          <ActivityIndicator size="large" color="#FF7A21" />
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
              isFavorited={savedPropertyIds.has(item.id)}
              onToggleFavorite={handleToggleFavorite}
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBar: {
    flex: 1,
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
  filterToggleButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill || 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white || "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterToggleButtonActive: {
    backgroundColor: "#FF7A21",
    borderColor: "#FF7A21",
  },
  filterBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  filterBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  filterNotice: {
    marginTop: Spacing.sm,
    color: Colors.subText,
    fontSize: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalDismissTap: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingTop: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalClearText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  modalScrollBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  filterSectionHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  chipGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    borderRadius: Radius.pill || 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChipActive: {
    borderColor: "#FF7A21",
    backgroundColor: "#FFF5ED",
  },
  filterChipText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FF7A21",
    fontWeight: "600",
  },
  modalFooter: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? 34 : Spacing.lg,
  },
  doneButton: {
    backgroundColor: "#FF7A21",
    borderRadius: Radius.pill || 24,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.lg || 16,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  rowWrapper: {
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill || 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white || "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
