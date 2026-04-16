import { DesignTokens } from "./design-tokens";
import { Platform } from "react-native";

export const ShadowPresets = {
  none: {},
  xs: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }),
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: {
      elevation: 12,
    },
  }),
  "2xl": Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2,
      shadowRadius: 32,
    },
    android: {
      elevation: 16,
    },
  }),
} as const;

export const GlowPresets = {
  primary: Platform.select({
    ios: {
      shadowColor: "#6366F1",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
  }),
  secondary: Platform.select({
    ios: {
      shadowColor: DesignTokens.colors.brand.camel,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
  }),
  success: Platform.select({
    ios: {
      shadowColor: "#10B981",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
  }),
  error: Platform.select({
    ios: {
      shadowColor: "#EF4444",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 10,
    },
  }),
} as const;

export const shadows = {
  presets: ShadowPresets,
  glows: GlowPresets,
};

export default shadows;
