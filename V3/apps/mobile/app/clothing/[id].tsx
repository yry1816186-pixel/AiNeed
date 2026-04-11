import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Svg, Path } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';

export default function ClothingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.imagePlaceholder}>
        <Svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <Path
            d="M24 6L28 16H38L30 22.5L33 33L24 27L15 33L18 22.5L10 16H20L24 6Z"
            stroke={colors.gray400}
            strokeWidth="2"
          />
        </Svg>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>服装详情 #{id}</Text>
        <Text style={styles.brand}>品牌名称</Text>
        <Text style={styles.price}>¥299</Text>
      </View>

      <View style={styles.tags}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>春季</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>休闲</Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>简约</Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailTitle}>描述</Text>
        <Text style={styles.detailText}>
          这是一款精心设计的服装，适合多种场合穿着。面料舒适透气，版型修身显瘦。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    width: '100%',
    height: 360,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  brand: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  price: {
    ...typography.h2,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: `${colors.accent}10`,
  },
  tagText: {
    ...typography.caption,
    color: colors.accent,
  },
  detailSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  detailTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  detailText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
