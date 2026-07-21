import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Ionicons, Feather } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";

import { db } from "../services/firebase/firebaseApp";
import { approveRentalRequest, rejectRentalRequest } from "../services/firestore/rentalService";
import { ensureChatChannel } from "../services/chat/chatService";
import usePaymentStatusViewModel from "../viewModels/payment/usePaymentStatusViewModel";

type ParamList = {
    lenderRequestDetailScreen: {
        rentalId: string;
    };
};

export default function LenderRequestDetailScreen() {
    const route = useRoute<RouteProp<ParamList, "lenderRequestDetailScreen" | any>>();
    const navigation = useNavigation<any>();
    const { rentalId } = route.params || {};

    const [rental, setRental] = useState<any>(null);
    const [renterProfile, setRenterProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [processing, setProcessing] = useState<boolean>(false);
    const {
        paymentStatus,
        isPaymentLoading,
        paymentStatusError,
    } = usePaymentStatusViewModel(rentalId || "");

    useEffect(() => {
        async function fetchRequestDetails() {
            if (!rentalId) {
                Alert.alert("Error", "Missing request identification reference.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const rentalRef = doc(db, "rentals", rentalId);
                const rentalSnap = await getDoc(rentalRef);

                if (!rentalSnap.exists()) {
                    Alert.alert("Error", "Request details could not be located.");
                    navigation.goBack();
                    return;
                }

                const rentalData = rentalSnap.data();
                setRental({ id: rentalSnap.id, ...rentalData });

                if (rentalData.renterUid) {
                    const userRef = doc(db, "users", rentalData.renterUid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setRenterProfile(userSnap.data());
                    }
                }
            } catch (error) {
                console.error("Error retrieving request data:", error);
                Alert.alert("Error", "Failed to compile request information.");
            } finally {
                setLoading(false);
            }
        }

        fetchRequestDetails();
    }, [rentalId]);

    const handleStatusUpdate = async (nextStatus: "approved" | "rejected") => {
        if (!rentalId) return;

        try {
            setProcessing(true);
            if (nextStatus === "approved") {
                await approveRentalRequest(rentalId);
            } else {
                await rejectRentalRequest(rentalId);
            }

            setRental((prev: any) => ({ ...prev, status: nextStatus }));
            Alert.alert("Success", `Request has been ${nextStatus}.`);
        } catch (error) {
            console.error(`Error updating status:`, error);
            Alert.alert("Error", "Failed to update request status.");
        } finally {
            setProcessing(false);
        }
    };

    const borrowerName = renterProfile?.userName || renterProfile?.displayName || rental?.renterDisplayName || "Renter";

    const handleMessagePress = async () => {
        if (!rental || rental.status?.toLowerCase() !== "approved") return;

        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert("Error", "Verification timeout. Please re-authenticate your session.");
            return;
        }

        try {
            setLoading(true);
            await ensureChatChannel({
                rentalId: rental.id,
                propertyId: rental.propertyId,
                propertyTitle: rental.propertyTitle,
                propertyImageUrl: rental.propertyImageUrl || null,
                renterUid: rental.renterUid,
                ownerUid: rental.ownerUid,
                renterDisplayName: borrowerName,
                ownerDisplayName: rental.ownerDisplayName || "Lender",
            });

            navigation.navigate("ChatRoom", {
                rentalId: rental.id,
                title: rental.propertyTitle,
                recipientUid: rental.renterUid,
                recipientName: borrowerName,
            });
        } catch (error) {
            console.error("Error setting up chat initialization channel:", error);
            Alert.alert("Error", "Unable to load messaging instance details.");
        } finally {
            setLoading(false);
        }
    };

    const formatStampDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF7A21" />
            </View>
        );
    }

    const currentStatus = rental?.status?.toLowerCase() || "pending";
    const isRejected = currentStatus === "denied" || currentStatus === "rejected";
    const isPaymentLocked =
        isPaymentLoading ||
        paymentStatus === "processing" ||
        paymentStatus === "paid" ||
        Boolean(paymentStatusError);
    const isDenyDisabled = processing || isPaymentLocked || isRejected;
    const isAcceptDisabled =
        processing || isPaymentLocked || currentStatus === "approved";

    const borrowerEmail = renterProfile?.email || "No email available";
    const resolvedAvatarUri = renterProfile?.profilePictureUrl || renterProfile?.profileImageUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(borrowerName) + "&background=E2E8F0&color=64748B";

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={26} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {rental && (
                    <View style={styles.itemOverviewContainer}>
                        <Image
                            source={{ uri: rental.propertyImageUrl || "https://placeholder.pics/svg/120" }}
                            style={styles.itemImage}
                        />
                        <View style={styles.itemDetailsText}>
                            <Text style={styles.priceText}>
                                ${rental.propertyPrice}/{rental.propertyRatePeriod || "month"}
                            </Text>
                            <Text style={styles.itemTitle}>{rental.propertyTitle || "Item Details"}</Text>
                            
                            <View style={[
                                styles.statusBadge, 
                                currentStatus === "approved" ? styles.approvedBadge : isRejected ? styles.rejectedBadge : styles.pendingBadge
                            ]}>
                                <Text style={[
                                    styles.statusText, 
                                    currentStatus === "approved" ? styles.approvedText : isRejected ? styles.rejectedText : styles.pendingText
                                ]}>
                                    {currentStatus === "approved" ? "Approved" : isRejected ? "Rejected" : "Pending"}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <Text style={styles.sectionLabel}>Request From</Text>
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <Image source={{ uri: resolvedAvatarUri }} style={styles.avatarImage} />
                        <View style={styles.profileMeta}>
                            <Text style={styles.renterName}>{borrowerName}</Text>
                            <Text style={styles.renterEmail}>{borrowerEmail}</Text>

                            <View style={styles.inlineDateContainer}>
                                <Feather name="calendar" size={14} color="#64748B" style={styles.inlineCalendarIcon} />
                                <Text style={styles.timelineText}>
                                    {formatStampDate(rental?.startDate)} to {formatStampDate(rental?.endDate)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {rental?.message && rental.message.trim() !== "" && (
                        <Text style={styles.messageContentText}>{rental.message}</Text>
                    )}

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[
                                styles.denyButton,
                                isDenyDisabled && styles.decisionButtonDisabled,
                            ]}
                            onPress={() => void handleStatusUpdate("rejected")}
                            disabled={isDenyDisabled}
                        >
                            <Text style={styles.denyButtonText}>
                                {processing && !isRejected ? "Updating..." : "Deny"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.approveButton,
                                isAcceptDisabled && styles.decisionButtonDisabled,
                            ]}
                            onPress={() => void handleStatusUpdate("approved")}
                            disabled={isAcceptDisabled}
                        >
                            {processing && currentStatus !== "approved" ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.approveButtonText}>Accept</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {paymentStatus === "paid" && (
                        <Text style={styles.paymentLockText}>
                            This request is locked because the rental has been paid.
                        </Text>
                    )}

                    {paymentStatus === "processing" && (
                        <Text style={styles.paymentLockText}>
                            This request is locked while payment is processing.
                        </Text>
                    )}

                    {paymentStatusError ? (
                        <Text style={styles.paymentLockError}>
                            {paymentStatusError}
                        </Text>
                    ) : null}

                    {currentStatus === "approved" && (
                        <TouchableOpacity
                            style={styles.messageButton}
                            onPress={handleMessagePress}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.sectionLabel}>Where to meet</Text>
                <View style={styles.mapCardWrapper}>
                    <MapView
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={{
                            latitude: rental?.latitude || 43.6532, 
                            longitude: rental?.longitude || -79.3832,
                            latitudeDelta: 0.015,
                            longitudeDelta: 0.015,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={true}
                    >
                        <Marker
                            coordinate={{
                                latitude: rental?.latitude || 43.6532,
                                longitude: rental?.longitude || -79.3832,
                            }}
                            title="Meetup Location"
                            pinColor="#FF7A21"
                        />
                    </MapView>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
    headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 56, gap: 4 },
    backButton: { paddingVertical: 4, paddingRight: 8 },
    headerTitle: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    itemOverviewContainer: { flexDirection: "row", marginBottom: 24, gap: 16, alignItems: "center" },
    itemImage: { width: 110, height: 100, borderRadius: 16, backgroundColor: "#F8FAFC", resizeMode: "cover" },
    itemDetailsText: { flex: 1, justifyContent: "center" },
    priceText: { fontSize: 20, fontWeight: "700", color: "#000000" },
    itemTitle: { fontSize: 15, color: "#64748B", marginTop: 2, marginBottom: 8 },
    statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    approvedBadge: { backgroundColor: "#F0FDF4" },
    rejectedBadge: { backgroundColor: "#F1F5F9" },
    pendingBadge: { backgroundColor: "#F1F5F9" },
    statusText: { fontSize: 12, fontWeight: "600" },
    approvedText: { color: "#166534" },
    rejectedText: { color: "#475569" },
    pendingText: { color: "#475569" },
    sectionLabel: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 14, marginTop: 8 },
    profileCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 28, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    profileHeader: { flexDirection: "row", gap: 14, alignItems: "center" },
    avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E2E8F0" },
    profileMeta: { flex: 1 },
    renterName: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    renterEmail: { fontSize: 14, color: "#64748B", marginTop: 1 },
    inlineDateContainer: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    inlineCalendarIcon: { marginRight: 5 },
    timelineText: { fontSize: 13, color: "#475569", fontWeight: "500" },
    messageContentText: { fontSize: 15, color: "#1E293B", lineHeight: 22, marginTop: 16, marginBottom: 4 },
    actionRow: { flexDirection: "row", gap: 12, marginTop: 24 },
    denyButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#CBD5E1" },
    denyButtonText: { fontSize: 16, fontWeight: "600", color: "#475569" },
    approveButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center" },
    approveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
    decisionButtonDisabled: { opacity: 0.45 },
    paymentLockText: { color: "#64748B", fontSize: 13, marginTop: 10, textAlign: "center" },
    paymentLockError: { color: "#B91C1C", fontSize: 13, marginTop: 10, textAlign: "center" },
    messageButton: { width: "100%", height: 48, borderRadius: 24, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center", marginTop: 24 },
    messageButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
    mapCardWrapper: { width: "100%", height: 165, borderRadius: 24, overflow: "hidden", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" }
});