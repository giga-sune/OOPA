import React from "react";
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  type StyleProp, 
  type ViewStyle, 
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { Colors, Typography, Radius, Spacing } from "../styles/globalDesignSystem";

export interface InputFieldProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  icon?: string;
  active?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  containerStyle?: StyleProp<ViewStyle>;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  autoCorrect?: boolean;
}

export default function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  icon,
  active,
  multiline,
  numberOfLines,
  containerStyle,
  keyboardType = "default",
  autoCapitalize,
  autoCorrect,
}: InputFieldProps) {
  return (
    <View style={[styles.container, active && styles.activeContainer, containerStyle]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}

      <TextInput
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={[styles.input, multiline && styles.multilineInput]}
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
    fontFamily: Typography.body.fontFamily,
    fontSize: Typography.body.fontSize,
    color: Colors.text,
    paddingVertical: 0,
  },
  multilineInput: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    height: "100%",
  },
});