import { StyleSheet } from "react-native";
import {
  Colors,
  Typography,
  Radius,
  Spacing,
  Shadows,
} from "./globalDesignSystem";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  backButton: {
    marginBottom: Spacing.sm,
    width: 40,
  },

  backIcon: {
    ...Typography.h2,
    color: Colors.text,
    fontWeight: "300",
  },

  header: {
    marginBottom: Spacing.xl,
  },

  title: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  subtitle: {
    ...Typography.body,
    color: Colors.subText,
  },

  form: {
    gap: Spacing.lg,
  },

  label: {
    ...Typography.label,
    color: Colors.text,
    marginBottom: -8,
  },

  primaryButton: {
    height: 58,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.sm,
    ...Shadows.primary,
  },

  primaryButtonText: {
    color: Colors.white,
    ...Typography.button,
  },

  secondaryButton: {
    height: 58,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "#DADDE4",
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },

  secondaryButtonText: {
    ...Typography.body,
    color: "#475569",
  },

});