import React from "react";

import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import InputField from "../components/InputField";
import styles from "../styles/authStyles";
import useSignupViewModel from "../viewModels/auth/useSignupViewModel";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

type SignupScreenProps = NativeStackScreenProps<RootStackParamList, "Signup">;

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const {
    userName,
    setUserName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    onSubmit,
    loading,
    error,
    fieldErrors,
  } = useSignupViewModel();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Let’s explore together!</Text>

        <Text style={styles.subtitle}>
          Create your OOPA account to explore rental items and complete your everyday hobbies.
        </Text>
      </View>

      <View style={styles.form}>

      <Text style={styles.label}>Username</Text>
        <InputField
          placeholder="Enter your username"
          value={userName}
          onChangeText={setUserName}
          active={userName.length > 0}
        />
        {!!fieldErrors.userName && (
          <Text style={{ color: "#DC2626", marginTop: -10 }}>
            {fieldErrors.userName}
          </Text>
        )}

        <Text style={styles.label}>Email</Text>
        <InputField
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          active={email.length > 0}
        />

        {!!fieldErrors.email && (
          <Text
            style={{
              color: "#DC2626",
              marginTop: -10,
            }}
          >
            {fieldErrors.email}
          </Text>
        )}

        <Text style={styles.label}>Password</Text>

        <InputField
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {!!fieldErrors.password && (
          <Text
            style={{
              color: "#DC2626",
              marginTop: -10,
            }}
          >
            {fieldErrors.password}
          </Text>
        )}

        <Text style={styles.label}>Confirm Password</Text>

        <InputField
          placeholder="Re-enter your password here"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {!!fieldErrors.confirmPassword && (
          <Text
            style={{
              color: "#DC2626",
              marginTop: -10,
            }}
          >
            {fieldErrors.confirmPassword}
          </Text>
        )}

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
          <Text style={styles.primaryButtonText}>
            {loading ? "Creating Account..." : "Create Account"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
