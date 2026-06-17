import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TextInput } from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import Feather from "@expo/vector-icons/Feather";

import PropertyCard from "../components/property/PropertyCard";
import { db } from "../services/firebase/firebaseApp";
import { Colors, Radius, Spacing } from "../styles/globalDesignSystem";
import type { Property } from "../types/property/propertyTypes";
import usePropertySearchViewModel from "../viewModels/property/usePropertySearchViewModel";

type ListingItem = Pick<Property, "id" | "title" | "price" | "ratePeriod" | "images">;

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

export default function HomeScreen() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<any>();
  const { searchQuery, setSearchQuery, results, loading: searchLoading } = usePropertySearchViewModel();

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

  const isSearching = searchQuery.trim().length > 0;
  const activeItems = isSearching ? results.map(mapPropertyToListingItem) : items;

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
      </View>

      {loading && !isSearching ? (
        <View style={[styles.stateContainer, styles.center]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      ) : isSearching && searchLoading ? (
        <View style={[styles.stateContainer, styles.center]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : isSearching && activeItems.length === 0 ? (
        <View style={[styles.stateContainer, styles.center]}>
          <Text style={styles.emptyText}>No matching properties found.</Text>
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
