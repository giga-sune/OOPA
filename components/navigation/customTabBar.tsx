import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../../types/navigation/navigationTypes";

import { Colors } from "../../styles/globalDesignSystem";

type IconName = React.ComponentProps<typeof Feather>["name"];

const icons: Record<keyof TabParamList, IconName> = {
  Home: "home",
  Search: "search",
  Post: "plus-square",
  Orders: "heart",
  Profile: "user",
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route) => {
        const isFocused = state.index === state.routes.indexOf(route);
        const label = route.name as keyof TabParamList;

        const isPost = label === "Post";

        const onPress = () => {
          const event = navigation.emit(
            {
              type: "tabPress",
              target: route.key,
            } as never
          ) as { defaultPrevented?: boolean };

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            activeOpacity={0.8}
          >
            <Feather
              name={icons[label]}
              size={24}
              color={
                isPost
                  ? Colors.primary
                  : isFocused
                    ? Colors.grayPrimary
                    : Colors.grayTertiary
              }
            />

            <Text
              style={{
                fontSize: 12,
                marginTop: 4,
                color: isPost
                  ? Colors.primary
                  : isFocused
                    ? Colors.grayPrimary
                    : Colors.grayTertiary,
                fontWeight: isFocused ? "600" : "400",
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
