import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Text,
  TouchableOpacity
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { collection, query, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";

import { db, auth } from "../services/firebase/firebaseApp";
import PropertyCard from "../components/property/PropertyCard";
import { Colors, Spacing } from "../styles/globalDesignSystem";

interface RentalItem {
  id: string;
  title: string;
  price: number;
  ratePeriod: string;
  images?: string[];
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function SavedItemsScreen() {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());
  
  const navigation = useNavigation<any>();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const savedRef = collection(db, "users", currentUserId, "savedItems");
    
    const unsubscribeSaved = onSnapshot(
      savedRef,
      async (snapshot) => {
        const ids = new Set<string>();
        snapshot.docs.forEach((d) => ids.add(d.id));
        setSavedPropertyIds(ids);

        const propertyPromises = snapshot.docs.map(async (savedDoc) => {
          const propertyId = savedDoc.id;
          const propRef = doc(db, "properties", propertyId);
          const propSnap = await getDoc(propRef);

          if (!propSnap.exists()) return null;
          const data = propSnap.data();

          const images = Array.isArray(data.images)
            ? data.images.filter((item): item is string => typeof item === "string" && item.length > 0)
            : [];

          const finalImagesArray = images.length > 0 
            ? images 
            : (typeof data.imageUri === "string" && data.imageUri.length > 0 ? [data.imageUri] : []);

          return {
            id: propSnap.id,
            title: data.title ?? "Untitled Item", 
            price: data.price ? Number(data.price) : 0, 
            ratePeriod: data.ratePeriod ?? "week", 
            images: finalImagesArray,
            userId: data.ownerUid, 
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as RentalItem;
        });

        const fetchedProperties = (await Promise.all(propertyPromises)).filter(
          (item): item is RentalItem => item !== null
        );

        setItems(fetchedProperties);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching saved listings: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribeSaved();
  }, [currentUserId]);

  const handleToggleFavorite = async (propertyId: string) => {
    if (!currentUserId) return;
    const favRef = doc(db, "users", currentUserId, "savedItems", propertyId);
    const isCurrentlySaved = savedPropertyIds.has(propertyId);

    // Remove immediately while the write is pending.
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
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Saved Items</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {items.length === 0 ? (
        <View style={[styles.container, styles.center]}>
          <Text style={styles.emptyText}>You haven't saved any items yet.</Text>
        </View>
      ) : (
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
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 16, 
    paddingBottom: Spacing.xs,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSpacer: {
    width: 24,
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
