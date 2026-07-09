import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { Ionicons, Feather } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";

import { db } from "../services/firebase/firebaseApp";
import { approveRentalRequest, rejectRentalRequest } from "../services/firestore/rentalService";

type ParamList = {
    lenderRequestDetailScreen: {
        rentalId: string;
    };
};

export default function LenderRequestDetailScreen() {
    const route = useRoute<RouteProp<ParamList, "lenderRequestDetailScreen" | any>>();
    const navigation = useNavigation();
    const { rentalId } = route.params || {};

    const [rental, setRental] = useState<any>(null);
    const [borrowerProfile, setBorrowerProfile] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [actionLoading, setActionLoading] = useState<boolean>(false);

    useEffect(() => {
        async function fetchFullData() {
            if (!rentalId) {
                Alert.alert("Error", "Missing request identification reference.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // 1. Fetch the primary rental transaction request document
                const rentalRef = doc(db, "rentals", rentalId);
                const rentalSnap = await getDoc(rentalRef);

                if (!rentalSnap.exists()) {
                    Alert.alert("Error", "Rental request could not be located.");
                    navigation.goBack();
                    return;
                }

                const rentalData = rentalSnap.data();
                setRental({ id: rentalSnap.id, ...rentalData });

                // 2. Fetch the borrower profile from the users collection
                if (rentalData.renterUid) {
                    const userRef = doc(db, "users", rentalData.renterUid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setBorrowerProfile(userSnap.data());
                    }
                }
            } catch (error) {
                console.error("Error retrieving request data:", error);
                Alert.alert("Error", "Failed to compile request information.");
            } finally {
                setLoading(false);
            }
        }

        fetchFullData();
    }, [rentalId]);

    const handleAccept = async () => {
        try {
            setActionLoading(true);
            await approveRentalRequest(rentalId);
            Alert.alert("Approved", "You have successfully accepted this rental request!", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to process approval.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeny = async () => {
        try {
            setActionLoading(true);
            await rejectRentalRequest(rentalId);
            Alert.alert("Declined", "The rental request has been rejected.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to process rejection.");
        } finally {
            setActionLoading(false);
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

    const borrowerName = borrowerProfile?.displayName || rental?.renterDisplayName || "Active User";

    // queries 'profilePictureUrl' prior to fallbacks
    const resolvedAvatarUri =
        borrowerProfile?.profilePictureUrl ||
        borrowerProfile?.profileImageUrl ||
        borrowerProfile?.avatarUrl ||
        rental?.renterPhotoUrl ||
        "https://ui-avatars.com/api/?name=" + encodeURIComponent(borrowerName) + "&background=E2E8F0&color=64748B";

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            {/* Top Header Row */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={26} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Request</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Item Context Overview Card */}
                {rental && (
                    <View style={styles.itemOverviewContainer}>
                        <Image
                            source={{ uri: rental.propertyImageUrl || "https://placeholder.pics/svg/120" }}
                            style={styles.itemImage}
                        />
                        <View style={styles.itemDetailsText}>
                            <Text style={styles.priceText}>
                                ${rental.propertyPrice}/{rental.propertyRatePeriod || "week"}
                            </Text>
                            <Text style={styles.itemTitle}>{rental.propertyTitle}</Text>
                            <Text style={styles.durationDatesSubtext}>
                                {formatStampDate(rental.startDate)} to {formatStampDate(rental.endDate)}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Section: Request From */}
                <Text style={styles.sectionLabel}>Request From</Text>
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <Image
                            source={{ uri: resolvedAvatarUri }}
                            style={styles.avatarImage}
                        />
                        <View style={styles.profileMeta}>
                            <Text style={styles.borrowerName}>
                                {borrowerName}
                            </Text>
                            <Text style={styles.borrowerEmail}>
                                {borrowerProfile?.email || rental?.renterEmail || "No email available"}
                            </Text>

                            <View style={styles.inlineDateContainer}>
                                <Feather name="calendar" size={14} color="#64748B" style={styles.inlineCalendarIcon} />
                                <Text style={styles.timelineText}>
                                    {formatStampDate(rental?.startDate)} to {formatStampDate(rental?.endDate)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* User Introduction Message */}
                    <Text style={styles.borrowerMessageText}>
                        {rental?.message || "Interested to book for ad"}
                    </Text>

                    {/* Accept / Deny Buttons Container */}
                    <View style={styles.actionButtonRow}>
                        <TouchableOpacity
                            style={styles.denyButton}
                            onPress={handleDeny}
                            disabled={actionLoading}
                        >
                            <Text style={styles.denyButtonText}>Deny</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.acceptButton}
                            onPress={handleAccept}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.acceptButtonText}>Accept</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section: Meetup map*/}
                <Text style={styles.sectionLabel}>Where to meet</Text>
                <View style={styles.mapCardWrapper}>
                    <MapView
                        style={StyleSheet.absoluteFillObject}
                        initialRegion={{
                            latitude: 43.6532, 
                            longitude: -79.3832,
                            latitudeDelta: 0.015,  
                            longitudeDelta: 0.015,
                        }}
                        scrollEnabled={false}    
                        zoomEnabled={true}
                    >
                        <Marker
                            coordinate={{ latitude: 43.6532, longitude: -79.3832 }}
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

    itemOverviewContainer: { flexDirection: "row", marginBottom: 28, gap: 16, alignItems: "center" },
    itemImage: { width: 100, height: 85, borderRadius: 16, backgroundColor: "#F8FAFC", resizeMode: "cover" },
    itemDetailsText: { flex: 1, justifyContent: "center" },
    priceText: { fontSize: 20, fontWeight: "700", color: "#000000" },
    itemTitle: { fontSize: 15, color: "#64748B", marginTop: 2, marginBottom: 4 },
    durationDatesSubtext: { fontSize: 13, color: "#475569", fontWeight: "500" },

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
    profileHeader: { flexDirection: "row", gap: 14, marginBottom: 16, alignItems: "center" },
    avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#E2E8F0" },
    profileMeta: { flex: 1 },
    borrowerName: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
    borrowerEmail: { fontSize: 14, color: "#64748B", marginTop: 1 },

    inlineDateContainer: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    inlineCalendarIcon: { marginRight: 5 },
    timelineText: { fontSize: 13, color: "#475569", fontWeight: "500" },

    borrowerMessageText: { fontSize: 15, color: "#334155", lineHeight: 22, marginBottom: 24 },

    actionButtonRow: { flexDirection: "row", gap: 12 },
    denyButton: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, borderColor: "#E2E8F0", justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
    denyButtonText: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
    acceptButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: "#FF7A21", justifyContent: "center", alignItems: "center" },
    acceptButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },

    mapCardWrapper: { width: "100%", height: 165, borderRadius: 24, overflow: "hidden", backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
    staticMapFallback: { width: "100%", height: "100%", resizeMode: "cover" }
});