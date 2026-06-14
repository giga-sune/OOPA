import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, Dimensions, ActivityIndicator, Text, TextInput } from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase/firebaseApp";
import Feather from "@expo/vector-icons/Feather";
import PropertyCard from "../components/property/PropertyCard";
import { Colors, Radius, Spacing } from "../styles/globalDesignSystem";
import usePropertySearchViewModel from "../viewModels/property/usePropertySearchViewModel";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

interface ListingItem {
  id: string;
  title: string;
  price: number;
  ratePeriod: string;
  imageUri?: string;
}

function mapSnapshotDocToListingItem(doc: { id: string; data: () => Record<string, unknown> }): ListingItem {
  const data = doc.data();
  const images = Array.isArray(data.images)
    ? data.images.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];

  return {
    id: doc.id,
    title: typeof data.title === "string" ? data.title : "Untitled Item",
    price: typeof data.price === "number" ? data.price : Number(data.price) || 0,
    ratePeriod: data.ratePeriod === "week" || data.ratePeriod === "month" ? data.ratePeriod : "week",
    imageUri: images[0] ?? (typeof data.imageUri === "string" ? data.imageUri : undefined),
  };
}

export default function HomeScreen() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { searchQuery, setSearchQuery, results, loading: searchLoading } = usePropertySearchViewModel();

  useEffect(() => {
    const itemsRef = collection(db, "properties");
    const q = query(itemsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
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
  const activeItems = isSearching ? results.map((item) => ({
    id: item.id,
    title: item.title,
    price: item.price,
    ratePeriod: item.ratePeriod,
    imageUri: item.images[0],
  })) : items;

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
            <View style={{ width: CARD_WIDTH }}>
              <PropertyCard
                title={item.title}
                price={item.price}
                ratePeriod={item.ratePeriod}
                imageUri={item.imageUri}
                onPress={() => console.log(`Selected item: ${item.title}`)}
              />
            </View>
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
