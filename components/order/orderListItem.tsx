import React from "react";
import { StyleSheet, View, Text, Image, TouchableOpacity } from "react-native";
import type { Rental } from "../../types/rental/rentalTypes";
import type { RentalDecisionProgress } from "../../viewModels/rental/useOrdersViewModel";

interface OrderListItemProps {
  item: Rental;
  isIncomingRequest: boolean;
  decisionProgress: RentalDecisionProgress;
  acceptDisabled: boolean;
  denyDisabled: boolean;
  decisionLockMessage: string;
  onAcceptPress?: (id: string) => void;
  onDenyPress?: (id: string) => void;
  onReportPress: (id: string) => void;
  onReviewPress: (id: string) => void;
  onMessagePress: () => void;
}

export default function OrderListItem({
  item,
  isIncomingRequest,
  decisionProgress,
  acceptDisabled,
  denyDisabled,
  decisionLockMessage,
  onAcceptPress,
  onDenyPress,
  onReportPress,
  onReviewPress,
  onMessagePress,
}: OrderListItemProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved": return { bg: "#DCFCE7", text: "#15803D" };
      case "rejected": return { bg: "#FEE2E2", text: "#B91C1C" };
      default: return { bg: "#FEF3C7", text: "#B45309" }; // Pending
    }
  };

  const badgeStyle = getStatusColor(item.status);
  const normalizedStatus = item.status.toLowerCase();
  const canLeaveReview =
    !isIncomingRequest &&
    item.status.toLowerCase() === "approved";

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
      {isIncomingRequest ? (
        <>
          {normalizedStatus === "pending" ? (
            <View style={styles.actionButtonRow}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.denyBtn,
                  denyDisabled && styles.actionBtnDisabled,
                ]}
                onPress={() => onDenyPress?.(item.id)}
                disabled={denyDisabled}
              >
                <Text style={styles.denyBtnText}>
                  {decisionProgress === "rejecting" ? "Declining..." : "Decline"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.acceptBtn,
                  acceptDisabled && styles.actionBtnDisabled,
                ]}
                onPress={() => onAcceptPress?.(item.id)}
                disabled={acceptDisabled}
              >
                <Text style={styles.acceptBtnText}>
                  {decisionProgress === "approving" ? "Accepting..." : "Accept"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionButtonRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onMessagePress}>
                <Text style={styles.secondaryBtnText}>Message</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryBtn, styles.reportButton]} onPress={() => onReportPress(item.id)}>
                <Text style={styles.secondaryBtnText}>Report</Text>
              </TouchableOpacity>
            </View>
          )}

          {decisionLockMessage ? (
            <Text style={styles.paymentLockText}>
              {decisionLockMessage}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={styles.actionButtonRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => onReportPress(item.id)}>
            <Text style={styles.secondaryBtnText}>Report</Text>
          </TouchableOpacity>
          
          {normalizedStatus !== "pending" && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={onMessagePress}>
              <Text style={styles.secondaryBtnText}>Message</Text>
            </TouchableOpacity>
          )}

          {canLeaveReview && (
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
  actionButtonRow: { flexDirection: "row", gap: 10, marginTop: 14, borderTopWidth: 1, borderColor: "#F1F5F9", paddingTop: 10, flexWrap: "wrap" },
  actionBtn: { flex: 1, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  acceptBtn: { backgroundColor: "#FF7A21" },
  actionBtnDisabled: { opacity: 0.45 },
  acceptBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  denyBtn: { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  denyBtnText: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  secondaryBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F8FAFC" },
  secondaryBtnText: { color: "#64748B", fontSize: 13, fontWeight: "500" },
  paymentLockText: { color: "#64748B", fontSize: 12, marginTop: 8, textAlign: "center", width: "100%" },
  reportButton: { marginLeft: "auto" },
});
