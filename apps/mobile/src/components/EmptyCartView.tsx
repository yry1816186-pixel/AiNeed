import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";

interface EmptyCartViewProps {
  onGoShopping: () => void;
}

export const EmptyCartView: React.FC<EmptyCartViewProps> = ({ onGoShopping }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="cart-off" size={64} color="#CCCCCC" />
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
    fontSize: 18,
    fontWeight: "600",
    color: "#333333",
    marginTop: 16,
  },
  body: {
    fontSize: 14,
    color: "#999999",
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
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
