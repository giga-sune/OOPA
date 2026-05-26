import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
} from "react-native";

// Import your custom design system objects
import {
  Colors,
  Typography,
  Radius,
  Spacing,
} from "../styles/globalDesignSystem";

export default function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  icon,
  active,
}) {
  return (
    <View
      style={[
        styles.container,
        active && styles.activeContainer,
      ]}
    >
      {/* Safe check for the icon */}
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}

      <TextInput
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 58,
    borderRadius: Radius.pill,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },

  activeContainer: {
    backgroundColor: Colors.activeInputBg,
    borderColor: Colors.primary,
  },

  icon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },

  input: {
    flex: 1,
    // FIX: Extract the font properties properly from the style object
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    color: Colors.text,
  },
});