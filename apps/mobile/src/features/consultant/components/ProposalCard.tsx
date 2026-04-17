import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens, Spacing, flatColors as colors } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface ProposalCardProps {
  title: string;
  summary: string;
  onViewProposal: () => void;
  onSaveToWardrobe: () => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  title,
  summary,
  onViewProposal,
  onSaveToWardrobe,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.summary} numberOfLines={3}>
        {summary}
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onViewProposal}>
          <Text style={styles.primaryBtnText}>查看方案</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onSaveToWardrobe}>
          <Text style={styles.secondaryBtnText}>保存到灵感衣橱</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  card: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: "colors.textPrimary",
    marginBottom: DesignTokens.spacing['1.5'],
  },
  summary: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: DesignTokens.spacing[3],
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  primaryBtn: {
    backgroundColor: "colors.primary",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
  },
  secondaryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "colors.primary",
  },
  secondaryBtnText: {
    color: "colors.primary",
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
  },
}))

export default ProposalCard;
