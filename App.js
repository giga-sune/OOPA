import React, { useState } from "react";
import {
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <SafeAreaProvider>
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F5F5F5",
      }}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F5F5F5"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {isLogin ? (
          <LoginScreen onSwitch={() => setIsLogin(false)} />
        ) : (
          <SignupScreen onSwitch={() => setIsLogin(true)} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}