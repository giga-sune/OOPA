import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
} from "react-native";

import Colors from "../styles/colors";

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
      <Text style={styles.icon}>{icon}</Text>

      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9A9AA2"
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
    height: 58,
    borderRadius: 30,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  activeContainer: {
    backgroundColor: Colors.activeInputBg,
    borderColor: Colors.primary,
  },

  icon: {
    fontSize: 18,
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontSize: 17,
    color: Colors.text,
  },
});