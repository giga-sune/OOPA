import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors, Spacing, Radius } from "../styles/globalDesignSystem";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleClearInput = () => {
    setSearchQuery("");
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Search</Text>
        </View>

        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBarContainer}>
            <Feather 
              name="search" 
              size={20} 
              color="#94A3B8" 
              style={styles.searchIcon} 
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your items..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"

              onSubmitEditing={() => console.log("Searching for:", searchQuery)} 
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={handleClearInput} 
                style={styles.clearButton}
                activeOpacity={0.7}
              >
                <Feather name="x-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.resultsContainer}>

        </View>

      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white || "#FFFFFF",
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg || 16,
    paddingTop: Spacing.xl || 24,
    paddingBottom: Spacing.xs || 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  searchBarWrapper: {
    paddingHorizontal: Spacing.lg || 16,
    paddingVertical: Spacing.sm || 12,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: Radius.pill || 100,
    paddingHorizontal: Spacing.md || 16,
    height: 54,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "400",
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg || 16,
  },
  placeholderState: {
    flex: 0.6,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "500",
    textAlign: "center",
  },
});