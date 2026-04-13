import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens/colors';
import { typography } from '../../theme/tokens/typography';
import { spacing } from '../../theme/tokens/spacing';

export interface TagCloudTag {
  label: string;
  weight: number;
  active: boolean;
}

export interface TagCloudProps {
  tags: TagCloudTag[];
  accessibilityLabel?: string;
}

const getTagStyle = (weight: number, active: boolean) => {
  let fontSize: number;
  let paddingVertical: number;
  let paddingHorizontal: number;

  if (weight >= 0.8) {
    fontSize = 18;
    paddingVertical = 12;
    paddingHorizontal = 20;
  } else if (weight >= 0.6) {
    fontSize = 16;
    paddingVertical = 10;
    paddingHorizontal = 16;
  } else if (weight >= 0.4) {
    fontSize = 14;
    paddingVertical = 8;
    paddingHorizontal = 14;
  } else {
    fontSize = 12;
    paddingVertical = 6;
    paddingHorizontal = 12;
  }

  return {
    fontSize,
    paddingVertical,
    paddingHorizontal,
    backgroundColor: active ? colors.brand.warmPrimary : colors.neutral[100],
    color: active ? '#FFFFFF' : colors.neutral[600],
    borderColor: active ? colors.brand.warmPrimary : colors.neutral[200],
    borderWidth: 1,
  };
};

export const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  accessibilityLabel,
}) => {
  const defaultA11yLabel =
    accessibilityLabel || `标签云: ${tags.map(t => t.label).join(', ')}`;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={defaultA11yLabel}
      accessibilityRole="list"
    >
      {tags.map((tag, index) => {
        const tagStyle = getTagStyle(tag.weight, tag.active);

        return (
          <View
            key={`${tag.label}-${index}`}
            style={[
              styles.tag,
              {
                backgroundColor: tagStyle.backgroundColor,
                borderColor: tagStyle.borderColor,
                borderWidth: tagStyle.borderWidth,
                paddingVertical: tagStyle.paddingVertical,
                paddingHorizontal: tagStyle.paddingHorizontal,
              },
            ]}
            accessible={true}
            accessibilityLabel={`${tag.label}${tag.active ? ' 已选中' : ''}`}
            role="listitem"
          >
            <Text
              style={[
                styles.tagText,
                {
                  fontSize: tagStyle.fontSize,
                  color: tagStyle.color,
                },
              ]}
            >
              {tag.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.aliases.sm,
  },
  tag: {
    borderRadius: spacing.borderRadius.full,
    borderStyle: 'solid',
  },
  tagText: {
    fontWeight: '500' as const,
  },
});

export default TagCloud;
