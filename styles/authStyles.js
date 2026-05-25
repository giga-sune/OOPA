import { StyleSheet } from "react-native";
import Colors from "./colors";

export default StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },

  backButton: {
    marginBottom: 30,
    width: 32,
  },

  backIcon: {
    fontSize: 32,
    color: Colors.text,
    fontWeight: "300",
  },

  header: {
    marginBottom: 40,
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.subText,
  },

  form: {
    gap: 18,
  },

  label: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
    marginBottom: -8,
  },

  primaryButton: {
    height: 58,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,

    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 4,
  },

  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700",
  },

  secondaryButton: {
    height: 58,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#DADDE4",
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },

  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
  },
});