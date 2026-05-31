import React from "react";
import { createBottomTabNavigator, type BottomTabBarProps } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/searchScreen";
import PostScreen from "../screens/postScreen";
import OrdersScreen from "../screens/ordersScreen";
import ProfileScreen from "../screens/profileScreen";

import CustomTabBar from "../components/navigation/customTabBar";
import type { TabParamList } from "../types/navigation/navigationTypes";

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props: BottomTabBarProps) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Post" component={PostScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
