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
    fontSize: Typography.h2,
    color: Colors.text,
    fontWeight: "300",
  },

  header: {
    marginBottom: Spacing.xl,
  },

  title: {
    fontSize: Typography.h1,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.sm,
  },

  subtitle: {
    fontSize: Typography.body,
    lineHeight: 24,
    color: Colors.subText,
  },

  form: {
    gap: Spacing.lg,
  },

  label: {
    fontSize: Typography.label,
    color: Colors.text,
    fontWeight: "500",
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
    fontSize: Typography.button,
    fontWeight: "700",
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
    fontSize: Typography.body,
    fontFamily: "SFProDisplay-Semibold",
    fontWeight: "600",
    color: "#475569",
  },
});