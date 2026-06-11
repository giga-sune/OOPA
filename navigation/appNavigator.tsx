import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/loginScreen";
import SignupScreen from "../screens/signupScreen";
import TabNavigator from "./tabNavigator";
import MyListingsScreen from "../screens/myListingScreen";

import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </>
      ) : (
        <>
        <Stack.Screen name="MainApp" component={TabNavigator} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
