import React, { useState } from "react";
import { useFonts } from "expo-font";
import {
  ActivityIndicator,
  Text,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  View,
} from "react-native";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import { signOutUser } from "./services/auth/authService";
import useAuthSessionViewModel from "./viewModels/auth/useAuthSessionViewModel";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, initializing, isAuthenticated } = useAuthSessionViewModel();

  // Load the fonts required by your Typography configuration
  const [fontsLoaded] = useFonts({
    "SFProDisplay-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
    "SFProDisplay-Medium": require("./assets/fonts/SF-Pro-Display-Medium.otf"),
    "SFProDisplay-Semibold": require("./assets/fonts/SF-Pro-Display-Semibold.otf"),
    "SFProDisplay-Bold": require("./assets/fonts/SF-Pro-Display-Bold.otf"),
  });

  const renderBody = () => {
    if (initializing || !fontsLoaded) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 10 }}>
          <ActivityIndicator size="large" color="#FF7A21" />
          <Text style={{ color: "#666" }}>Loading application...</Text>
        </View>
      );
    }

    if (isAuthenticated) {
      return <HomeScreen user={user} onSignOut={signOutUser} />;
    }

    return isLogin ? (
      <LoginScreen onSwitch={() => setIsLogin(false)} />
    ) : (
      <SignupScreen onSwitch={() => setIsLogin(true)} />
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F5F5" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {renderBody()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}