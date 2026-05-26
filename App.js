import React, { useState } from "react";
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
  const { user, initializing, isAuthenticated } =
    useAuthSessionViewModel();

  const renderBody = () => {
    if (initializing) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityIndicator size="large" color="#77B255" />
          <Text style={{ color: "#666" }}>Loading session...</Text>
        </View>
      );
    }

    if (isAuthenticated) {
      return (
        <HomeScreen
          user={user}
          onSignOut={signOutUser}
        />
      );
    }

    return isLogin ? (
      <LoginScreen onSwitch={() => setIsLogin(false)} />
    ) : (
      <SignupScreen onSwitch={() => setIsLogin(true)} />
    );
  };

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
        {renderBody()}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}
