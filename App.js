import React, { useState } from "react";
import { useFonts } from "expo-font";
import {
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  View,
  ActivityIndicator,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";

import { Colors } from "./styles/globalDesignSystem";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);

  const [fontsLoaded] = useFonts({
    "SFProDisplay-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
    "SFProDisplay-Medium": require("./assets/fonts/SF-Pro-Display-Medium.otf"),
    "SFProDisplay-Semibold": require("./assets/fonts/SF-Pro-Display-Semibold.otf"),
    "SFProDisplay-Bold": require("./assets/fonts/SF-Pro-Display-Bold.otf"),
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: Colors.background, // ✅ now using design system
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.background}
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