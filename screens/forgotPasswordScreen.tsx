import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import InputField from "../components/InputField";
import styles from "../styles/authStyles";
import { Colors } from "../styles/globalDesignSystem";
import type { RootStackParamList } from "../types/navigation/navigationTypes";
import useForgotPasswordViewModel from "../viewModels/auth/useForgotPasswordViewModel";

type ForgotPasswordScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "ForgotPassword"
>;

export default function ForgotPasswordScreen({
  navigation,
  route,
}: ForgotPasswordScreenProps) {
  const { email, setEmail, onSubmit, loading, error, sent } =
    useForgotPasswordViewModel(route.params?.email);

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
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your account email and Firebase will send you a secure link to choose a new
          password.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <InputField
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          active={email.length > 0}
          keyboardType="email-address"
        />

        {!!error && (
          <Text style={{ color: Colors.error, textAlign: "center" }}>{error}</Text>
        )}

        {sent && (
          <View
            style={{
              backgroundColor: "#F0FDF4",
              borderColor: "#BBF7D0",
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Text style={{ color: "#166534", textAlign: "center", lineHeight: 22 }}>
              If an OOPA account uses this email, a password reset link has been sent. Check your
              inbox and spam folder.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.7 }]}
          onPress={onSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Sending..." : sent ? "Send again" : "Send reset link"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Return to login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
