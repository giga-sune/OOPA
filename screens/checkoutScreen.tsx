import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Modal, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { getAuth } from "firebase/auth";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, Feather } from "@expo/vector-icons";

// 1. Stripe & Cloud Functions Imports
import { useStripe } from "@stripe/stripe-react-native";
import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase/firebaseApp"; // 👈 Ensure this relative path points to your firebaseApp.ts

import { createRentalRequest } from "../services/firestore/rentalService";
import { getPropertyById } from "../services/firestore/propertyService";

type ParamList = {
  CheckoutScreen: {
    id: string;
    ownerUid: string;
  };
};

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "CheckoutScreen">>();
  const { id: propertyId, ownerUid } = route.params || {};

  const auth = getAuth();
  const currentUser = auth.currentUser;

  // 2. Access Stripe's Payment Sheet triggers
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [property, setProperty] = useState<any>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [totalPrice, setTotalPrice] = useState(0);

  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadItemData() {
      if (!propertyId) {
        Alert.alert("Error", "Missing property identification reference.");
        setLoadingProperty(false);
        return;
      }
      try {
        setLoadingProperty(true);
        const data = await getPropertyById(propertyId);
        if (!data) {
          Alert.alert("Error", "Could not find item details.");
          navigation.goBack();
          return;
        }
        setProperty(data);
      } catch (err) {
        console.error("Error fetching item details:", err);
      } finally {
        setLoadingProperty(false);
      }
    }
    loadItemData();
  }, [propertyId]);

  useEffect(() => {
    if (!property) return;

    const diffTime = Math.max(0, endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let units = 1;
    if (property.ratePeriod === "week") {
      units = Math.max(1, Math.ceil(diffDays / 7));
    } else {
      units = Math.max(1, Math.ceil(diffDays / 30));
    }

    setTotalPrice(units * (property.price || 0));
  }, [startDate, endDate, property]);

  const handleCheckout = async () => {
    if (!currentUser) {
      Alert.alert("Authentication Required", "Please log in to rent items.");
      return;
    }

    if (totalPrice <= 0) {
      Alert.alert("Invalid Amount", "Rental total must be greater than $0.00.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 3. Call your local Firebase Cloud Function to create the Payment Intent
      // Stripe requires values in cents ($15.00 CAD = 1500 cents)
      const amountInCents = Math.round(totalPrice * 100);
      
      const createPaymentIntentFn = httpsCallable<{ amount: number }, { clientSecret: string }>(
        functions,
        "createPaymentIntent"
      );

      const response = await createPaymentIntentFn({ amount: amountInCents });
      const { clientSecret } = response.data;

      // 4. Initialize Stripe's UI Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "OOPA App",
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          email: currentUser.email || undefined,
        },
      });

      if (initError) {
        Alert.alert("Stripe Initialization Failed", initError.message);
        setIsSubmitting(false);
        return;
      }

      // 5. Present the native Stripe interface to collect card details
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        // User cancelled or payment failed
        Alert.alert("Payment Cancelled", paymentError.message);
        setIsSubmitting(false);
        return;
      }

      // 6. Only create the Firestore record after Stripe confirms success
      await createRentalRequest({
        propertyId: propertyId,
        renterUid: currentUser.uid,
        startDate: startDate,
        endDate: endDate,
        message: message.trim() || null,
      });

      Alert.alert(
        "Success!", 
        "Payment processed and rental request has been submitted for approval.",
        [
          { 
            text: "Return", 
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack(); 
              } else {
                (navigation as any).navigate("HomeTabs"); 
              }
            } 
          }
        ]
      );
    } catch (error: any) {
      console.error("Payment flow error: ", error);
      Alert.alert("Checkout Error", error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProperty) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#FF7A21" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topNavBar}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => (navigation as any).navigate("HomeTabs")}>
          <Ionicons name="home-outline" size={26} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {property && (
          <View style={styles.itemHeaderContainer}>
            <Image 
              source={{ uri: property.propertyImageUrl || property.images?.[0] || "https://placeholder.pics/svg/120" }} 
              style={styles.itemImage} 
            />
            <View style={styles.itemDetailsTextContainer}>
              <Text style={styles.itemPriceText}>${property.price}/{property.ratePeriod}</Text>
              <Text style={styles.itemTitleText}>{property.title}</Text>
              
              <Text style={styles.lenderLabel}>Lender</Text>
              <View style={styles.lenderBadge}>
                <Text style={styles.lenderBadgeText}>{property.ownerDisplayName || "Lender"}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.fieldSectionLabel}>Date</Text>
        <View style={styles.datePickerContainer}>
          <TouchableOpacity 
            style={styles.dateInputBlock} 
            onPress={() => {
              setTempStartDate(startDate);
              setShowStartPicker(true);
            }}
          >
            <Text style={styles.dateValuePlaceholder}>{startDate.toLocaleDateString("en-GB")}</Text>
            <Feather name="calendar" size={20} color="#FF7A21" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.dateInputBlock} 
            onPress={() => {
              setTempEndDate(endDate);
              setShowEndPicker(true);
            }}
          >
            <Text style={styles.dateValuePlaceholder}>{endDate.toLocaleDateString("en-GB")}</Text>
            <Feather name="calendar" size={20} color="#FF7A21" />
          </TouchableOpacity>
        </View>

        {/* Start Date Pop-up Modal */}
        <Modal visible={showStartPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                style={styles.nativeCalendarInline}
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    setShowStartPicker(false);
                    if (date) setStartDate(date);
                  } else if (date) {
                    setTempStartDate(date);
                  }
                }}
              />
              {Platform.OS === "ios" && (
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setStartDate(tempStartDate);
                    setShowStartPicker(false);
                  }}>
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* End Date Pop-up Modal */}
        <Modal visible={showEndPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={startDate}
                style={styles.nativeCalendarInline}
                onChange={(event, date) => {
                  if (Platform.OS === "android") {
                    setShowEndPicker(false);
                    if (date) setEndDate(date);
                  } else if (date) {
                    setTempEndDate(date);
                  }
                }}
              />
              {Platform.OS === "ios" && (
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setEndDate(tempEndDate);
                    setShowEndPicker(false);
                  }}>
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <Text style={styles.fieldSectionLabel}>Message Lender</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Hey! I would love to borrow your item..."
          placeholderTextColor="#A1A1A1"
          multiline
          value={message}
          onChangeText={setMessage}
        />
      </ScrollView>

      <View style={styles.bottomStickyBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPriceValue}>${totalPrice.toFixed(2)}</Text>
          <Text style={styles.totalPriceLabel}>Total</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.checkoutBtn, isSubmitting && styles.disabledBtn]} 
          onPress={handleCheckout}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.checkoutBtnText}>Submit & Pay</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  topNavBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 50, gap: 12 },
  navButton: { padding: 4 },
  scrollContainer: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 120 },
  
  itemHeaderContainer: { flexDirection: "row", marginBottom: 28, gap: 16 },
  itemImage: { width: 120, height: 100, borderRadius: 16, backgroundColor: "#F1F5F9", resizeMode: "cover" },
  itemDetailsTextContainer: { flex: 1, justifyContent: "center" },
  itemPriceText: { fontSize: 20, fontWeight: "700", color: "#000000" },
  itemTitleText: { fontSize: 14, color: "#666666", marginTop: 2, marginBottom: 8 },
  lenderLabel: { fontSize: 12, color: "#999999", marginBottom: 4 },
  lenderBadge: { alignSelf: "flex-start", backgroundColor: "#F0F0F0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  lenderBadgeText: { fontSize: 13, color: "#333333", fontWeight: "500" },

  fieldSectionLabel: { fontSize: 16, fontWeight: "600", color: "#000000", marginBottom: 10, marginTop: 4 },
  datePickerContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  dateInputBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF"
  },
  dateValuePlaceholder: { fontSize: 15, color: "#444" },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  modalCard: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 24, 
    paddingHorizontal: 20,
    paddingVertical: 24, 
    width: "88%",
    maxWidth: 360,
    alignItems: "center"
  },
  nativeCalendarInline: {
    width: "100%",
    alignSelf: "center"
  },
  modalActions: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    width: "100%",
    paddingHorizontal: 8, 
    marginTop: 20 
  },
  modalCancelText: { color: "#64748B", fontSize: 16, fontWeight: "600" },
  modalConfirmText: { color: "#FF7A21", fontSize: 16, fontWeight: "700" },

  textArea: { borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 14, padding: 16, minHeight: 130, textAlignVertical: "top", fontSize: 15, color: "#000000", backgroundColor: "#FFFFFF" },
  bottomStickyBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceContainer: { flexDirection: "column-reverse" },
  totalPriceLabel: { fontSize: 12, color: "#888888", marginTop: 2 },
  totalPriceValue: { fontSize: 24, fontWeight: "700", color: "#000000" },
  checkoutBtn: { backgroundColor: "#FF7A21", height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  disabledBtn: { opacity: 0.6 },
  checkoutBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" }
});