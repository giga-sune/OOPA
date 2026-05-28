import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

import { Colors, Spacing, Radius } from "../styles/globalDesignSystem";
import { Ionicons } from "@expo/vector-icons";
import { signOutUser } from "../services/auth/authService";
import { useAuth } from "../context/AuthContext";

export default function ProfileScreen() {
    const { user } = useAuth();

    const handleLogout = async () => {
        try {
          await signOutUser();
        } catch (error) {
          console.log(error);
        }
      };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: "https://i.pravatar.cc/300" }}
          style={styles.avatar}
        />

        <Text style={styles.name}>Lucy Bond</Text>
        <Text style={styles.email}>{user?.email ?? "no email available"}</Text>
      </View>

      {/* Menu */}
      <View style={styles.card}>
        {[
          { icon: "person-outline", label: "Account setting" },
          { icon: "list-outline", label: "My Listing" },
          { icon: "heart-outline", label: "All Saved" },
          { icon: "star-outline", label: "Ratings & Reviews" },
          { icon: "pricetag-outline", label: "Subscriptions" },
          { icon: "person-add-outline", label: "Invite Friends" },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.row}>
            <Ionicons name={item.icon} size={20} color={Colors.text} />
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9A9AA2" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Actions */}

      <TouchableOpacity style={styles.secondary}>
        <Ionicons name="help-circle-outline" size={20} />
        <Text style={styles.secondaryText}>Get help</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fcfcfc",
  },

  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: Spacing.md,
  },

  name: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },

  email: {
    color: Colors.subText,
    marginTop: 4,
  },

  card: {
    backgroundColor: Colors.menu,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: 18,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },

  label: {
    flex: 1,
    marginLeft: 12,
    color: Colors.text,
  },

  secondary: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.menu,
    borderRadius: Radius.lg,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  logout: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    backgroundColor: Colors.menu,
    borderRadius: Radius.lg,
  },

  logoutText: {
    color: "#DC2626",
    fontWeight: "600",
  },

  secondaryText: {
    color: Colors.text,
  },
});