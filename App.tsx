import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import Constants from "expo-constants";
import { getAuth, onAuthStateChanged } from "firebase/auth";

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

import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { StripeProvider } from "@stripe/stripe-react-native";

import AppNavigator from "./navigation/appNavigator";

import useAuthSessionViewModel, {
  type AuthSessionViewModel,
} from "./viewModels/auth/useAuthSessionViewModel";

import { AuthProvider } from "./context/AuthContext";
import type { RootStackParamList } from "./types/navigation/navigationTypes";

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["oopa://"],
  config: {
    screens: {
      Subscription: "subscription",
    },
  },
};

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

  // Refresh the device token when the authenticated user changes.
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        return;
      }

      const isAndroidExpoGo =
        Platform.OS === "android" && Constants.expoGoConfig != null;

      if (isAndroidExpoGo) {
        console.info(
          "Remote push registration is unavailable in Android Expo Go. Use a development build to test push notifications."
        );
        return;
      }

      void import("./services/notification/pushNotificationService")
        .then(({ registerForPushNotificationsAsync }) =>
          registerForPushNotificationsAsync(user.uid)
        )
        .catch((error) => {
          console.error("Failed to initialize push notifications:", error);
        });
    });
    return unsubscribe;
  }, []);

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
              <NavigationContainer linking={linking}>
                <AppNavigator />
              </NavigationContainer>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </AuthProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}
