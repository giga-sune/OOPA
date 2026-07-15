import "react-native-gesture-handler";
import React from "react";
import { useFonts } from "expo-font";

import {
  ActivityIndicator,
  Text,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  View,
} from "react-native";

import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { NavigationContainer } from "@react-navigation/native";
import { StripeProvider } from "@stripe/stripe-react-native";

import AppNavigator from "./navigation/appNavigator";

import useAuthSessionViewModel, {
  type AuthSessionViewModel,
} from "./viewModels/auth/useAuthSessionViewModel";

import { AuthProvider } from "./context/AuthContext";

export default function App() {
  const {
    initializing,
  }: AuthSessionViewModel = useAuthSessionViewModel();

  const [fontsLoaded] = useFonts({
    "SFProDisplay-Regular": require("./assets/fonts/SF-Pro-Display-Regular.otf"),
    "SFProDisplay-Medium": require("./assets/fonts/SF-Pro-Display-Medium.otf"),
    "SFProDisplay-Semibold": require("./assets/fonts/SF-Pro-Display-Semibold.otf"),
    "SFProDisplay-Bold": require("./assets/fonts/SF-Pro-Display-Bold.otf"),
  });

  if (initializing || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator
          size="large"
          color="#FF7A21"
        />
        <Text style={{ color: "#666" }}>
          Loading application...
        </Text>
      </View>
    );
  }

  return (
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
    >
      <SafeAreaProvider>
        <AuthProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: "#fcfcfc" }}>
            <StatusBar barStyle="dark-content" />

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </AuthProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
