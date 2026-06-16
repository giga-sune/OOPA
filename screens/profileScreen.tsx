import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { Colors, Spacing, Radius } from "../styles/globalDesignSystem";
import { signOutUser } from "../services/auth/authService";
import useProfileViewModel from "../viewModels/user/useProfileViewModel";

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
  const navigation = useNavigation<any>();

  const {
    profileData,
    currentUserId,
    avatarImageUri,
    loadingProfile,
    uploadingProfilePicture,
    error,
    onPickAndUploadProfilePicture,
  } = useProfileViewModel();

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.log(error);
    }
  };

  if (loadingProfile) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: avatarImageUri }}
          style={styles.avatar}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={[
            styles.editAvatarButton,
            (uploadingProfilePicture || !currentUserId) && styles.editAvatarButtonDisabled,
          ]}
          onPress={() => {
            void onPickAndUploadProfilePicture(currentUserId);
          }}
          disabled={uploadingProfilePicture || !currentUserId}
        >
          {uploadingProfilePicture ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Feather name="camera" size={16} color={Colors.text} />
          )}
          <Text style={styles.editAvatarText}>
            {uploadingProfilePicture ? "Updating Avatar..." : "Edit Avatar"}
          </Text>
        </TouchableOpacity>
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.name}>{profileData?.userName ?? "OOPA User"}</Text>
        <Text style={styles.email}>{profileData?.email ?? "no email available"}</Text>
      </View>

      <View style={styles.card}>
  {MENU_ITEMS.map((item, i) => (
    <TouchableOpacity 
      key={i} 
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => {
        if (item.label === "My Listing") {
          navigation.navigate("MyListings");
        } else {
          console.log(`Clicked on ${item.label}`);
        }
      }}
    >
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
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },

  header: {
    alignItems: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: Spacing.md,
  },

  editAvatarButton: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.menu,
    borderRadius: Radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  editAvatarButtonDisabled: {
    opacity: 0.7,
  },

  editAvatarText: {
    color: Colors.text,
    fontWeight: "600",
    fontSize: 14,
  },

  errorText: {
    color: "#DC2626",
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing.sm,
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