import React, { useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";

import { Colors, Typography, Radius, Spacing, Shadows } from "../styles/globalDesignSystem";

export default function MapViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView | null>(null);

  const { latitude, longitude, address } = route.params;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: latitude,
          longitude: longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        showsUserLocation
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={address}
        />
      </MapView>

      <SafeAreaView style={styles.floatingHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={Colors.grayPrimary || "#0F172A"} />
        </TouchableOpacity>
      </SafeAreaView>

      <View style={styles.infoFooter}>
        <View style={styles.indicatorBar} />
        <Text style={styles.titleText}>Meetup Location</Text>
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={16} color={Colors.primary || "#FF7A21"} />
          <Text style={styles.addressBody} numberOfLines={2}>
            {address}
          </Text>
        </View>
        <Text style={styles.disclaimerText}>
          Meetup location provided by the listing owner.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  floatingHeader: {
    position: "absolute",
    top: Spacing.md || 12,
    left: Spacing.lg || 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill || 22,
    backgroundColor: Colors.white || "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.primary,
  },
  infoFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white || "#FFFFFF",
    borderTopLeftRadius: Radius.lg || 24,
    borderTopRightRadius: Radius.lg || 24,
    paddingHorizontal: Spacing.lg || 20,
    paddingTop: Spacing.md || 12,
    paddingBottom: Spacing.xl || 32,
    alignItems: "center",
    ...Shadows.primary,
  },
  indicatorBar: {
    width: 40,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: Spacing.md || 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.grayPrimary || "#0F172A",
    marginBottom: Spacing.sm || 8,
    alignSelf: "flex-start",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs || 6,
    backgroundColor: "#F1F5F9",
    padding: Spacing.md || 12,
    borderRadius: Radius.md || 12,
    width: "100%",
  },
  addressBody: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
    lineHeight: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: Spacing.md || 12,
    textAlign: "left",
    alignSelf: "flex-start",
    lineHeight: 16,
  },
});
