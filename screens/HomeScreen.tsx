import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { User } from "firebase/auth";

interface HomeScreenProps {
  user?: User | null;
  onSignOut?: () => void;
}

export default function HomeScreen({ user, onSignOut }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OOPA</Text>
      <Text style={styles.subtitle}>{user?.email ?? "Welcome"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 24,
  },
  title: {
    color: "green",
    fontSize: 48,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 24,
  },
});
