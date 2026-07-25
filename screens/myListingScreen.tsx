import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  ActivityIndicator, 
  Text, 
  Alert,
  TouchableOpacity
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";

import { db, auth } from "../services/firebase/firebaseApp";
import { deleteProperty } from "../services/firestore/propertyService";
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

export default function MyListingsScreen() {
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigation = useNavigation<any>();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    console.log("Checking listings for user ID:", currentUserId);

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const itemsRef = collection(db, "properties");
    
    const q = query(
      itemsRef, 
      where("ownerUid", "==", currentUserId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedItems: RentalItem[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          // Fallback handlers matching your arrays layout setup
          const images = Array.isArray(data.images)
            ? data.images.filter((item): item is string => typeof item === "string" && item.length > 0)
            : [];

          const finalImagesArray = images.length > 0 
            ? images 
            : (typeof data.imageUri === "string" && data.imageUri.length > 0 ? [data.imageUri] : []);

          return {
            id: doc.id,
            title: data.title ?? "Untitled Item", 
            price: data.price ? Number(data.price) : 0, 
            ratePeriod: data.ratePeriod ?? "week", 
            images: finalImagesArray,
            userId: data.ownerUid, 
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          };
        });
        
        // Front-end side timeline sorting fallback structure
        const sortedItems = fetchedItems.sort((a, b) => {
          const timeA = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
          const timeB = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
          return timeA - timeB;
        });

        setItems(sortedItems);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching my live listings: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const handleDeleteListing = (id: string, title: string) => {
    Alert.alert(
      "Delete Listing",
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProperty(id);
            } catch (err) {
              console.error("Error deleting document from Firestore: ", err);
              Alert.alert("Error", "Could not remove listing. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleEditListing = (id: string) => {
    navigation.navigate("MainApp", {
      screen: "Post",
      params: { id: id, isEditing: true }
    });
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
      {/* Header Container Area Layout Layout */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Listings</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      {items.length === 0 ? (
        <View style={[styles.container, styles.center]}>
          <Text style={styles.emptyText}>You haven't posted any items for rent yet.</Text>
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
              onPress={() => {
                navigation.navigate("Details", { propertyId: item.id });
              }}
              showActions={true}
              onEdit={(id) => handleEditListing(id)}
              onDelete={(id) => handleDeleteListing(id, item.title)}
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
