import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../services/firebase/firebaseApp";

import { uploadImageToStorage } from "../services/storage/storageService";

import InputField from "../components/InputField";
import { Colors, Typography, Radius, Spacing, Shadows } from "../styles/globalDesignSystem";
import usePropertyViewModel from "../viewModels/property/usePropertyViewModel";

import { MapLocationModal } from "../components/location/MapLocationModal";

type ConditionType = "Like new" | "Good" | "Used";
type RatePeriodType = "week" | "month";

const { width } = Dimensions.get("window");

const CONTAINER_PADDING = Spacing.lg;
const GRID_GAP = 12;
const TOTAL_GAPS_WIDTH = GRID_GAP * 3;
const AVAILABLE_WIDTH = width - CONTAINER_PADDING * 2 - TOTAL_GAPS_WIDTH;
const SQUARE_SIZE = AVAILABLE_WIDTH / 4;

export default function PostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const isEditing = route.params?.isEditing ?? false;
  const propertyId = route.params?.id ?? null;

  const [fetchingData, setFetchingData] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const [editModeImages, setEditModeImages] = useState<string[]>([]);

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
    location,
    setLocation,
    generateDescription,
    submitProperty,
    aiLoading,
    aiError,
    loading,
    error,
  } = usePropertyViewModel();

  useEffect(() => {
    if (isEditing && propertyId) {
      const loadListingDetails = async () => {
        setFetchingData(true);
        try {
          const docRef = doc(db, "properties", propertyId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.brand) setBrand(data.brand);
            if (data.price) setPrice(String(data.price));
            if (data.priceType) setPriceType(data.priceType);
            if (data.condition) setCondition(data.condition as ConditionType);
            if (data.ratePeriod) setRatePeriod(data.ratePeriod as RatePeriodType);
            if (data.location) setLocation(data.location);
            
            if (Array.isArray(data.images)) {
              setEditModeImages(data.images);
            }
          } else {
            Alert.alert("Error", "The requested listing could not be found.");
            navigation.goBack();
          }
        } catch (err) {
          console.error(err);
        } finally {
          setFetchingData(false);
        }
      };

      void loadListingDetails();
    }
  }, [isEditing, propertyId]);

  const allDisplayedImages = isEditing 
    ? [...editModeImages, ...selectedImages]
    : selectedImages;

  const handleRemoveImageCombined = (index: number) => {
    if (isEditing) {
      if (index < editModeImages.length) {
        setEditModeImages((prev) => prev.filter((_, idx) => idx !== index));
      } else {
        const relativeNewIndex = index - editModeImages.length;
        removeImage(relativeNewIndex);
      }
    } else {
      removeImage(index);
    }
  };

  const handlePublish = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to modify listings.");
      return;
    }

    if (!location) {
      Alert.alert("Missing Location", "Please pinpoint your preferred meetup location prior to publishing.");
      return;
    }

    if (isEditing && propertyId) {
      if (allDisplayedImages.length === 0) {
        Alert.alert("Missing Images", "Please provide at least one image for your listing.");
        return;
      }

      setLocalLoading(true);
      try {
        const uploadedImageUrls: string[] = [...editModeImages];

        for (let i = 0; i < selectedImages.length; i++) {
          const localUri = selectedImages[i];
          const fileExtension = localUri.split(".").pop()?.toLowerCase() || "jpg";
          const imagePath = `properties/${currentUser.uid}/${Date.now()}_edit_img_${i}.${fileExtension}`;
          const downloadUrl = await uploadImageToStorage(localUri, imagePath);
          uploadedImageUrls.push(downloadUrl);
        }

        const propertyDocRef = doc(db, "properties", propertyId);
        
        await updateDoc(propertyDocRef, {
          title: title.trim(),
          description: description.trim(),
          brand: brand.trim(),
          condition,
          priceType,
          price: Number(price),
          ratePeriod,
          location,
          images: uploadedImageUrls,
          ownerUid: currentUser.uid,
          ownerDisplayName: currentUser.displayName || "Anonymous User",
          ownerPhotoURL: currentUser.photoURL || null,
          updatedAt: serverTimestamp(),
        });

        Alert.alert("Success!", "Your listing has been successfully updated.", [
          {
            text: "OK",
            onPress: () => {
              navigation.setParams({ id: undefined, isEditing: undefined });
              navigation.navigate("Home");
            },
          },
        ]);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Could not save updates. Please try again.");
      } finally {
        setLocalLoading(false);
      }
    } else {
      const wasSuccessful = await submitProperty();
      if (wasSuccessful) {
        Alert.alert("Success!", "Your item has been successfully published.", [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Home");
            },
          },
        ]);
      }
    }
  };

  const isScreenProcessing = loading || localLoading;

  if (fetchingData) {
    return (
      <View style={[styles.container, styles.centerLoader]}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading listing details...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{isEditing ? "Edit Listing" : "Create New Post"}</Text>
        <Text style={styles.subtitle}>
          {isEditing 
            ? "Update your items pricing, descriptive content, or pickup parameters below."
            : "Turn your idle gear into extra cash. Fill in the information below to put your item up for rent."}
        </Text>
      </View>

      <View style={styles.gridWrapper}>
        {allDisplayedImages.length < 8 && (
          <TouchableOpacity
            style={[styles.imagePickerButton, { width: SQUARE_SIZE, height: SQUARE_SIZE }, isScreenProcessing && styles.disabledButton]}
            activeOpacity={0.7}
            onPress={() => {
              void pickImage();
            }}
            disabled={isScreenProcessing}
          >
            <Feather name="camera" size={24} color={Colors.grayPrimary || "#475569"} />
          </TouchableOpacity>
        )}

        {allDisplayedImages.map((uri, index) => (
          <View key={uri + index} style={[styles.tileItem, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
            <Image source={{ uri }} style={styles.imagePreview} resizeMode="cover" />
            <TouchableOpacity
              style={styles.circleCrossBadge}
              activeOpacity={0.8}
              onPress={() => handleRemoveImageCombined(index)}
              disabled={isScreenProcessing}
            >
              <Feather name="x" size={12} color="#000000" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={styles.form}>

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
          <TouchableOpacity
            style={[
              styles.aiAssistButton,
              (aiLoading || isScreenProcessing) && styles.aiAssistButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={aiLoading || isScreenProcessing}
            onPress={() => {
              void generateDescription();
            }}
          >
            <Text style={styles.aiAssistButtonText}>
              {aiLoading ? "Writing..." : "AI Assist"}
            </Text>
          </TouchableOpacity>
          {aiError ? <Text style={styles.aiErrorText}>{aiError}</Text> : null}
        </View>

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

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Meeting location</Text>
          <TouchableOpacity
            style={styles.locationSelector}
            activeOpacity={0.8}
            onPress={() => {
              setShowMapModal(true);
              setShowConditionDropdown(false);
              setShowRateDropdown(false);
            }}
          >
            <Feather name="map" size={20} color={Colors.primary} style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {location && location.address ? location.address : "Select location"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.publishButton,
            (isScreenProcessing || aiLoading) && { opacity: 0.7 },
          ]}
          activeOpacity={0.8}
          disabled={isScreenProcessing || aiLoading}
          onPress={() => {
            void handlePublish();
          }}
        >
          <Text style={styles.publishButtonText}>
            {isScreenProcessing ? (isEditing ? "Updating..." : "Publishing...") : (isEditing ? "Update Post" : "Publish")}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

      </View>

      <MapLocationModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={(selectedLocation) => {
          setLocation(selectedLocation);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centerLoader: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
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
  aiAssistButton: {
    minHeight: 40,
    alignSelf: "flex-end",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  aiAssistButtonDisabled: {
    opacity: 0.6,
  },
  aiAssistButtonText: {
    ...Typography.bodySmall,
    color: Colors.primary,
    fontWeight: "600",
  },
  aiErrorText: {
    ...Typography.bodySmall,
    color: Colors.error,
    textAlign: "right",
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
