import React from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import useOwnerRentalDetailViewModel from "../viewModels/rental/useOwnerRentalDetailViewModel";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LenderRequestDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "LenderRequestDetailScreen">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    rental,
    counterpartyProfile: renterProfile,
    propertyLocation,
    loading,
    errorMessage,
    paymentStatus,
    isPaymentLoading,
    paymentStatusError,
    decisionProgress,
    currentStatus,
    acceptDisabled,
    denyDisabled,
    updateStatus,
    prepareChat,
  } = useOwnerRentalDetailViewModel(route.params?.rentalId ?? "");

  const handleStatusUpdate = async (nextStatus: "approved" | "rejected") => {
    const outcome = await updateStatus(nextStatus);
    const rejectionNote = outcome.status === "success" && outcome.autoRejectedCount > 0
      ? ` ${outcome.autoRejectedCount} overlapping pending request${outcome.autoRejectedCount === 1 ? " was" : "s were"} automatically declined.`
      : "";
    Alert.alert(
      outcome.status === "success" ? "Success" : "Error",
      outcome.status === "success" ? `Request has been ${nextStatus}.${rejectionNote}` : outcome.message
    );
  };

  const handleMessagePress = async () => {
    const outcome = await prepareChat();
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

  if (loading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#FF7A21" /></View>;
  }

  if (!rental) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
        </View>
        <View style={styles.centerContainer}><Text style={styles.errorText}>{errorMessage}</Text></View>
      </SafeAreaView>
    );
  }

  const isRejected = currentStatus === "rejected";
  const renterName = renterProfile?.userName || rental.renterDisplayName || "Renter";
  const avatar = renterProfile?.profilePictureUrl || renterProfile?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(renterName)}&background=E2E8F0&color=64748B`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <View style={styles.itemOverviewContainer}>
          <Image source={{ uri: rental.propertyImageUrl || "https://placeholder.pics/svg/120" }} style={styles.itemImage} />
          <View style={styles.itemDetailsText}>
            <Text style={styles.priceText}>${rental.propertyPrice}/{rental.propertyRatePeriod}</Text>
            <Text style={styles.itemTitle}>{rental.propertyTitle || "Item Details"}</Text>
            <View style={[styles.statusBadge, currentStatus === "approved" ? styles.approvedBadge : isRejected ? styles.rejectedBadge : styles.pendingBadge]}>
              <Text style={[styles.statusText, currentStatus === "approved" ? styles.approvedText : isRejected ? styles.rejectedText : styles.pendingText]}>
                {currentStatus === "approved" ? "Approved" : isRejected ? "Rejected" : "Pending"}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Request From</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
            <View style={styles.profileMeta}>
              <Text style={styles.renterName}>{renterName}</Text>
              <View style={styles.inlineDateContainer}>
                <Feather name="calendar" size={14} color="#64748B" style={styles.inlineCalendarIcon} />
                <Text style={styles.timelineText}>{formatDate(rental.startDate)} to {formatDate(rental.endDate)}</Text>
              </View>
            </View>
          </View>
          {rental.message ? <Text style={styles.messageContentText}>{rental.message}</Text> : null}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.denyButton, denyDisabled && styles.decisionButtonDisabled]} onPress={() => void handleStatusUpdate("rejected")} disabled={denyDisabled}>
              <Text style={styles.denyButtonText}>{decisionProgress === "rejecting" ? "Declining..." : "Deny"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approveButton, acceptDisabled && styles.decisionButtonDisabled]} onPress={() => void handleStatusUpdate("approved")} disabled={acceptDisabled}>
              {decisionProgress === "approving" ? <ActivityIndicator color="#FFF" /> : <Text style={styles.approveButtonText}>Accept</Text>}
            </TouchableOpacity>
          </View>
          {paymentStatus === "paid" ? <Text style={styles.paymentLockText}>This request is locked because the rental has been paid.</Text> : null}
          {paymentStatus === "processing" ? <Text style={styles.paymentLockText}>This request is locked while payment is processing.</Text> : null}
          {paymentStatusError ? <Text style={styles.paymentLockError}>{paymentStatusError}</Text> : null}
          {isPaymentLoading ? <Text style={styles.paymentLockText}>Verifying payment status…</Text> : null}
          {currentStatus === "approved" ? (
            <TouchableOpacity style={styles.messageButton} onPress={() => void handleMessagePress()} activeOpacity={0.8}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Where to meet</Text>
        {propertyLocation ? (
          <>
            <Text style={styles.locationAddress}>{propertyLocation.address}</Text>
            <View style={styles.mapCardWrapper}>
              <MapView style={StyleSheet.absoluteFillObject} region={{ latitude: propertyLocation.latitude, longitude: propertyLocation.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }} scrollEnabled={false} zoomEnabled>
                <Marker coordinate={{ latitude: propertyLocation.latitude, longitude: propertyLocation.longitude }} title={propertyLocation.address} pinColor="#FF7A21" />
              </MapView>
            </View>
          </>
        ) : (
          <View style={styles.locationUnavailable}><Text style={styles.locationUnavailableText}>Meetup location unavailable</Text></View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF", padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56, gap: 4 },
  backButton: { paddingVertical: 4, paddingRight: 8 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  errorText: { color: "#B91C1C", fontSize: 14, textAlign: "center", marginBottom: 12 },
  itemOverviewContainer: { flexDirection: "row", marginBottom: 24, gap: 16, alignItems: "center" },
  itemImage: { width: 110, height: 100, borderRadius: 16, backgroundColor: "#F8FAFC", resizeMode: "cover" },
  itemDetailsText: { flex: 1, justifyContent: "center" },
  priceText: { fontSize: 20, fontWeight: "700", color: "#000000" },
  itemTitle: { fontSize: 15, color: "#64748B", marginTop: 2, marginBottom: 8 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  approvedBadge: { backgroundColor: "#F0FDF4" }, rejectedBadge: { backgroundColor: "#F1F5F9" }, pendingBadge: { backgroundColor: "#F1F5F9" },
  statusText: { fontSize: 12, fontWeight: "600" }, approvedText: { color: "#166534" }, rejectedText: { color: "#475569" }, pendingText: { color: "#475569" },
  sectionLabel: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 14, marginTop: 8 },
  profileCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 28, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  profileHeader: { flexDirection: "row", gap: 14, alignItems: "center" }, avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E2E8F0" }, profileMeta: { flex: 1 },
  renterName: { fontSize: 18, fontWeight: "700", color: "#0F172A" }, renterEmail: { fontSize: 14, color: "#64748B", marginTop: 1 },
  inlineDateContainer: { flexDirection: "row", alignItems: "center", marginTop: 6 }, inlineCalendarIcon: { marginRight: 5 }, timelineText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  messageContentText: { fontSize: 15, color: "#1E293B", lineHeight: 22, marginTop: 16, marginBottom: 4 }, actionRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  denyButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1" }, denyButtonText: { fontSize: 16, fontWeight: "600", color: "#475569" },
  approveButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center" }, approveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" }, decisionButtonDisabled: { opacity: 0.45 },
  paymentLockText: { color: "#64748B", fontSize: 13, marginTop: 10, textAlign: "center" }, paymentLockError: { color: "#B91C1C", fontSize: 13, marginTop: 10, textAlign: "center" },
  messageButton: { width: "100%", height: 48, borderRadius: 24, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center", marginTop: 24 }, messageButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  locationAddress: { color: "#475569", fontSize: 14, marginBottom: 10 }, mapCardWrapper: { width: "100%", height: 165, borderRadius: 24, overflow: "hidden", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  locationUnavailable: { height: 120, borderRadius: 24, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }, locationUnavailableText: { color: "#64748B", fontSize: 14 },
});
