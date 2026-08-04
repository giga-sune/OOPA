import React from "react";

import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import InputField from "../components/InputField";
import styles from "../styles/authStyles";
import useLoginViewModel from "../viewModels/auth/useLoginViewModel";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { email, setEmail, password, setPassword, onSubmit, loading, error } =
    useLoginViewModel();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bonjour!</Text>

        <View style={{ width: "80%" }}>
          <Text style={styles.subtitle}>
            Log In to your OOPA account to get the best gadgets and items at the cheapest rental
            rates
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
          placeholder="Enter here"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!!error && (
          <Text
            style={{
              color: "#DC2626",
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Logging in..." : "Log in"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ForgotPassword", {
              email: email.trim() || undefined,
            })
          }
        >
          <Text
            style={{
              textAlign: "center",
              color: "#8B8B94",
            }}
          >
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.secondaryButtonText}>Create a new account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
