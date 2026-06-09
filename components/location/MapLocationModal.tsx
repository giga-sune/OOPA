import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Keyboard,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";

import { Colors, Typography, Radius, Spacing, Shadows } from "../../styles/globalDesignSystem";
import { getReadableAddress, searchAddressCoordinates } from "../../services/location/locationService";

interface MapLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: { address: string; latitude: number; longitude: number }) => void;
}

export function MapLocationModal({ visible, onClose, onLocationSelect }: MapLocationModalProps) {
  const mapRef = useRef<MapView | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [markerCoords, setMarkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (visible) {
      void getUserCurrentLocation();
      setSearchQuery("");
    }
  }, [visible]);

  const getUserCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permissions are required to identify your meetup spot.");
        onClose();
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setMarkerCoords({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (err) {
      Alert.alert("Error", "Could not fetch your current coordinates position.");
      onClose();
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearching(true);

    const coords = await searchAddressCoordinates(searchQuery);
    setSearching(false);

    if (coords) {
      setMarkerCoords(coords);
      
      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }, 800);
    } else {
      Alert.alert("Not Found", "Could not find that location. Try specifying a city or postal code.");
    }
  };

  const handleMapPress = (e: any) => {
    setMarkerCoords(e.nativeEvent.coordinate);
  };

  const handleConfirmLocation = async () => {
    if (!markerCoords) return;
    
    setResolvingAddress(true);
    try {
      const readableAddress = await getReadableAddress(markerCoords.latitude, markerCoords.longitude);
      onLocationSelect({
        address: readableAddress,
        latitude: markerCoords.latitude,
        longitude: markerCoords.longitude,
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Geocoding Failure", err.message || "Could not save pinpoint choice mapping.");
    } finally {
      setResolvingAddress(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.sheetPanel}>
          <View style={styles.sheetHeader}>
          </View>

          {/* Address Input search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBarWrapper}>
              <Feather name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search street, city, or zip..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearchSubmit}
                clearButtonMode="while-editing"
              />
              {searching ? (
                <ActivityIndicator size="small" color={Colors.primary || "#FF7A21"} style={styles.searchLoader} />
              ) : (
                searchQuery.trim().length > 0 && (
                  <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchActionBtn}>
                    <Text style={styles.searchActionText}>Search</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          <View style={styles.mapFrameWrapper}>
            {loadingLocation ? (
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="small" color={Colors.primary || "#FF7A21"} />
                <Text style={styles.spinnerText}>Loading maps context...</Text>
              </View>
            ) : (
              markerCoords && (
                <MapView
                  ref={mapRef}
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={{
                    latitude: markerCoords.latitude,
                    longitude: markerCoords.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                  }}
                  onPress={handleMapPress}
                  showsUserLocation
                  showsMyLocationButton
                >
                  <Marker
                    coordinate={markerCoords}
                    draggable
                    onDragEnd={(e) => setMarkerCoords(e.nativeEvent.coordinate)}
                    title="Meetup Spot"
                  />
                </MapView>
              )
            )}
          </View>

          <View style={styles.actionFooter}>
            <TouchableOpacity style={styles.cancelActionBtn} onPress={onClose} disabled={resolvingAddress}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmActionBtn, !markerCoords && styles.disabledConfirmBtn]}
              onPress={handleConfirmLocation}
              disabled={!markerCoords || resolvingAddress}
            >
              {resolvingAddress ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Select Spot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetPanel: {
    height: "85%",
    backgroundColor: Colors.white || "#FFFFFF",
    borderTopLeftRadius: Radius.lg || 24,
    borderTopRightRadius: Radius.lg || 24,
    ...Shadows.primary,
  },
  sheetHeader: {
    alignItems: "center",
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  sheetTitle: {
    ...Typography.h3,
    color: Colors.grayPrimary || "#0F172A",
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.pill || 24,
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: "#0F172A",
    fontSize: 15,
  },
  searchLoader: {
    marginLeft: Spacing.xs,
  },
  searchActionBtn: {
    paddingHorizontal: Spacing.sm,
    height: "100%",
    justifyContent: "center",
  },
  searchActionText: {
    color: Colors.primary || "#FF7A21",
    fontWeight: "600",
    fontSize: 14,
  },
  mapFrameWrapper: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  spinnerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  spinnerText: {
    ...Typography.bodySmall,
    color: Colors.subText,
  },
  actionFooter: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.pill || 26,
    borderWidth: 1,
    borderColor: Colors.border || "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...Typography.button,
    color: Colors.graySecondary || "#334155",
  },
  confirmActionBtn: {
    flex: 1.5,
    height: 52,
    backgroundColor: Colors.primary || "#FF7A21",
    borderRadius: Radius.pill || 26,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledConfirmBtn: {
    opacity: 0.5,
  },
  confirmText: {
    ...Typography.button,
    color: Colors.white || "#FFFFFF",
    fontWeight: "600",
  },
});