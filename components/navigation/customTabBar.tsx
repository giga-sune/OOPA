import React, { useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet, Keyboard, Animated, Platform } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { TabParamList } from "../../types/navigation/navigationTypes";
import { Colors } from "../../styles/globalDesignSystem";

type IconName = React.ComponentProps<typeof Feather>["name"];

const icons: Record<keyof TabParamList, IconName> = {
  Home: "home",
  Inbox: "message-square",
  Post: "plus-square",
  Orders: "heart",
  Profile: "user",
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // iOS "will" events keep the tab bar aligned with the keyboard animation.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: e ? e.duration : 250, // Match the keyboard animation when available.
        useNativeDriver: true,
      }).start();
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: e ? e.duration : 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [slideAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        },
      ]}
    >
      {state.routes.map((route) => {
        const isFocused = state.index === state.routes.indexOf(route);
        const label = route.name as keyof TabParamList;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
          } as never) as { defaultPrevented?: boolean };

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
                isFocused
                  ? Colors.primary
                  : Colors.grayTertiary
              }
            />

            <Text
              style={{
                fontSize: 12,
                marginTop: 4,
                color: isFocused
                  ? Colors.primary
                  : Colors.grayTertiary,
                fontWeight: isFocused ? "600" : "400",
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});