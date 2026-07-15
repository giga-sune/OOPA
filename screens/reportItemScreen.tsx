import React, { useState } from "react";
import { StyleSheet, View, Text, Image, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type ParamList = {
  ReportItemScreen: {
    rental: {
      propertyTitle: string;
      propertyImageUrl: string | null;
      propertyRatePeriod: string;
      propertyPrice: number;
      startDate: string | Date;
      endDate: string | Date;
      status: string;
    };
  };
};

export default function ReportItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "ReportItemScreen">>();

  const rental = route.params?.rental || {
    propertyTitle: "Swimming safety gear",
    propertyImageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400",
    propertyPrice: 11,
    propertyRatePeriod: "month",
    startDate: "20/05/2026",
    endDate: "30/05/2026",
    status: "Approved"
  };

  const [reportText, setReportText] = useState<string>("");

  const handleFormatDate = (date: string | Date) => {
    if (!date) return "";
    if (date instanceof Date) {
      return date.toLocaleDateString("en-GB");
    }

    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleDateString("en-GB");
    }
    return date;
  };

  const handleSubmit = () => {
    if (!reportText.trim()) {
      Alert.alert("Report Required", "Please describe your concerns before submitting.");
      return;
    }

    Alert.alert("Report Submitted", "Your concern has been registered. We'll look into this immediately.");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Item Summary Card */}
        <View style={styles.itemCard}>
          <Image
            source={{ uri: rental.propertyImageUrl || "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400" }}
            style={styles.itemImage}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemPrice}>${rental.propertyPrice}/{rental.propertyRatePeriod}</Text>
            <Text style={styles.itemTitle} numberOfLines={1}>{rental.propertyTitle}</Text>
            <Text style={styles.itemDates}>
              {handleFormatDate(rental.startDate)} to {handleFormatDate(rental.endDate)}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{rental.status}</Text>
            </View>
          </View>
        </View>

        {/* Report Textbox Form */}
        <Text style={styles.sectionTitle}>Write your Report</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Type here..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={6}
          value={reportText}
          onChangeText={setReportText}
        />

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { marginRight: 8 },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#0F172A" },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10 },
  itemCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, marginBottom: 24 },
  itemImage: { width: 85, height: 85, borderRadius: 16 },
  itemDetails: { flex: 1, marginLeft: 16, justifyContent: "space-between" },
  itemPrice: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  itemTitle: { fontSize: 14, color: "#64748B", marginVertical: 2 },
  itemDates: { fontSize: 13, color: "#64748B" },
  statusBadge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusBadgeText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  textArea: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 16, minHeight: 180, textAlignVertical: "top", fontSize: 15, color: "#0F172A", marginBottom: 30 },
  submitButton: { backgroundColor: "#FF7A21", height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});