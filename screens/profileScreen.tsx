import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors, Spacing, Radius } from "../styles/globalDesignSystem";
import { signOutUser } from "../services/auth/authService";
import { useAuth } from "../context/AuthContext";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const MENU_ITEMS: Array<{ icon: FeatherIconName; label: string }> = [
  { icon: "user", label: "Account setting" },
  { icon: "list", label: "My Listing" },
  { icon: "heart", label: "All Saved" },
  { icon: "star", label: "Ratings & Reviews" },
  { icon: "tag", label: "Subscriptions" },
  { icon: "user-plus", label: "Invite Friends" },
];

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
      <View style={styles.header}>
        <Image source={{ uri: "https://i.pravatar.cc/300" }} style={styles.avatar} />

        <Text style={styles.name}>Lucy Bond</Text>
        <Text style={styles.email}>{user?.email ?? "no email available"}</Text>
      </View>

      <View style={styles.card}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity key={i} style={styles.row}>
            <Feather name={item.icon} size={20} color={Colors.text} />
            <Text style={styles.label}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color="#9A9AA2" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.secondary}>
        <Feather name="help-circle" size={20} />
        <Text style={styles.secondaryText}>Get help</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Feather name="log-out" size={20} color="#DC2626" />
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
    gap: 16,
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
    fontWeight: "500",
    fontSize: 14,
  },

  secondary: {
    marginTop: Spacing.md,
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
    fontWeight: "500",
    fontSize: 14,
  },
});
