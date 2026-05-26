import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen({ user, onSignOut }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    setError("");
    setLoggingOut(true);

    try {
      await onSignOut();
    } catch (serviceError) {
      setError(
        serviceError?.message ??
          "Could not sign out. Please try again."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OOPA</Text>
      <Text style={styles.subtitle}>
        {user?.email ?? "Welcome"}
      </Text>

      {!!error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          loggingOut && { opacity: 0.7 },
        ]}
        onPress={handleSignOut}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Sign Out</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorText: {
    color: "#DC2626",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#475569",
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
