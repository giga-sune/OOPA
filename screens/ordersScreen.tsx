import React, { useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import OrderListItem, { type OrderData } from "../components/order/orderListItem";
import { Spacing } from "../styles/globalDesignSystem";

const MOCK_MY_ORDERS: OrderData[] = [
  {
    id: "1",
    title: "Medium Camping Tent",
    price: 11,
    ratePeriod: "month",
    startDate: "20/05/2026",
    endDate: "30/05/2026",
    status: "Pending...",
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400",
  },
  {
    id: "2",
    title: "Medium Camping Tent",
    price: 25,
    ratePeriod: "week",
    startDate: "20/05/2026",
    endDate: "30/05/2026",
    status: "Completed",
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400",
  },
  {
    id: "3",
    title: "Medium Camping Tent",
    price: 25,
    ratePeriod: "week",
    startDate: "20/05/2026",
    endDate: "30/05/2026",
    status: "Approved",
    imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400",
  },
];

const MOCK_REQUESTS: OrderData[] = [];

type TabState = "My Orders" | "Requests";

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabState>("My Orders");

  const handleReport = (id: string) => {
    console.log("Report form targeted item reference ID:", id);
  };

  const handleReview = (id: string) => {
    console.log("Review system execution mapping for item ID:", id);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topTabBar}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "My Orders" && styles.activeTabButton]}
          onPress={() => setActiveTab("My Orders")}
          activeOpacity={1}
        >
          <Text style={[styles.tabText, activeTab === "My Orders" && styles.activeTabText]}>
            My Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, activeTab === "Requests" && styles.activeTabButton]}
          onPress={() => setActiveTab("Requests")}
          activeOpacity={1}
        >
          <Text style={[styles.tabText, activeTab === "Requests" && styles.activeTabText]}>
            Requests
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "My Orders" ? MOCK_MY_ORDERS : MOCK_REQUESTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <OrderListItem 
            item={item} 
            onReportPress={handleReport}
            onReviewPress={handleReview}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {activeTab.toLowerCase()} entries right now.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "ios" ? 12 : 4, 
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  activeTabButton: {
    borderColor: "#FF7A21", 
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTabText: {
    color: "#0F172A", 
  },
  listContent: {
    paddingHorizontal: Spacing.lg || 16,
    paddingTop: Spacing.sm || 8,
    paddingBottom: 110,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
  },
});