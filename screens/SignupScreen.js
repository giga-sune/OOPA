import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import InputField from "../components/InputField";
import styles from "../styles/authStyles";

export default function SignupScreen({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={onSwitch}>
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>
          Let’s explore together!
        </Text>

        <Text style={styles.subtitle}>
          Create your OOPA account to explore rental
          items and complete your everyday hobbies.
        </Text>
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

        <Text style={styles.label}>
          Confirm Password
        </Text>

        <InputField
          placeholder="Re-enter your password here"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            Create Account
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}