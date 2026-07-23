import React from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import useRenterRentalDetailViewModel from "../viewModels/rental/useRenterRentalDetailViewModel";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-GB");
}

export default function BorrowerOrderDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "BorrowerOrderDetailScreen">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    rental,
    counterpartyProfile: lenderProfile,
    propertyLocation,
    loading,
    errorMessage,
    isPaying,
    isPaymentLoading,
    paymentStatus,
    paymentStatusError,
    isPaymentComplete,
    isApproved,
    canPay,
    pay,
    prepareChat,
  } = useRenterRentalDetailViewModel(route.params?.rentalId ?? "");

  const handlePayment = async () => {
    const outcome = await pay();
    if (outcome.status === "success") {
      Alert.alert("Payment Successful", "Your payment was completed.");
    } else if (outcome.status === "failure") {
      Alert.alert("Payment Error", outcome.message);
    }
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
          <Text style={styles.headerTitle}>Order</Text>
        </View>
        <View style={styles.centerContainer}><Text style={styles.errorText}>{errorMessage}</Text></View>
      </SafeAreaView>
    );
  }

  const lenderName = lenderProfile?.userName || rental.ownerDisplayName || "Lender";
  const lenderEmail = lenderProfile?.email || "No email available";
  const avatar = lenderProfile?.profilePictureUrl || lenderProfile?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(lenderName)}&background=E2E8F0&color=64748B`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        <View style={styles.itemOverviewContainer}>
          <Image source={{ uri: rental.propertyImageUrl || "https://placeholder.pics/svg/120" }} style={styles.itemImage} />
          <View style={styles.itemDetailsText}>
            <Text style={styles.priceText}>${rental.propertyPrice}/{rental.propertyRatePeriod}</Text>
            <Text style={styles.itemTitle}>{rental.propertyTitle || "Item Details"}</Text>
            <Text style={styles.durationDatesSubtext}>{formatShortDate(rental.startDate)} to {formatShortDate(rental.endDate)}</Text>
            <View style={[styles.statusBadge, isApproved ? styles.approvedBadge : styles.pendingBadge]}>
              <Text style={[styles.statusText, isApproved ? styles.approvedText : styles.pendingText]}>{rental.status}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Lended From</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
            <View style={styles.profileMeta}>
              <Text style={styles.lenderName}>{lenderName}</Text>
              <Text style={styles.lenderEmail}>{lenderEmail}</Text>
              <View style={styles.inlineDateContainer}>
                <Feather name="calendar" size={14} color="#64748B" style={styles.inlineCalendarIcon} />
                <Text style={styles.timelineText}>{formatLongDate(rental.startDate)} to {formatLongDate(rental.endDate)}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={[styles.messageButton, !isApproved && styles.messageButtonDisabled]} onPress={() => void handleMessagePress()} disabled={!isApproved} activeOpacity={0.7}>
            <Text style={[styles.messageButtonText, !isApproved && styles.messageButtonTextDisabled]}>Message</Text>
          </TouchableOpacity>
        </View>

        {isApproved ? (
          <>
            <TouchableOpacity style={[styles.paymentButton, !canPay && styles.paymentButtonDisabled]} onPress={() => void handlePayment()} disabled={!canPay}>
              {isPaying || isPaymentLoading ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.paymentButtonText}>
                  {isPaymentComplete ? "Paid" : paymentStatus === "processing" ? "Continue Payment" : `Pay $${rental.totalPrice.toFixed(2)}`}
                </Text>
              )}
            </TouchableOpacity>
            {paymentStatusError ? <Text style={styles.paymentStatusError}>{paymentStatusError}</Text> : null}
          </>
        ) : null}

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
  container: { flex: 1, backgroundColor: "#FFFFFF" }, centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF", padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56, gap: 4 }, backButton: { paddingVertical: 4, paddingRight: 8 }, headerTitle: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 }, errorText: { color: "#B91C1C", fontSize: 14, textAlign: "center", marginBottom: 12 },
  itemOverviewContainer: { flexDirection: "row", marginBottom: 28, gap: 16, alignItems: "flex-start" }, itemImage: { width: 110, height: 100, borderRadius: 16, backgroundColor: "#F8FAFC", resizeMode: "cover" }, itemDetailsText: { flex: 1, justifyContent: "center" },
  priceText: { fontSize: 20, fontWeight: "700", color: "#000000" }, itemTitle: { fontSize: 15, color: "#64748B", marginTop: 2, marginBottom: 4 }, durationDatesSubtext: { fontSize: 13, color: "#475569", fontWeight: "500", marginBottom: 6 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }, approvedBadge: { backgroundColor: "#F0FDF4" }, pendingBadge: { backgroundColor: "#FEF3C7" }, statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" }, approvedText: { color: "#166534" }, pendingText: { color: "#92400E" },
  sectionLabel: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 14, marginTop: 8 }, profileCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 28, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }, profileHeader: { flexDirection: "row", gap: 14, marginBottom: 20, alignItems: "center" },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E2E8F0" }, profileMeta: { flex: 1 }, lenderName: { fontSize: 18, fontWeight: "700", color: "#0F172A" }, lenderEmail: { fontSize: 14, color: "#64748B", marginTop: 1 },
  inlineDateContainer: { flexDirection: "row", alignItems: "center", marginTop: 6 }, inlineCalendarIcon: { marginRight: 5 }, timelineText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  messageButton: { height: 48, borderRadius: 24, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center", width: "100%" }, messageButtonDisabled: { backgroundColor: "#CBD5E1" }, messageButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" }, messageButtonTextDisabled: { color: "#64748B" },
  paymentButton: { height: 52, borderRadius: 26, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center", marginBottom: 28 }, paymentButtonDisabled: { opacity: 0.6 }, paymentButtonText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" }, paymentStatusError: { color: "#B91C1C", fontSize: 13, marginTop: -18, marginBottom: 28, textAlign: "center" },
  locationAddress: { color: "#475569", fontSize: 14, marginBottom: 10 }, mapCardWrapper: { width: "100%", height: 165, borderRadius: 24, overflow: "hidden", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  locationUnavailable: { height: 120, borderRadius: 24, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E2E8F0" }, locationUnavailableText: { color: "#64748B", fontSize: 14 },
});
