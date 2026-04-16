import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { DesignTokens } from "../../../design-system/theme";

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: "DesignTokens.colors.neutral[50]",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "DesignTokens.colors.neutral[200]",
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: "DesignTokens.colors.text.primary",
    marginBottom: 6,
  },
  summary: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: "DesignTokens.colors.brand.terracotta",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: DesignTokens.colors.backgrounds.primary,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
  },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "DesignTokens.colors.brand.terracotta",
  },
  secondaryBtnText: {
    color: "DesignTokens.colors.brand.terracotta",
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
  },
});

export default ProposalCard;
