import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface EmptyCartViewProps {
  onGoShopping: () => void;
}

export const EmptyCartView: React.FC<EmptyCartViewProps> = ({ onGoShopping }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.container}>
      <Ionicons name="cart-off" size={64} color={DesignTokens.colors.neutral[300]} />
      <Text style={styles.heading}>购物车空空如也</Text>
      <Text style={styles.body}>去发现喜欢的穿搭吧</Text>
      <TouchableOpacity style={styles.button} onPress={onGoShopping}>
        <Text style={styles.buttonText}>去逛逛</Text>
      </TouchableOpacity>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  heading: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 16,
  },
  body: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: "colors.error",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
}));
