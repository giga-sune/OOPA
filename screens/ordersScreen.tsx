import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

import OrderListItem from "../components/order/orderListItem";
import { db } from "../services/firebase/firebaseApp";
import { approveRentalRequest, rejectRentalRequest } from "../services/firestore/rentalService";
import { subscribeToOwnerPayments } from "../services/firestore/paymentService";
import type { Rental } from "../types/rental/rentalTypes";
import type { PaymentStatus } from "../types/payment/paymentTypes";

type TabState = "My Orders" | "Requests";

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabState>("My Orders");
  const [myOrders, setMyOrders] = useState<Rental[]>([]);
  const [requests, setRequests] = useState<Rental[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentsLoading, setPaymentsLoading] = useState<boolean>(true);
  const [paymentStatuses, setPaymentStatuses] = useState<
    Record<string, PaymentStatus>
  >({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setMyOrders([]);
        setRequests([]);
        setPaymentStatuses({});
        setPaymentsLoading(false);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    setPaymentsLoading(true);
    const rentalsRef = collection(db, "rentals"); 

    const myOrdersQuery = query(
      rentalsRef,
      where("renterUid", "==", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const requestsQuery = query(
      rentalsRef,
      where("ownerUid", "==", currentUser.uid), 
      orderBy("updatedAt", "desc")
    );

    const parseSnapshotDoc = (docSnap: any): Rental => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        propertyId: data.propertyId || "",
        renterUid: data.renterUid || "",
        renterDisplayName: data.renterDisplayName || null,
        ownerUid: data.ownerUid || "",
        ownerDisplayName: data.ownerDisplayName || null,
        propertyTitle: data.propertyTitle || "Unknown Rental Item",
        propertyImageUrl: data.propertyImageUrl || null,
        propertyRatePeriod: data.propertyRatePeriod || "month",
        propertyPrice: data.propertyPrice || 0,
        startDate: data.startDate ? data.startDate.toDate() : new Date(),
        endDate: data.endDate ? data.endDate.toDate() : new Date(),
        totalUnits: data.totalUnits || 0,
        totalPrice: data.totalPrice || 0,
        message: data.message || null,
        status: data.status || "pending",
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      };
    };

    const unsubscribeOrders = onSnapshot(myOrdersQuery, (snapshot) => {
      setMyOrders(snapshot.docs.map(parseSnapshotDoc));
      setLoading(false);
    }, () => setLoading(false));

    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
      setRequests(snapshot.docs.map(parseSnapshotDoc));
    });

    const unsubscribePayments = subscribeToOwnerPayments(
      currentUser.uid,
      (nextPaymentStatuses) => {
        setPaymentStatuses(nextPaymentStatuses);
        setPaymentsLoading(false);
      },
      () => {
        setPaymentsLoading(true);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeRequests();
      unsubscribePayments();
    };
  }, [currentUser]);

  const handleAcceptRequest = async (rentalId: string) => {
    try {
      await approveRentalRequest(rentalId);
      Alert.alert("Success", "Rental request has been approved.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to accept booking.");
    }
  };

  const handleDenyRequest = async (rentalId: string) => {
    try {
      await rejectRentalRequest(rentalId);
      Alert.alert("Declined", "The rental request has been rejected.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to decline booking.");
    }
  };

  const handleMessagePress = (item: Rental) => {
    if (!currentUser) return;

    const isOwner = item.ownerUid === currentUser.uid;
    const recipientUid = isOwner ? item.renterUid : item.ownerUid;
    const recipientName = (isOwner ? item.renterDisplayName : item.ownerDisplayName) || "User";

    navigation.navigate("ChatRoom", {
      rentalId: item.id,
      title: item.propertyTitle,
      recipientUid,
      recipientName,
    });
  };

  const handleReport = (item: Rental) => {
    navigation.navigate("ReportItemScreen", { 
      rental: {
        ...item,
        startDate: item.startDate instanceof Date ? item.startDate.toISOString() : item.startDate,
        endDate: item.endDate instanceof Date ? item.endDate.toISOString() : item.endDate,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
      }
    });
  };
  
  const handleReview = (item: Rental) => {
    navigation.navigate("ReviewItemScreen", { 
      rental: {
        ...item,
        startDate: item.startDate instanceof Date ? item.startDate.toISOString() : item.startDate,
        endDate: item.endDate instanceof Date ? item.endDate.toISOString() : item.endDate,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
      }
    });
  };

  const activeData = activeTab === "My Orders" ? myOrders : requests;

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

      {!currentUser ? (
        <View style={styles.centerLoading}>
          <Text style={styles.emptyText}>Please log in to track assignments.</Text>
        </View>
      ) : loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#FF7A21" />
        </View>
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => {
                if (activeTab === "Requests") {
                  navigation.navigate("LenderRequestDetailScreen", { rentalId: item.id });
                } else {
                  navigation.navigate("BorrowerOrderDetailScreen", { rentalId: item.id });
                }
              }}
            >
              <OrderListItem 
                item={item} 
                isIncomingRequest={activeTab === "Requests"}
                paymentStatus={paymentStatuses[item.id] ?? "unpaid"}
                isPaymentStatusLoading={activeTab === "Requests" && paymentsLoading}
                onAcceptPress={handleAcceptRequest}
                onDenyPress={handleDenyRequest}
                onReportPress={() => handleReport(item)}
                onReviewPress={() => handleReview(item)}
                onMessagePress={() => handleMessagePress(item)}
              />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {activeTab.toLowerCase()} entries found.</Text>
            </View>
          }
        />
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
});