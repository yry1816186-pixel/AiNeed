import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';

function HotTag({ label }: { label: string }) {
  return (
    <View style={styles.hotTag}>
      <Text style={styles.hotTagText}>{label}</Text>
    </View>
  );
}

function SearchResult({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultImage} />
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </View>
  );
}

const HOT_TAGS = ['春季穿搭', '通勤', '约会', '运动风', '韩系', '国潮'];
const SAMPLE_RESULTS = [
  { title: '白色衬衫', subtitle: '简约通勤风' },
  { title: '牛仔外套', subtitle: '休闲百搭' },
  { title: '黑色连衣裙', subtitle: '约会首选' },
  { title: '运动卫衣', subtitle: '活力满满' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <Circle cx="8" cy="8" r="5.5" stroke={colors.textTertiary} strokeWidth="1.5" />
          <Path d="M12 12L16 16" stroke={colors.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索服装、搭配、风格..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>热门搜索</Text>
          <View style={styles.hotTags}>
            {HOT_TAGS.map((tag) => (
              <HotTag key={tag} label={tag} />
            ))}
          </View>
        </View>

        {query.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>搜索结果</Text>
            {SAMPLE_RESULTS.map((result) => (
              <SearchResult key={result.title} title={result.title} subtitle={result.subtitle} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  hotTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hotTag: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
  },
  hotTagText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.md,
  },
  resultImage: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  resultSubtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
