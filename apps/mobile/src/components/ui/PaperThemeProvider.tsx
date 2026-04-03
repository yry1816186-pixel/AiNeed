import React from "react";
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from "react-native-paper";
import { useColorScheme } from "react-native";
import { Colors } from "../../theme";

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary[500],
    primaryContainer: Colors.primary[100],
    secondary: Colors.accent[500],
    secondaryContainer: Colors.accent[100],
    tertiary: Colors.rose[500],
    tertiaryContainer: Colors.rose[100],
    surface: Colors.neutral[0],
    surfaceVariant: Colors.neutral[50],
    surfaceDisabled: Colors.neutral[100],
    background: Colors.neutral[50],
    error: Colors.error[500],
    errorContainer: Colors.error[100],
    onPrimary: Colors.neutral[0],
    onPrimaryContainer: Colors.primary[900],
    onSecondary: Colors.neutral[0],
    onSecondaryContainer: Colors.accent[900],
    onTertiary: Colors.neutral[0],
    onTertiaryContainer: Colors.rose[900],
    onSurface: Colors.neutral[900],
    onSurfaceVariant: Colors.neutral[600],
    onSurfaceDisabled: Colors.neutral[400],
    onBackground: Colors.neutral[900],
    onError: Colors.neutral[0],
    onErrorContainer: Colors.error[900],
    outline: Colors.neutral[300],
    outlineVariant: Colors.neutral[200],
    inverseSurface: Colors.neutral[800],
    inverseOnSurface: Colors.neutral[100],
    inversePrimary: Colors.primary[300],
    elevation: {
      level0: "transparent",
      level1: Colors.neutral[0],
      level2: Colors.neutral[0],
      level3: Colors.neutral[0],
      level4: Colors.neutral[0],
      level5: Colors.neutral[0],
    },
  },
  roundness: 12,
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary[400],
    primaryContainer: Colors.primary[900],
    secondary: Colors.accent[400],
    secondaryContainer: Colors.accent[900],
    tertiary: Colors.rose[400],
    tertiaryContainer: Colors.rose[900],
    surface: Colors.neutral[900],
    surfaceVariant: Colors.neutral[800],
    surfaceDisabled: Colors.neutral[700],
    background: Colors.neutral[950],
    error: Colors.error[400],
    errorContainer: Colors.error[900],
    onPrimary: Colors.neutral[900],
    onPrimaryContainer: Colors.primary[100],
    onSecondary: Colors.neutral[900],
    onSecondaryContainer: Colors.accent[100],
    onTertiary: Colors.neutral[900],
    onTertiaryContainer: Colors.rose[100],
    onSurface: Colors.neutral[100],
    onSurfaceVariant: Colors.neutral[400],
    onSurfaceDisabled: Colors.neutral[600],
    onBackground: Colors.neutral[100],
    onError: Colors.neutral[900],
    onErrorContainer: Colors.error[100],
    outline: Colors.neutral[600],
    outlineVariant: Colors.neutral[700],
    inverseSurface: Colors.neutral[100],
    inverseOnSurface: Colors.neutral[900],
    inversePrimary: Colors.primary[600],
    elevation: {
      level0: "transparent",
      level1: Colors.neutral[800],
      level2: Colors.neutral[800],
      level3: Colors.neutral[800],
      level4: Colors.neutral[800],
      level5: Colors.neutral[800],
    },
  },
  roundness: 12,
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

export { lightTheme, darkTheme };
