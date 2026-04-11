import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';
import { Loading } from '../ui/Loading';
import type { HotKeyword } from '../../services/search.service';

interface HotKeywordsProps {
  keywords: HotKeyword[];
  isLoading: boolean;
  onKeywordPress: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const HotKeywords: React.FC<HotKeywordsProps> = ({
  keywords,
  isLoading,
  onKeywordPress,
  style,
}) => {
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text variant="h3" style={styles.title}>热门搜索</Text>
        <Loading variant="inline" />
      </View>
    );
  }

  if (keywords.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <Path
              d="M8 1L10.1 5.3L14.8 5.9L11.4 9.2L12.2 13.9L8 11.7L3.8 13.9L4.6 9.2L1.2 5.9L5.9 5.3L8 1Z"
              fill={colors.accent}
            />
          </Svg>
          <Text variant="h3" style={styles.title}>热门搜索</Text>
        </View>
      </View>
      <ScrollView
        horizontal={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tagContainer}
      >
        <View style={styles.tagWrap}>
          {keywords.map((keyword, index) => (
            <TouchableOpacity
              key={keyword.id}
              onPress={() => onKeywordPress(keyword.text)}
              activeOpacity={0.7}
              style={[
                styles.tag,
                index < 3 && styles.tagHot,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`搜索 ${keyword.text}`}
            >
              {index < 3 && (
                <Text variant="caption" weight="700" style={styles.tagIndex}>
                  {index + 1}
                </Text>
              )}
              <Text
                variant="bodySmall"
                color={index < 3 ? colors.accent : colors.textSecondary}
                weight={index < 3 ? '500' : '400'}
              >
                {keyword.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
  },
  tagContainer: {
    paddingBottom: spacing.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
  },
  tagHot: {
    backgroundColor: `${colors.accent}10`,
  },
  tagIndex: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 14,
  },
});
