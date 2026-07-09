import React from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import type { Rental } from "../../types/rental/rentalTypes"; // 👈 Adjust path to your types file

interface OrderListItemProps {
  item: Rental; // 👈 Uses your friend's unified data model type definitions
  isIncomingRequest: boolean;
  onAcceptPress?: (id: string) => void;
  onDenyPress?: (id: string) => void;
  onReportPress: (id: string) => void;
  onReviewPress: (id: string) => void;
}

export default function OrderListItem({
  item,
  isIncomingRequest,
  onAcceptPress,
  onDenyPress,
  onReportPress,
  onReviewPress,
}: OrderListItemProps) {
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": return { bg: "#DCFCE7", text: "#15803D" }; // Matches friend's 'approved' literal state string
      case "rejected": return { bg: "#FEE2E2", text: "#B91C1C" }; // Matches friend's 'rejected' literal state string
      default: return { bg: "#FEF3C7", text: "#B45309" }; // Pending
    }
  };

  const badgeStyle = getStatusColor(item.status);

  return (
    <View style={styles.cardContainer}>
      <View style={styles.infoRow}>
        <Image 
          source={{ uri: item.propertyImageUrl || "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400" }} 
          style={styles.itemImage} 
        />
        
        <View style={styles.detailsColumn}>
          <View style={styles.titleBadgeRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.propertyTitle}</Text>
            
            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.statusText, { color: badgeStyle.text }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.dateText}>
            {item.startDate.toLocaleDateString("en-GB")} — {item.endDate.toLocaleDateString("en-GB")}
          </Text>
          <Text style={styles.priceText}>${item.totalPrice.toFixed(2)} total</Text>
        </View>
      </View>

      {/* Dynamic Action Controls */}
      {isIncomingRequest && item.status.toLowerCase() === "pending" ? (
        <View style={styles.actionButtonRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.denyBtn]} onPress={() => onDenyPress?.(item.id)}>
            <Text style={styles.denyBtnText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => onAcceptPress?.(item.id)}>
            <Text style={styles.acceptBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionButtonRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => onReportPress(item.id)}>
            <Text style={styles.secondaryBtnText}>Report</Text>
          </TouchableOpacity>
          {item.status.toLowerCase() === "approved" && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => onReviewPress(item.id)}>
              <Text style={styles.secondaryBtnText}>Leave Review</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#F1F5F9" },
  infoRow: { flexDirection: "row", gap: 12 },
  itemImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: "#F8FAFC" },
  detailsColumn: { flex: 1, justifyContent: "space-between" },
  titleBadgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  itemTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  dateText: { fontSize: 13, color: "#64748B", marginTop: 2 },
  priceText: { fontSize: 15, fontWeight: "700", color: "#FF7A21", marginTop: 4 },
  actionButtonRow: { flexDirection: "row", gap: 10, marginTop: 14, borderTopWidth: 1, borderColor: "#F1F5F9", paddingTop: 10 },
  actionBtn: { flex: 1, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  acceptBtn: { backgroundColor: "#FF7A21" },
  acceptBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  denyBtn: { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  denyBtnText: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  secondaryBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F8FAFC" },
  secondaryBtnText: { color: "#64748B", fontSize: 13, fontWeight: "500" },
});