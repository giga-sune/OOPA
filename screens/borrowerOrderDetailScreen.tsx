import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons, Feather } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";

import { db } from "../services/firebase/firebaseApp";
import usePaymentViewModel from "../viewModels/payment/usePaymentViewModel";

type ParamList = {
    borrowerOrderDetailScreen: {
        rentalId: string;
    };
};

export default function BorrowerOrderDetailScreen() {
    const route = useRoute<RouteProp<ParamList, "borrowerOrderDetailScreen" | any>>();
    const navigation = useNavigation();
    const { rentalId } = route.params || {};
    const { isPaying, pay } = usePaymentViewModel();

    const [rental, setRental] = useState<any>(null);
    const [lenderProfile, setLenderProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function fetchOrderDetails() {
            if (!rentalId) {
                Alert.alert("Error", "Missing order identification reference.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // 1. Fetch rental transaction document
                const rentalRef = doc(db, "rentals", rentalId);
                const rentalSnap = await getDoc(rentalRef);

                if (!rentalSnap.exists()) {
                    Alert.alert("Error", "Order details could not be located.");
                    navigation.goBack();
                    return;
                }

                const rentalData = rentalSnap.data();
                setRental({ id: rentalSnap.id, ...rentalData });

                // ✅ FIX: Use 'ownerUid' to match your database schema
                const targetOwnerUid = rentalData.ownerUid;

                // 2. Fetch lender profile from the users collection
                if (targetOwnerUid) {
                    const userRef = doc(db, "users", targetOwnerUid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setLenderProfile(userSnap.data());
                    }
                }
            } catch (error) {
                console.error("Error retrieving borrower order data:", error);
                Alert.alert("Error", "Failed to compile order information.");
            } finally {
                setLoading(false);
            }
        }

        fetchOrderDetails();
    }, [rentalId]);

    const formatStampDate = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const formatRawDateString = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF7A21" />
            </View>
        );
    }

    // Check if the order is approved to enable messaging
    const isApproved = rental?.status?.toLowerCase() === "approved";

    // ✅ FIX: Fallbacks configured to read 'userName' from user doc, or 'ownerDisplayName' from rental doc
    const lenderName = 
        lenderProfile?.userName || 
        lenderProfile?.displayName || 
        rental?.ownerDisplayName || 
        "Lender";

    const lenderEmail = 
        lenderProfile?.email || 
        "No email available";

    const resolvedAvatarUri =
        lenderProfile?.profilePictureUrl ||
        lenderProfile?.profileImageUrl ||
        "https://ui-avatars.com/api/?name=" + encodeURIComponent(lenderName) + "&background=E2E8F0&color=64748B";

    const handleMessagePress = () => {
        if (!isApproved) return;
        Alert.alert("Message", `Opening chat with ${lenderName}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            {/* Header section */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={26} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Order</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Item Context Overview Section */}
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
                            <Text style={styles.durationDatesSubtext}>
                                {formatRawDateString(rental.startDate)} to {formatRawDateString(rental.endDate)}
                            </Text>
                            
                            {/* Status Pill Badge */}
                            <View style={[styles.statusBadge, isApproved ? styles.approvedBadge : styles.pendingBadge]}>
                                <Text style={[styles.statusText, isApproved ? styles.approvedText : styles.pendingText]}>
                                    {rental?.status || "Pending"}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Section: Lended From */}
                <Text style={styles.sectionLabel}>Lended From</Text>
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <Image source={{ uri: resolvedAvatarUri }} style={styles.avatarImage} />
                        <View style={styles.profileMeta}>
                            <Text style={styles.lenderName}>{lenderName}</Text>
                            <Text style={styles.lenderEmail}>{lenderEmail}</Text>

                            <View style={styles.inlineDateContainer}>
                                <Feather name="calendar" size={14} color="#64748B" style={styles.inlineCalendarIcon} />
                                <Text style={styles.timelineText}>
                                    {formatStampDate(rental?.startDate)} to {formatStampDate(rental?.endDate)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Conditional Message Button setup */}
                    <TouchableOpacity
                        style={[styles.messageButton, !isApproved && styles.messageButtonDisabled]}
                        onPress={handleMessagePress}
                        disabled={!isApproved}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.messageButtonText, !isApproved && styles.messageButtonTextDisabled]}>
                            Message
                        </Text>
                    </TouchableOpacity>
                </View>

                {isApproved && (
                    <TouchableOpacity
                        style={styles.paymentButton}
                        onPress={() => pay(rental.totalPrice)}
                        disabled={isPaying}
                    >
                        {isPaying ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.paymentButtonText}>
                                Pay ${Number(rental.totalPrice).toFixed(2)}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* Section: Meetup map */}
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
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

    itemOverviewContainer: { flexDirection: "row", marginBottom: 28, gap: 16, alignItems: "flex-start" },
    itemImage: { width: 110, height: 100, borderRadius: 16, backgroundColor: "#F8FAFC", resizeMode: "cover" },
    itemDetailsText: { flex: 1, justifyContent: "center" },
    priceText: { fontSize: 20, fontWeight: "700", color: "#000000" },
    itemTitle: { fontSize: 15, color: "#64748B", marginTop: 2, marginBottom: 4 },
    durationDatesSubtext: { fontSize: 13, color: "#475569", fontWeight: "500", marginBottom: 6 },
    
    statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    approvedBadge: { backgroundColor: "#F0FDF4" },
    pendingBadge: { backgroundColor: "#FEF3C7" },
    statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
    approvedText: { color: "#166534" },
    pendingText: { color: "#92400E" },

    sectionLabel: { fontSize: 22, fontWeight: "700", color: "#0F172A", marginBottom: 14, marginTop: 8 },

    profileCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        marginBottom: 28,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    profileHeader: { flexDirection: "row", gap: 14, marginBottom: 20, alignItems: "center" },
    avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E2E8F0" },
    profileMeta: { flex: 1 },
    lenderName: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    lenderEmail: { fontSize: 14, color: "#64748B", marginTop: 1 },

    inlineDateContainer: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    inlineCalendarIcon: { marginRight: 5 },
    timelineText: { fontSize: 13, color: "#475569", fontWeight: "500" },

    messageButton: {
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FF7A21", 
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
    },
    messageButtonDisabled: {
        backgroundColor: "#CBD5E1", 
    },
    messageButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    messageButtonTextDisabled: {
        color: "#64748B", 
    },

    paymentButton: {
        height: 52,
        borderRadius: 26,
        backgroundColor: "#FF7A21",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 28,
    },
    paymentButtonText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    mapCardWrapper: { width: "100%", height: 165, borderRadius: 24, overflow: "hidden", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
});
