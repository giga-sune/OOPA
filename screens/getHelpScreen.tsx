import React from "react";
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Linking 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Colors, Spacing } from "../styles/globalDesignSystem";

export default function GetHelpScreen() {
  const navigation = useNavigation<any>();

  const handleEmailSupport = () => {
    Linking.openURL("mailto:support@oopa.ca");
  };

  const handlePhoneSupport = () => {
    Linking.openURL("tel:+18005550199");
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
        
        <Text style={styles.headerTitle}>Get Help</Text>
        
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Need assistance with a rental or your account? Our support team is here to help you out.
        </Text>

        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8}
          onPress={handleEmailSupport}
        >
          <View style={styles.iconContainer}>
            <Feather name="mail" size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Email Support</Text>
            <Text style={styles.cardDetail}>support@oopa.ca</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          activeOpacity={0.8}
          onPress={handlePhoneSupport}
        >
          <View style={styles.iconContainer}>
            <Feather name="phone" size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Phone Support (Canada)</Text>
            <Text style={styles.cardDetail}>+1 (800) 555-0199</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#94A3B8" />
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
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  cardDetail: {
    fontSize: 14,
    color: "#64748B",
  },
});