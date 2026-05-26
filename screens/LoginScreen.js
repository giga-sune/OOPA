import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import InputField from "../components/InputField";
import styles from "../styles/authStyles";
import useLoginViewModel from "../viewModels/auth/useLoginViewModel";

export default function LoginScreen({ onSwitch }) {
  const {
    email,
    setEmail,
    password,
    setPassword,
    onSubmit,
    loading,
    error,
  } = useLoginViewModel();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bonjour!</Text>

        {/* FIX: Moved the width style to a View wrapper so the Text element stays clean */}
        <View style={{ width: "80%" }}>
          <Text style={styles.subtitle}>
            Log In to your OOPA account to get the best gadgets
            and items at the cheapest rental rates
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>

        <InputField
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          active={email.length > 0}
        />

        <Text style={styles.label}>Password</Text>

        <InputField
          placeholder="Insert your password here"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!!error && (
          <Text style={{ color: "#DC2626", textAlign: "center" }}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            loading && { opacity: 0.7 },
          ]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Logging in..." : "Log in"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text
            style={{
              textAlign: "center",
              color: "#8B8B94",
            }}
          >
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onSwitch}
        >
          <Text style={styles.secondaryButtonText}>
            Create a new account
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}