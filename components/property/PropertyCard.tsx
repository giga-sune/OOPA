import React, { useState } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors, Radius, Spacing } from "../../styles/globalDesignSystem";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    ratePeriod: string;
    images?: string[];
  };
  onPress?: () => void;
  showActions?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const { width } = Dimensions.get("window");
const CONTAINER_PADDING = Spacing.lg || 16;
const GRID_GAP = 12;
const CARD_WIDTH = (width - (CONTAINER_PADDING * 2) - GRID_GAP) / 2;

export default function PropertyCard({ 
  property, 
  onPress, 
  showActions = false, 
  onEdit, 
  onDelete 
}: PropertyCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  
  const hasRemoteImage = (property.images?.length ?? 0) > 0;
  
  const [imageLoading, setImageLoading] = useState(hasRemoteImage);
  
  const imageSource = hasRemoteImage && property.images
    ? { uri: property.images[0] }
    : require("../../assets/placeholder.png");

  const formatRatePeriod = (period: string) => {
    if (!period) return "";
    const cleanPeriod = period.toLowerCase();
    if (cleanPeriod === "month") return "mth";
    return cleanPeriod;
  };

  return (
    <TouchableOpacity style={styles.cardContainer} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.imageWrapper}>
        <Image 
          source={imageSource} 
          style={styles.cardImage} 
          resizeMode="cover" 
          onLoadEnd={() => setImageLoading(false)}
        />
        
        {imageLoading && (
          <View style={styles.imageLoaderOverlay}>
            <ActivityIndicator size="small" color="#FF7A21" />
          </View>
        )}
        {!showActions && (
          <TouchableOpacity 
            style={styles.heartOverlayButton} 
            activeOpacity={0.8}
            onPress={() => setIsLiked(!isLiked)}
          >
            <Feather 
              name="heart" 
              size={24} 
              color={isLiked ? "#FF3B30" : "#FFFFFF"} 
              style={isLiked ? styles.activeHeartShadow : styles.heartShadow}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.priceText}>
          ${property.price}
          <Text style={styles.rateText}>/{formatRatePeriod(property.ratePeriod)}</Text>
        </Text>

        <Text style={styles.titleText} numberOfLines={1}>
          {property.title}
        </Text>
      </View>

      {showActions && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]} 
            onPress={() => onEdit && onEdit(property.id)}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color="#0F172A" />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={() => onDelete && onDelete(property.id)}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={14} color="#DC2626" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    marginBottom: Spacing.md || 16,
    backgroundColor: "transparent",
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: Radius.md ?? 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9", 
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  heartOverlayButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },
  heartShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  activeHeartShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoSection: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  priceText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 24,
  },
  rateText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748B",
  },
  titleText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: "#F1F5F9", 
  },
  deleteButton: {
    backgroundColor: "#FEE2E2", 
  },
  editText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
});