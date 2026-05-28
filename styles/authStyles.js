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
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },

  backButton: {
    marginBottom: Spacing.xl,
    width: 32,
  },

  backIcon: {
    ...Typography.h2, // Unpacks all h2 font details
    color: Colors.text,
    fontWeight: "300",
  },

  header: {
    marginBottom: Spacing.xl,
  },

  title: {
    ...Typography.h1, // Unpacks all h1 font details
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  subtitle: {
    ...Typography.body, // Unpacks all body font details
    color: Colors.subText,
  },

  form: {
    gap: Spacing.lg,
  },

  label: {
    ...Typography.label, // Unpacks all label font details
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
    ...Shadows.primary, // Unpacks all shadow properties
  },

  primaryButtonText: {
    color: Colors.white,
    ...Typography.button, // Unpacks all button font details
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
    ...Typography.body, // Unpacks all body font details
    color: "#475569",
  },
});