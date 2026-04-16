import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

interface ReasoningCardProps {
  reasons: string[];
  defaultExpanded?: boolean;
}

export const ReasoningCard: React.FC<ReasoningCardProps> = ({
  reasons,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const heightValue = useSharedValue(defaultExpanded ? 1 : 0);

  const toggleExpand = () => {
    setExpanded((prev) => !prev);
    heightValue.value = withTiming(expanded ? 0 : 1, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    maxHeight: heightValue.value * (reasons.length * 60),
    opacity: heightValue.value,
    overflow: "hidden",
  }));

  if (!reasons || reasons.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpand}>
        <Text style={styles.headerTitle}>Recommendation Reasoning</Text>
        <Text style={styles.expandIcon}>{expanded ? "Collapse" : "Expand"}</Text>
      </Pressable>

      {/* Always show first reason */}
      <Text style={styles.reasonText} numberOfLines={2}>
        {reasons[0]}
      </Text>

      {/* Expandable section */}
      <AnimatedView style={animatedStyle}>
        {reasons.slice(1).map((reason, idx) => (
          <Text key={idx} style={[styles.reasonText, styles.extraReason]}>
            {reason}
          </Text>
        ))}
      </AnimatedView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
  },
  expandIcon: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.brand.terracotta,
  },
  reasonText: {
    fontSize: DesignTokens.typography.sizes.sm,
    lineHeight: 18,
    color: DesignTokens.colors.neutral[600],
    marginBottom: 4,
  },
  extraReason: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
    paddingTop: 6,
  },
});
