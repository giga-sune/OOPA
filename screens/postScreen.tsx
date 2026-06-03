import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import InputField from "../components/InputField";
import { Colors, Typography, Radius, Spacing, Shadows } from "../styles/globalDesignSystem";

type ConditionType = "Like new" | "Good" | "Used";

export default function PostScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<"Fixed" | "Flexible">("Fixed");
  
  // Condition states
  const [condition, setCondition] = useState<ConditionType | null>(null);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const conditionOptions: ConditionType[] = ["Like new", "Good", "Used"];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Create New Post</Text>
        <Text style={styles.subtitle}>
          Turn your idle gear into extra cash. Fill in the information below to put your item up for rent.
        </Text>
      </View>

      {/* Image Upload Placeholder Button */}
      <TouchableOpacity style={styles.imagePickerButton} activeOpacity={0.7} onPress={() => {}}>
        <Feather name="camera" size={32} color={Colors.grayPrimary} />
      </TouchableOpacity>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Title Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Title</Text>
          <View onFocus={() => setFocusedField("title")} onBlur={() => setFocusedField(null)}>
            <InputField
              placeholder="e.g. Camping tent"
              value={title}
              onChangeText={setTitle}
              active={focusedField === "title"}
            />
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <View onFocus={() => setFocusedField("description")} onBlur={() => setFocusedField(null)}>
            <InputField
              placeholder="Provide a detailed description of your item..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              active={focusedField === "description"}
              containerStyle={styles.descriptionContainer}
            />
          </View>
        </View>

        {/* Brand Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Brand</Text>
          <View onFocus={() => setFocusedField("brand")} onBlur={() => setFocusedField(null)}>
            <InputField
              placeholder="e.g. MountainWalkers"
              value={brand}
              onChangeText={setBrand}
              active={focusedField === "brand"}
            />
          </View>
        </View>

        {/* Condition Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Condition</Text>
          <TouchableOpacity 
            style={[styles.dropdownSelector, showConditionDropdown && styles.activeDropdownSelector]} 
            activeOpacity={0.8}
            onPress={() => setShowConditionDropdown(!showConditionDropdown)}
          >
            <Text style={[styles.dropdownPlaceholder, condition && { color: Colors.text }]}>
              {condition ?? "Choose one"}
            </Text>
            <Feather 
              name={showConditionDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={Colors.placeholder} 
            />
          </TouchableOpacity>

          {/* Expanded Dropdown Options Container */}
          {showConditionDropdown && (
            <View style={styles.dropdownMenu}>
              {conditionOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCondition(option);
                    setShowConditionDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, condition === option && styles.dropdownItemTextActive]}>
                    {option}
                  </Text>
                  {condition === option && (
                    <Feather name="check" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Price Section */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Price (CAD)</Text>
          
          <View style={styles.badgeRow}>
            <TouchableOpacity
              style={[styles.badge, priceType === "Fixed" && styles.badgeActive]}
              onPress={() => setPriceType("Fixed")}
            >
              <Text style={[styles.badgeText, priceType === "Fixed" && styles.badgeTextActive]}>Fixed</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.badge, priceType === "Flexible" && styles.badgeActive]}
              onPress={() => setPriceType("Flexible")}
            >
              <Text style={[styles.badgeText, priceType === "Flexible" && styles.badgeTextActive]}>Flexible</Text>
            </TouchableOpacity>
          </View>

          {/* Price Input Field with Numeric Numpad */}
          <View onFocus={() => setFocusedField("price")} onBlur={() => setFocusedField(null)}>
            <InputField
              placeholder="$ Price"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              active={focusedField === "price"}
            />
          </View>
        </View>

        {/* Meeting Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Meeting location</Text>
          <TouchableOpacity style={styles.locationSelector} activeOpacity={0.8} onPress={() => {}}>
            <Feather name="map" size={20} color={Colors.primary} style={styles.locationIcon} />
            <Text style={styles.locationText}>Select location</Text>
          </TouchableOpacity>
        </View>

        {/* Publish Button */}
        <TouchableOpacity style={styles.publishButton} activeOpacity={0.8} onPress={() => {}}>
          <Text style={styles.publishButtonText}>Publish</Text>
        </TouchableOpacity>


      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 100,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h1,
    color: Colors.grayPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.subText,
    lineHeight: 20,
  },
  imagePickerButton: {
    width: 90,
    height: 90,
    backgroundColor: "#ECECEF",
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    color: Colors.grayPrimary,
    fontWeight: "600",
  },
  descriptionContainer: {
    minHeight: 120,
    borderRadius: Radius.md,
    alignItems: "flex-start",
    paddingVertical: Spacing.xs,
  },
  dropdownSelector: {
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  activeDropdownSelector: {
    borderColor: Colors.primary,
    backgroundColor: Colors.activeInputBg,
  },
  dropdownPlaceholder: {
    ...Typography.body,
    color: Colors.placeholder,
  },
  dropdownMenu: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 2,
    overflow: "hidden",
  },
  dropdownItem: {
    height: 50,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  dropdownItemText: {
    ...Typography.bodySmall,
    color: Colors.graySecondary,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeActive: {
    backgroundColor: Colors.grayPrimary,
    borderColor: Colors.grayPrimary,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.graySecondary,
    fontWeight: "500",
  },
  badgeTextActive: {
    color: Colors.white,
  },
  locationSelector: {
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  locationIcon: {
    marginRight: Spacing.sm,
  },
  locationText: {
    ...Typography.body,
    color: Colors.primary,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  publishButton: {
    height: 58,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
    ...Shadows.primary,
  },
  publishButtonText: {
    color: Colors.white,
    ...Typography.button,
  },
});