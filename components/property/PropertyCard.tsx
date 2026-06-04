import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Spacing, Radius } from "../../styles/globalDesignSystem";

interface PropertyCardProps {
  title: string;
  price: number;
  ratePeriod: "week" | "month" | string;
  imageUri?: string;
  onPress?: () => void;
}

export default function PropertyCard({
  title,
  price,
  ratePeriod,
  imageUri,
  onPress,
}: PropertyCardProps) {

  const displayImage = imageUri ?? "https://images.unsplash.com/photo-1544551763-46a013bb70d5";

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.95} onPress={onPress}>
      <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />

      <View style={styles.detailsContainer}>
        {/* Item Title */}
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>

        {/* Dynamic Pricing Layout */}
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>${price.toFixed(2)}</Text>
          <Text style={styles.priceLabel}>/ {ratePeriod}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    width: "100%",
    marginBottom: Spacing.md,
  },
  image: {
    width: "100%",
    height: 160,
  },
  detailsContainer: {
    padding: Spacing.md,
    gap: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.primary,
  },
  priceLabel: {
    fontSize: 13,
    color: Colors.subText,
    marginLeft: 4,
  },
});