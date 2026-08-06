import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Share,
  Clipboard,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Colors, Spacing } from "../styles/globalDesignSystem";

export default function InviteFriendScreen() {
  const navigation = useNavigation<any>();
  const dummyInviteLink = "https://oopa.ca/download?ref=invite_user";
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    Clipboard.setString(dummyInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join me on OOPA, the best app for renting items nearby! Check it out here: ${dummyInviteLink}`,
      });
    } catch (error) {
      console.error("Error sharing link:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Invite Friends</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Share OOPA with your friends and help them find or list rental items easily.
        </Text>

        <View style={styles.qrCard}>
          <View style={styles.qrPlaceholderBox}>
            <Ionicons name="qr-code-outline" size={110} color={Colors.primary} />
            <Text style={styles.qrSubText}>Scan to download OOPA</Text>
          </View>
        </View>

        <View style={styles.linkSection}>
          <Text style={styles.sectionLabel}>Or share your referral link</Text>
          <View style={styles.linkContainer}>
            <Text style={styles.linkText} numberOfLines={1}>{dummyInviteLink}</Text>
            <TouchableOpacity 
              style={styles.copyButton} 
              activeOpacity={0.8}
              onPress={handleCopyLink}
            >
              <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.shareButton} 
          activeOpacity={0.8}
          onPress={handleShareLink}
        >
          <Feather name="share-2" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>Share Invite Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 16, 
    paddingBottom: Spacing.xs,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  qrCard: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: Spacing.xl,
  },
  qrPlaceholderBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
  },
  qrSubText: {
    marginTop: Spacing.md,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  linkSection: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: Spacing.xs,
  },
  linkContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingLeft: Spacing.md,
    paddingRight: 4,
    height: 50,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
  },
  copyButton: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  shareButton: {
    width: "100%",
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});