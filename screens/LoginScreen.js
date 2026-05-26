import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";

import InputField from "../components/InputField";
import styles from "../styles/authStyles";
import { Colors } from "../styles/globalDesignSystem";

export default function LoginScreen({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Bonjour!</Text>

        <Text style={[styles.subtitle, { width: "80%" }]}>
          Log In to your OOPA account to get the best gadgets
          and items at the cheapest rental rates
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

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            Log in
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text
            style={{
              textAlign: "center",
              color: Colors.subText,
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