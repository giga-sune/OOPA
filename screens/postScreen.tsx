import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import InputField from "../components/InputField";
import { Colors, Typography, Radius, Spacing, Shadows } from "../styles/globalDesignSystem";
import usePropertyViewModel from "../viewModels/property/usePropertyViewModel";

type ConditionType = "Like new" | "Good" | "Used";
type RatePeriodType = "week" | "month";

const { width } = Dimensions.get("window");
// Handles responsive spacing calculations for exactly 4 columns layout grids across device windows
const CONTAINER_PADDING = Spacing.lg;
const GRID_GAP = 12;
const TOTAL_GAPS_WIDTH = GRID_GAP * 3;
const AVAILABLE_WIDTH = width - CONTAINER_PADDING * 2 - TOTAL_GAPS_WIDTH;
const SQUARE_SIZE = AVAILABLE_WIDTH / 4;

export default function PostScreen() {
  const navigation = useNavigation<any>();
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  const conditionOptions: ConditionType[] = ["Like new", "Good", "Used"];
  const rateOptions: RatePeriodType[] = ["week", "month"];

  const {
    title,
    setTitle,
    description,
    setDescription,
    brand,
    setBrand,
    price,
    setPrice,
    priceType,
    setPriceType,
    condition,
    setCondition,
    ratePeriod,
    setRatePeriod,
    selectedImages,
    pickImage,
    removeImage,
    submitProperty,
    loading,
    error,
  } = usePropertyViewModel();

  const handlePublish = async () => {
    const wasSuccessful = await submitProperty();

    if (wasSuccessful) {
      Alert.alert(
        "Success!",
        "Your item has been successfully published.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Home");
            },
          },
        ],
        { cancelable: false }
      );
    }
  };

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

      {/* Wrapping Image Collection Grid (4 across width distribution limits) */}
      <View style={styles.gridWrapper}>
        {/* Render Trigger block first if index arrays fit under maximum bounds */}
        {selectedImages.length < 8 && (
          <TouchableOpacity
            style={[styles.imagePickerButton, { width: SQUARE_SIZE, height: SQUARE_SIZE }, loading && styles.disabledButton]}
            activeOpacity={0.7}
            onPress={() => {
              void pickImage();
            }}
            disabled={loading}
          >
            <Feather name="camera" size={24} color={Colors.grayPrimary || "#475569"} />
          </TouchableOpacity>
        )}

        {/* Existing file selection loop blocks mapping circular dismiss badges */}
        {selectedImages.map((uri, index) => (
          <View key={uri + index} style={[styles.tileItem, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
            <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.circleCrossBadge}
              activeOpacity={0.8}
              onPress={() => removeImage(index)}
              disabled={loading}
            >
              <Feather name="x" size={12} color="#000000" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

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
            onPress={() => {
              setShowConditionDropdown(!showConditionDropdown);
              setShowRateDropdown(false);
            }}
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

          {/* Side-by-Side Flex Combined Row Layout Block */}
          <View style={styles.priceLayoutRow}>
            <View style={styles.priceInputColumn} onFocus={() => setFocusedField("price")} onBlur={() => setFocusedField(null)}>
              <InputField
                placeholder="$ Price"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                active={focusedField === "price"}
              />
            </View>

            {/* Custom rate selection drop inline frame container */}
            <View style={styles.rateDropdownWrapper}>
              <TouchableOpacity
                style={[styles.rateInlineSelector, showRateDropdown && styles.activeDropdownSelector]}
                activeOpacity={0.8}
                onPress={() => {
                  setShowRateDropdown(!showRateDropdown);
                  setShowConditionDropdown(false);
                }}
              >
                <Text style={styles.rateSelectorLabel}>/ {ratePeriod}</Text>
                <Feather name="chevron-down" size={18} color={Colors.placeholder || "#94A3B8"} />
              </TouchableOpacity>

              {showRateDropdown && (
                <View style={styles.rateFloatingMenu}>
                  {rateOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={styles.rateFloatingItem}
                      onPress={() => {
                        setRatePeriod(option);
                        setShowRateDropdown(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, ratePeriod === option && styles.dropdownItemTextActive]}>
                        /{option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
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
        <TouchableOpacity
          style={[styles.publishButton, loading && { opacity: 0.7 }]}
          activeOpacity={0.8}
          disabled={loading}
          onPress={() => {
            void handlePublish();
          }}
        >
          <Text style={styles.publishButtonText}>
            {loading ? "Publishing..." : "Publish"}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
    paddingHorizontal: CONTAINER_PADDING,
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
  gridWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    marginBottom: Spacing.lg,
  },
  imagePickerButton: {
    backgroundColor: "#ECECEF",
    borderRadius: Radius.md || 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tileItem: {
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: Radius.md || 12,
  },
  circleCrossBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    ...Shadows.primary,
  },
  disabledButton: {
    opacity: 0.7,
  },
  form: {
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: Spacing.sm,
    position: "relative",
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
    borderRadius: Radius.pill || 28,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  activeDropdownSelector: {
    borderColor: Colors.primary || "#FF7A21",
    backgroundColor: Colors.activeInputBg || "#FFF8F5",
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
    zIndex: 60,
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
    color: Colors.primary || "#FF7A21",
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badge: {
    paddingVertical: 8,
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
  priceLayoutRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
    zIndex: 50,
  },
  priceInputColumn: {
    flex: 2.2,
  },
  rateDropdownWrapper: {
    flex: 1,
    position: "relative",
  },
  rateInlineSelector: {
    height: 58,
    borderRadius: Radius.pill || 28,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  rateSelectorLabel: {
    ...Typography.body,
    color: Colors.graySecondary || "#334155",
  },
  rateFloatingMenu: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: Radius.md || 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    zIndex: 110,
    ...Shadows.primary,
  },
  rateFloatingItem: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
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
  errorText: {
    color: "#DC2626",
    ...Typography.bodySmall,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});