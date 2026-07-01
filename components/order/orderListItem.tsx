import React, { useState } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { Radius, Spacing } from "../../styles/globalDesignSystem";

export interface OrderData {
  id: string;
  title: string;
  price: number;
  ratePeriod: string;
  startDate: string;
  endDate: string;
  status: "Pending..." | "Approved" | "Completed" | string;
  imageUrl?: string;
}

interface OrderListItemProps {
  item: OrderData;
  onReportPress?: (id: string) => void;
  onReviewPress?: (id: string) => void;
}

export default function OrderListItem({ item, onReportPress, onReviewPress }: OrderListItemProps) {
  const [imageLoading, setImageLoading] = useState(!!item.imageUrl);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Pending...":
        return { bg: "#F1F5F9", text: "#475569" };
      case "Approved":
        return { bg: "#F1F5F9", text: "#1E293B" };
      default:
        return { bg: "#F1F5F9", text: "#1E293B" };
    }
  };

  const statusColors = getStatusStyle(item.status);
  const showStatusBadge = item.status === "Pending..." || item.status === "Approved";

  return (
    <View style={styles.cardContainer}>
      <View style={styles.imageWrapper}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onLoadEnd={() => setImageLoading(false)}
          />
        ) : (
          <Image 
            source={require("../../assets/placeholder.png")} 
            style={styles.image} 
            resizeMode="cover" 
          />
        )}
        {imageLoading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="small" color="#FF7A21" />
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.priceText}>
          ${item.price}
          <Text style={styles.ratePeriodText}>/{item.ratePeriod}</Text>
        </Text>
        
        <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.dateText}>{item.startDate} to {item.endDate}</Text>

        {/*Action Row */}
        <View style={styles.actionsRow}>
          {/*Only renders for Pending or Approved */}
          {showStatusBadge ? (
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status}</Text>
            </View>
          ) : (
            // Empty view pushes buttons to the right using space-between alignment if badge is hidden
            <View /> 
          )}

          <View style={styles.buttonGroup}>
            {item.status === "Completed" && onReviewPress && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.reviewBtn]} 
                onPress={() => onReviewPress(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.reviewBtnText}>Review</Text>
              </TouchableOpacity>
            )}

            {(item.status === "Completed" || item.status === "Approved") && onReportPress && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.reportBtn]} 
                onPress={() => onReportPress(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.reportBtnText}>Report</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: "row",
    paddingVertical: Spacing.md || 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  imageWrapper: {
    width: 90,
    height: 90,
    borderRadius: Radius.md || 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F1F5F9",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  infoSection: {
    flex: 1,
    paddingLeft: Spacing.md || 16,
    justifyContent: "space-between",
  },
  priceText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratePeriodText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0F172A",
  },
  titleText: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
    marginTop: 1,
  },
  dateText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "400",
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
    marginTop: 6,
    minHeight: 30,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill || 99,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.pill || 99,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reportBtn: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  reportBtnText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "600",
  },
  reviewBtn: {
    backgroundColor: "#FF7A21",
    borderColor: "#FF7A21",
  },
  reviewBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});