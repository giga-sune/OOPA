import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "../screens/loginScreen";
import SignupScreen from "../screens/signupScreen";
import TabNavigator from "./tabNavigator";
import MyListingsScreen from "../screens/myListingScreen";
import DetailsScreen from "../screens/detailScreen";
import MapViewerScreen from "../screens/mapViewerScreen";
import CheckoutScreen from "../screens/checkoutScreen";
import LenderRequestDetailScreen from "../screens/lenderRequestDetailScreen";
import BorrowerOrderDetailScreen from "../screens/borrowerOrderDetailScreen";
import ReviewItemScreen from "../screens/reviewItemScreen";
import ReportItemScreen from "../screens/reportItemScreen";
import AllReviewsScreen from "../screens/allReviewScreen";
import ChatRoomScreen from "../screens/chatScreen";
import SubscriptionScreen from "../screens/subscriptionScreen";
import SavedItemsScreen from "../screens/savedItemsScreen";

import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../types/navigation/navigationTypes";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="MainApp" component={TabNavigator} />
          <Stack.Screen name="MyListings" component={MyListingsScreen} />
          <Stack.Screen name="SavedItemsScreen" component={SavedItemsScreen} />
          <Stack.Screen name="Details" component={DetailsScreen} />
          <Stack.Screen name="MapViewer" component={MapViewerScreen} />
          <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen name="LenderRequestDetailScreen" component={LenderRequestDetailScreen} />
          <Stack.Screen name="BorrowerOrderDetailScreen" component={BorrowerOrderDetailScreen} />
          <Stack.Screen name="ReviewItemScreen" component={ReviewItemScreen} />
          <Stack.Screen name="ReportItemScreen" component={ReportItemScreen} />
          <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoomScreen}
            options={{
              headerShown: true,
              headerTitleStyle: { fontWeight: "600" },
            }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
