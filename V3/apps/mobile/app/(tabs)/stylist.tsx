import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';

interface CardOption {
  label: string;
  selected: boolean;
}

const OCCASIONS = ['工作', '约会', '运动', '休闲', '聚会', '校园'];
const BUDGETS = ['100内', '200内', '500内', '500+'];
const STYLES = ['简约', '韩系', '国潮', '日系', '欧美', '新中式'];

function SelectableCard({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.cardText, selected && styles.cardTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function StylistScreen() {
  const [occasions, setOccasions] = useState<boolean[]>(OCCASIONS.map(() => false));
  const [budget, setBudget] = useState<number | null>(null);
  const [styles_, setStyles] = useState<boolean[]>(STYLES.map(() => false));

  const toggleOccasion = (index: number) => {
    setOccasions((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const toggleStyle = (index: number) => {
    setStyles((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const hasSelection = occasions.some(Boolean) || budget !== null || styles_.some(Boolean);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>AI造型师</Text>
        <Text style={styles.subtitle}>告诉我你的需求，为你搭配</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今天要去哪里？</Text>
        <View style={styles.cardGrid}>
          {OCCASIONS.map((label, i) => (
            <SelectableCard
              key={label}
              label={label}
              selected={occasions[i]}
              onPress={() => toggleOccasion(i)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>预算范围？</Text>
        <View style={styles.budgetRow}>
          {BUDGETS.map((label, i) => (
            <SelectableCard
              key={label}
              label={label}
              selected={budget === i}
              onPress={() => setBudget(i)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>风格偏好？</Text>
        <View style={styles.cardGrid}>
          {STYLES.map((label, i) => (
            <SelectableCard
              key={label}
              label={label}
              selected={styles_[i]}
              onPress={() => toggleStyle(i)}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.generateButton, !hasSelection && styles.generateButtonDisabled]}
        activeOpacity={0.8}
      >
        <Text style={styles.generateButtonText}>生成搭配方案</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: `${colors.accent}10`,
    borderColor: colors.accent,
  },
  cardText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cardTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  generateButton: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + spacing.xs,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: colors.textDisabled,
  },
  generateButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
