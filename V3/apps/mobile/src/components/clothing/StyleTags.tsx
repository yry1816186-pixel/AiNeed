import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme';

interface StyleTagsProps {
  styleTags: string[];
  occasionTags: string[];
  seasonTags: string[];
  material?: string;
}

interface TagGroupProps {
  label: string;
  tags: string[];
  accentColor?: string;
}

const TagGroup: React.FC<TagGroupProps> = ({ label, tags, accentColor }) => {
  if (tags.length === 0) return null;

  const bgColor = accentColor ? `${accentColor}10` : `${colors.accent}10`;
  const textColor = accentColor ?? colors.accent;

  return (
    <View style={styles.tagGroup}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.tagsRow}>
        {tags.map((tag) => (
          <View
            key={tag}
            style={[styles.tag, { backgroundColor: bgColor }]}
          >
            <Text style={[styles.tagText, { color: textColor }]}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const StyleTags: React.FC<StyleTagsProps> = ({
  styleTags,
  occasionTags,
  seasonTags,
  material,
}) => {
  const hasContent = styleTags.length > 0 || occasionTags.length > 0 || seasonTags.length > 0 || !!material;

  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      <TagGroup label="风格" tags={styleTags} accentColor={colors.accent} />
      <TagGroup label="场合" tags={occasionTags} accentColor={colors.info} />
      <TagGroup label="季节" tags={seasonTags} accentColor={colors.success} />
      {material && (
        <View style={styles.tagGroup}>
          <Text style={styles.groupLabel}>材质</Text>
          <Text style={styles.materialText}>{material}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  tagGroup: {
    gap: spacing.xs,
  },
  groupLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontWeight: '600' as const,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.xl,
  },
  tagText: {
    ...typography.caption,
    fontWeight: '500' as const,
  },
  materialText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
