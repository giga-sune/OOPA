import React, { useState, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { View, StyleSheet, FlatList, Dimensions, ActivityIndicator, Text } from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase/firebaseApp";
import PropertyCard from "../components/property/PropertyCard";
import { Colors, Spacing } from "../styles/globalDesignSystem";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

interface RentalItem {
  id: string;
  title: string;
  price: number;
  ratePeriod: string;
  imageUri?: string;
}

export default function HomeScreen() {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<any>();

  useEffect(() => {

    const itemsRef = collection(db, "properties");
  
    const q = query(itemsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems: RentalItem[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const images = Array.isArray(data.images)
            ? data.images.filter((item): item is string => typeof item === "string" && item.length > 0)
            : [];

          return {
            id: doc.id,
            title: data.title ?? "Untitled Item", 
            price: data.price ? Number(data.price) : 0, 
            ratePeriod: data.ratePeriod ?? "week", 
            imageUri: images[0] ?? (typeof data.imageUri === "string" ? data.imageUri : undefined),
          };
        });
        
        setItems(fetchedItems);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching live database stream: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>No items available for rent right now.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
