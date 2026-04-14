import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { SizeRecommendation } from "../services/api/commerce.api";

interface AISizeBadgeProps {
  recommendation: SizeRecommendation;
}

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
            <Text style={styles.detailValue}>
              {Math.round(recommendation.confidence * 100)}%
            </Text>
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
