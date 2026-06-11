import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";

import { getUserProperties } from "../services/firestore/propertyService";
import PropertyCard from "../components/property/PropertyCard";
import { Colors, Typography, Spacing } from "../styles/globalDesignSystem";

export default function MyListingsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyListings() {
      if (!user?.uid) return;
      try {
        setLoading(true);
        // Query Firestore for listings where ownerUid === user.uid
        const userItems = await getUserProperties(user.uid);
        setListings(userItems);
      } catch (error) {
        console.error("Error fetching user listings:", error);
      } finally {
        setLoading(false);
      }
    }

    void fetchMyListings();
  }, [user?.uid]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary || "#FF7A21"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header matching the screenshot navigation style */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listing</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Grid List using our reused PropertyCard */}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PropertyCard
            property={item}
            onPress={() => navigation.navigate("Details", { propertyId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="package" size={48} color="#94A3B8" />
            <Text style={styles.emptyText}>You haven't posted any items yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white || "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md || 16,
    paddingTop: Spacing.md || 16, 
    paddingBottom: Spacing.md || 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  listContent: {
    paddingHorizontal: Spacing.lg || 16,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: "space-between",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    fontWeight: "500",
  },
});