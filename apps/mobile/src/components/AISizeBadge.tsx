import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { SizeRecommendation } from "../services/api/commerce.api";

interface AISizeBadgeProps {
  recommendation: SizeRecommendation;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F3EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5B8A72",
  },
  badgeSize: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3D5E4D",
  },
  detail: {
    marginTop: 4,
    padding: 8,
    backgroundColor: "#F5F5F3",
    borderRadius: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#73736D",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A18",
  },
  reasonText: {
    fontSize: 11,
    color: "#52524D",
  },
});

export const AISizeBadge: React.FC<AISizeBadgeProps> = ({ recommendation }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View>
      <TouchableOpacity
        style={styles.badge}
        onPress={() => setExpanded((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Text style={styles.badgeText}>AI推荐</Text>
        <Text style={styles.badgeSize}>{recommendation.recommendedSize}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detail}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>置信度</Text>
            <Text style={styles.detailValue}>{Math.round(recommendation.confidence * 100)}%</Text>
          </View>
          {recommendation.reasons.map((reason, index) => (
            <Text key={index} style={styles.reasonText}>
              {reason}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};
