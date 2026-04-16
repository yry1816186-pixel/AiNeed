import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../design-system/theme";

interface EmptyCartViewProps {
  onGoShopping: () => void;
}

export const EmptyCartView: React.FC<EmptyCartViewProps> = ({ onGoShopping }) => {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  heading: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    marginTop: 16,
  },
  body: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.tertiary,
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#FF4D4F",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
  },
});
