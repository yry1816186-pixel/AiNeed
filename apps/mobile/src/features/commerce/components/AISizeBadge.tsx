import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SizeRecommendation } from '../../../services/api/commerce.api';
import { useTheme } from '../../../shared/contexts/ThemeContext';

interface AISizeBadgeProps {
  recommendation: SizeRecommendation;
}

export const AISizeBadge: React.FC<AISizeBadgeProps> = ({ recommendation }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
      <Text style={[styles.text, { color: colors.primary }]}>
        AI推荐: {recommendation.recommendedSize}
      </Text>
      {recommendation.confidence > 0 && (
        <Text style={[styles.confidence, { color: colors.textTertiary }]}>
          {Math.round(recommendation.confidence * 100)}%
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  confidence: {
    fontSize: 10,
  },
});
