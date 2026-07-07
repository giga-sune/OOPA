import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Feather from "@expo/vector-icons/Feather";
import DateTimePicker from "@react-native-community/datetimepicker";

import CheckoutProductSummary from '../components/checkout/CheckoutProductSummary';
import { Colors, Spacing } from "../styles/globalDesignSystem";

export default function CheckoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();

  // Extract price parameters to calculate dynamic total
  const { price = 0, ratePeriod = 'week' } = route.params || {};

  // Form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  
  // Date State objects
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Picker visibility controls
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // --- Calculation Logic ---
  const calculateTotal = (): string => {
    if (!startDate || !endDate || price <= 0) return "0.00";

    // Calculate absolute difference in milliseconds
    const diffTime = endDate.getTime() - startDate.getTime();
    if (diffTime < 0) return "0.00";

    // Convert milliseconds to full days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; 

    let calculatedTotal = 0;
    if (ratePeriod === 'week') {
      // Daily cost based on weekly breakdown
      calculatedTotal = (price / 7) * diffDays;
    } else {
      // Daily cost based on monthly (30 day average) breakdown
      calculatedTotal = (price / 30) * diffDays;
    }

    return calculatedTotal.toFixed(2);
  };

  const handleCheckout = () => {
    console.log("Processing checkout data...", { 
      username, 
      email, 
      contact, 
      totalAmount: calculateTotal(),
      startDate: startDate?.toLocaleDateString('en-GB'),
      endDate: endDate?.toLocaleDateString('en-GB'),
    });
  };

  const formatDateDisplay = (date: Date | null, fallbackPlaceholder: string) => {
    if (!date) return fallbackPlaceholder;
    return date.toLocaleDateString('en-GB'); 
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Custom Navigation Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Feather name="chevron-left" size={28} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => (navigation as any).popToTop()} style={styles.iconButton}>
            <Feather name="home" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
          
          <CheckoutProductSummary />

          {/* Form Content Controls */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. John Doe"
              placeholderTextColor={Colors.placeholder || "#94A3B8"}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="yourname@example.com"
              placeholderTextColor={Colors.placeholder || "#94A3B8"}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput
              style={styles.textInput}
              value={contact}
              onChangeText={setContact}
              placeholder="e.g. +1 (416) 555-0199"
              placeholderTextColor={Colors.placeholder || "#94A3B8"}
              keyboardType="phone-pad"
            />
          </View>

          {/* Date Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Rental Period</Text>
            <View style={styles.dateRow}>
              
              <TouchableOpacity 
                style={styles.dateInputWrapper} 
                activeOpacity={0.7} 
                onPress={() => setShowStartPicker(true)}
              >
                <View style={styles.dateInputMock}>
                  <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
                    {formatDateDisplay(startDate, "Start Date")}
                  </Text>
                  <Feather name="calendar" size={18} color="#FF7A21" style={styles.calendarIcon} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dateInputWrapper} 
                activeOpacity={0.7} 
                onPress={() => setShowEndPicker(true)}
              >
                <View style={styles.dateInputMock}>
                  <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                    {formatDateDisplay(endDate, "End Date")}
                  </Text>
                  <Feather name="calendar" size={18} color="#FF7A21" style={styles.calendarIcon} />
                </View>
              </TouchableOpacity>

            </View>
          </View>

          {showStartPicker && (
            <View style={styles.calendarContainer}>
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== 'ios') setShowStartPicker(false);
                  if (selectedDate) setStartDate(selectedDate);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.closeCalendarBtn} onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.closeCalendarText}>Confirm Start Date</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showEndPicker && (
            <View style={styles.calendarContainer}>
              <DateTimePicker
                value={endDate || startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={startDate || new Date()}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== 'ios') setShowEndPicker(false);
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.closeCalendarBtn} onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.closeCalendarText}>Confirm End Date</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Message Input */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Message Lender</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Introduce yourself and mention your preferred drop-off details..."
              placeholderTextColor={Colors.placeholder || "#94A3B8"}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Dynamic Sticky Footer Total Calculation Row */}
        <View style={styles.bottomStickyRow}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalPrice}>${calculateTotal()}</Text>
            <Text style={styles.totalLabel}>Total Amount</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} activeOpacity={0.9} onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md || 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  iconButton: { padding: 4 },
  scrollBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl * 2 },
  formGroup: { marginBottom: Spacing.md || 16 },
  inputLabel: { fontSize: 15, fontWeight: "600", color: "#333333", marginBottom: Spacing.xs || 6 },
  textInput: {
    backgroundColor: Colors.inputBg || "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border || "#E2E8F0",
    borderRadius: 14,
    height: 48,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text || "#0F172A",
  },
  textArea: { height: 110, paddingTop: 12, paddingBottom: 12 },
  dateRow: { flexDirection: "row", gap: 12 },
  dateInputWrapper: { flex: 1 },
  dateInputMock: {
    backgroundColor: Colors.inputBg || "#FFFFFF",
    borderWidth: 1,
    borderColor: Colors.border || "#E2E8F0",
    borderRadius: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  dateText: { fontSize: 14, color: "#0F172A" },
  placeholderText: { color: "#94A3B8" },
  calendarIcon: { marginLeft: 4 },
  calendarContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  closeCalendarBtn: {
    backgroundColor: "#FF7A21",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  closeCalendarText: { color: "#FFF", fontWeight: "600", fontSize: 14 },
  bottomStickyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? 12 : Spacing.md,
    backgroundColor: "#FFFFFF",
  },
  totalContainer: { justifyContent: "center" },
  totalPrice: { fontSize: 22, fontWeight: "700", color: "#0F172A" },
  totalLabel: { fontSize: 12, color: "#94A3B8", fontWeight: "500", marginTop: 1 },
  checkoutButton: { backgroundColor: "#FF7A21", borderRadius: 16, height: 48, paddingHorizontal: 36, justifyContent: "center", alignItems: "center" },
  checkoutButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});