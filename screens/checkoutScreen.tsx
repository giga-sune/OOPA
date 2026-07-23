import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import useCheckoutRentalViewModel from "../viewModels/rental/useCheckoutRentalViewModel";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export default function CheckoutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "CheckoutScreen">>();
  const {
    property,
    loadingProperty,
    message,
    startDate,
    endDate,
    temporaryStartDate,
    temporaryEndDate,
    showStartPicker,
    showEndPicker,
    submitting,
    errorMessage,
    totalPrice,
    setMessage,
    openStartPicker,
    openEndPicker,
    cancelStartPicker,
    cancelEndPicker,
    setTemporaryStartDate,
    setTemporaryEndDate,
    confirmStartDate,
    confirmEndDate,
    submitRentalRequest,
  } = useCheckoutRentalViewModel(route.params?.propertyId ?? "");

  const handleCheckout = async () => {
    const outcome = await submitRentalRequest();
    if (outcome.status === "failure") {
      Alert.alert("Checkout Error", outcome.message);
      return;
    }

    Alert.alert(
      "Request submitted",
      "Your rental request was sent to the owner. You can pay after they approve it.",
      [{
        text: "Return",
        onPress: () => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate("MainApp", { screen: "Home" });
        },
      }]
    );
  };

  if (loadingProperty) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#FF7A21" />
      </View>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.topNavBar}>
          <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerLoading}>
          <Text style={styles.errorText}>{errorMessage || "Could not find item details."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topNavBar}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate("MainApp", { screen: "Home" })}
        >
          <Ionicons name="home-outline" size={26} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.itemHeaderContainer}>
          <Image
            source={{ uri: property.images[0] || "https://placeholder.pics/svg/120" }}
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

        <Text style={styles.fieldSectionLabel}>Date</Text>
        <View style={styles.datePickerContainer}>
          <TouchableOpacity style={styles.dateInputBlock} onPress={openStartPicker}>
            <Text style={styles.dateValuePlaceholder}>{startDate.toLocaleDateString("en-GB")}</Text>
            <Feather name="calendar" size={20} color="#FF7A21" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateInputBlock} onPress={openEndPicker}>
            <Text style={styles.dateValuePlaceholder}>{endDate.toLocaleDateString("en-GB")}</Text>
            <Feather name="calendar" size={20} color="#FF7A21" />
          </TouchableOpacity>
        </View>

        <Modal visible={showStartPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <DateTimePicker
                value={temporaryStartDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                style={styles.nativeCalendarInline}
                onChange={(_, date) => {
                  if (Platform.OS === "android") {
                    if (date) confirmStartDate(date);
                    else cancelStartPicker();
                  } else if (date) setTemporaryStartDate(date);
                }}
              />
              {Platform.OS === "ios" ? (
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={cancelStartPicker}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmStartDate()}>
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        </Modal>

        <Modal visible={showEndPicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <DateTimePicker
                value={temporaryEndDate}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date(startDate.getTime() + DAY_IN_MS)}
                style={styles.nativeCalendarInline}
                onChange={(_, date) => {
                  if (Platform.OS === "android") {
                    if (date) confirmEndDate(date);
                    else cancelEndPicker();
                  } else if (date) setTemporaryEndDate(date);
                }}
              />
              {Platform.OS === "ios" ? (
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={cancelEndPicker}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmEndDate()}>
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
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
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </ScrollView>

      <View style={styles.bottomStickyBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPriceValue}>${totalPrice.toFixed(2)}</Text>
          <Text style={styles.totalPriceLabel}>Total</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, submitting && styles.disabledBtn]}
          onPress={() => void handleCheckout()}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.checkoutBtnText}>Submit Request</Text>}
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
  dateInputBlock: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 12, height: 50, paddingHorizontal: 14, backgroundColor: "#FFFFFF" },
  dateValuePlaceholder: { fontSize: 15, color: "#444" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#FFFFFF", borderRadius: 24, paddingHorizontal: 20, paddingVertical: 24, width: "88%", maxWidth: 360, alignItems: "center" },
  nativeCalendarInline: { width: "100%", alignSelf: "center" },
  modalActions: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 8, marginTop: 20 },
  modalCancelText: { color: "#64748B", fontSize: 16, fontWeight: "600" },
  modalConfirmText: { color: "#FF7A21", fontSize: 16, fontWeight: "700" },
  textArea: { borderWidth: 1, borderColor: "#CCCCCC", borderRadius: 14, padding: 16, minHeight: 130, textAlignVertical: "top", fontSize: 15, color: "#000000", backgroundColor: "#FFFFFF" },
  errorText: { color: "#B91C1C", fontSize: 14, marginTop: 12, textAlign: "center", paddingHorizontal: 24 },
  bottomStickyBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceContainer: { flexDirection: "column-reverse" },
  totalPriceLabel: { fontSize: 12, color: "#888888", marginTop: 2 },
  totalPriceValue: { fontSize: 24, fontWeight: "700", color: "#000000" },
  checkoutBtn: { backgroundColor: "#FF7A21", height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  disabledBtn: { opacity: 0.6 },
  checkoutBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
