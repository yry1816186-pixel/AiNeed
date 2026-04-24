import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

interface TryOnProgressProps {
  progress?: number;
  status?: string;
}

export const TryOnProgress: React.FC<TryOnProgressProps> = ({ progress = 0, status }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" />
    {status && <Text style={styles.text}>{status}</Text>}
    <Text style={styles.text}>{Math.round(progress * 100)}%</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: 20 },
  text: { marginTop: 8, fontSize: 14 },
});
