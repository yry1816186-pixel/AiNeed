import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useDemoStore } from "../../stores/demoStore";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

export const DemoModeBanner: React.FC = () => {
  const demoMode = useDemoStore((s) => s.demoMode);

  if (!demoMode) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.banner}>
        <Text style={styles.text}>DEMO MODE</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingTop: 8,
  },
  banner: {
    backgroundColor: "rgba(234, 88, 12, 0.72)",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    color: DesignTokens.colors.neutral.white,
    letterSpacing: 1.5,
  },
});
