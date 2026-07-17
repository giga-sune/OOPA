import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import useReviewViewModel from "../viewModels/review/useReviewViewModel";
import { MAX_REVIEW_TEXT_LENGTH, type ReviewRating } from "../types/review/reviewTypes";

type ReviewRentalSummary = {
  id: string;
  propertyTitle: string;
  propertyImageUrl: string | null;
  propertyRatePeriod: string;
  propertyPrice: number;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
};

type ParamList = {
  ReviewItemScreen: {
    rental: ReviewRentalSummary;
  };
};

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-GB");
}

export default function ReviewItemScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "ReviewItemScreen">>();
  const rental = route.params.rental;
  const {
    rating,
    reviewText,
    isSubmitting,
    errorMessage,
    setRating,
    setReviewText,
    submitReview,
  } = useReviewViewModel(rental.id);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.itemCard}>
          <Image
            source={{
              uri:
                rental.propertyImageUrl ||
                "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400",
            }}
            style={styles.itemImage}
          />
          <View style={styles.itemDetails}>
            <Text style={styles.itemPrice}>
              ${rental.propertyPrice}/{rental.propertyRatePeriod}
            </Text>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {rental.propertyTitle}
            </Text>
            <Text style={styles.itemDates}>
              {formatDate(rental.startDate)} to {formatDate(rental.endDate)}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{rental.status}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rate</Text>
        <View style={styles.heartContainer}>
          {([1, 2, 3, 4, 5] as ReviewRating[]).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setRating(value)}
              activeOpacity={0.7}
              disabled={isSubmitting}
            >
              <Ionicons
                name={value <= rating ? "heart" : "heart-outline"}
                size={40}
                color={value <= rating ? "#FF7A21" : "#64748B"}
                style={styles.heartIcon}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.reviewHeadingRow}>
          <Text style={styles.sectionTitle}>Write a Review</Text>
          <Text style={styles.characterCount}>
            {reviewText.length}/{MAX_REVIEW_TEXT_LENGTH}
          </Text>
        </View>
        <TextInput
          style={styles.textArea}
          placeholder="Type here..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={6}
          maxLength={MAX_REVIEW_TEXT_LENGTH}
          value={reviewText}
          onChangeText={setReviewText}
          editable={!isSubmitting}
        />

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={() => void submitReview()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
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
  scrollContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  itemCard: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, marginBottom: 24 },
  itemImage: { width: 85, height: 85, borderRadius: 16 },
  itemDetails: { flex: 1, marginLeft: 16, justifyContent: "space-between" },
  itemPrice: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  itemTitle: { fontSize: 14, color: "#64748B", marginVertical: 2 },
  itemDates: { fontSize: 13, color: "#64748B" },
  statusBadge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  statusBadgeText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginTop: 10, marginBottom: 12 },
  heartContainer: { flexDirection: "row", marginBottom: 24 },
  heartIcon: { marginRight: 12 },
  reviewHeadingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  characterCount: { color: "#64748B", fontSize: 13 },
  textArea: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 16, minHeight: 180, textAlignVertical: "top", fontSize: 15, color: "#0F172A", marginBottom: 12 },
  errorText: { color: "#DC2626", fontSize: 13, marginBottom: 16 },
  submitButton: { backgroundColor: "#FF7A21", height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
