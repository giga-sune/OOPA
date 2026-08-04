import React from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import OrderListItem from "../components/order/orderListItem";
import useOrdersViewModel from "../viewModels/rental/useOrdersViewModel";
import type { Rental } from "../types/rental/rentalTypes";

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const {
    activeTab,
    setActiveTab,
    activeRentals,
    isAuthenticated,
    loading,
    errorMessage,
    getDecisionControls,
    approveRequest,
    rejectRequest,
    prepareChat,
  } = useOrdersViewModel();

  const handleAcceptRequest = async (rentalId: string) => {
    const outcome = await approveRequest(rentalId);
    if (outcome.status === "success") {
      const rejectionNote = outcome.autoRejectedCount > 0
        ? ` ${outcome.autoRejectedCount} overlapping pending request${outcome.autoRejectedCount === 1 ? " was" : "s were"} automatically declined.`
        : "";
      Alert.alert("Success", `Rental request has been approved.${rejectionNote}`);
    }
    else Alert.alert("Error", outcome.message);
  };

  const handleDenyRequest = async (rentalId: string) => {
    const outcome = await rejectRequest(rentalId);
    if (outcome.status === "success") Alert.alert("Declined", "The rental request has been rejected.");
    else Alert.alert("Error", outcome.message);
  };

  const handleMessagePress = async (item: Rental) => {
    const outcome = await prepareChat(item);
    if (outcome.status === "failure") {
      Alert.alert("Error", outcome.message);
      return;
    }

    navigation.navigate("ChatRoom", {
      rentalId: outcome.chat.rentalId,
      title: outcome.chat.title,
      recipientUid: outcome.chat.recipientUid,
      recipientName: outcome.chat.recipientName,
    });
  };

  const serializeRentalForNavigation = (item: Rental) => ({
    ...item,
    startDate: item.startDate.toISOString(),
    endDate: item.endDate.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  });

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "My Orders" && styles.activeTabButton]}
          onPress={() => setActiveTab("My Orders")}
          activeOpacity={1}
        >
          <Text style={[styles.tabText, activeTab === "My Orders" && styles.activeTabText]}>My Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "Requests" && styles.activeTabButton]}
          onPress={() => setActiveTab("Requests")}
          activeOpacity={1}
        >
          <Text style={[styles.tabText, activeTab === "Requests" && styles.activeTabText]}>Requests</Text>
        </TouchableOpacity>
      </View>

      {!isAuthenticated ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyText}>Please log in to track assignments.</Text>
        </View>
      ) : loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#FF7A21" />
        </View>
      ) : (
        <>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <FlatList
            data={activeRentals}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const controls = getDecisionControls(item);
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate(
                    activeTab === "Requests" ? "LenderRequestDetailScreen" : "BorrowerOrderDetailScreen",
                    { rentalId: item.id }
                  )}
                >
                  <OrderListItem
                    item={item}
                    isIncomingRequest={activeTab === "Requests"}
                    decisionProgress={controls.progress}
                    acceptDisabled={controls.acceptDisabled}
                    denyDisabled={controls.denyDisabled}
                    decisionLockMessage={controls.lockMessage}
                    onAcceptPress={(id) => void handleAcceptRequest(id)}
                    onDenyPress={(id) => void handleDenyRequest(id)}
                    onReportPress={() => navigation.navigate("ReportItemScreen", { rental: serializeRentalForNavigation(item) })}
                    onReviewPress={() => navigation.navigate("ReviewItemScreen", { rental: serializeRentalForNavigation(item) })}
                    onMessagePress={() => void handleMessagePress(item)}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No {activeTab.toLowerCase()} entries found.</Text>
              </View>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  topTabBar: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#ffffff" },
  tabButton: { flex: 1, alignItems: "center", paddingVertical: 14, borderBottomWidth: 2, borderColor: "transparent" },
  activeTabButton: { borderColor: "#FF7A21" },
  tabText: { fontSize: 16, fontWeight: "600", color: "#64748B" },
  activeTabText: { color: "#0F172A" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 110 },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, paddingTop: 80, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14, color: "#94A3B8" },
  errorText: { color: "#B91C1C", fontSize: 13, textAlign: "center", padding: 12 },
});
