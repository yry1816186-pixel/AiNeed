import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "../../polyfills/expo-vector-icons";
import { Colors, Spacing, BorderRadius } from '../../design-system/theme';
import { useTheme, createStyles } from 'undefined';
import type { Template } from "../../stores/customizationEditorStore";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";

interface TemplateSelectorProps {
  templates: Template[];
  selectedId: string | null;
  onSelect: (template: Template) => void;
  isLoading?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedId,
  onSelect,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (templates.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="grid-outline" size={40} color={Colors.neutral[300]} />
        <Text style={styles.emptyText}>暂无可用模板</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {templates.map((template) => {
        const isSelected = selectedId === template.id;
        return (
          <TouchableOpacity
            key={template.id}
            style={[styles.templateCard, isSelected && styles.templateCardSelected]}
            onPress={() => onSelect(template)}
            activeOpacity={0.7}
          >
            <View style={[styles.templateIconContainer, isSelected && styles.templateIconSelected]}>
              <Ionicons
                name={
                  template.type === "tshirt"
                    ? "shirt-outline"
                    : template.type === "hat"
                    ? "baseball-outline"
                    : template.type === "shoes"
                    ? "footsteps-outline"
                    : template.type === "bag"
                    ? "bag-outline"
                    : template.type === "phone_case"
                    ? "phone-portrait-outline"
                    : "cafe-outline"
                }
                size={28}
                color={isSelected ? colors.surface : colors.primary}
              />
            </View>
            <Text style={[styles.templateName, isSelected && styles.templateNameSelected]}>
              {template.name}
            </Text>
            <Text style={styles.templatePrice}>{template.basePrice} CNY 起</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: Spacing[8],
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: Spacing[8],
    alignItems: "center",
  },
  emptyText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing[2],
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  templateCard: {
    width: 120,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[3],
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198, 123, 92, 0.06)",
  },
  templateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  templateIconSelected: {
    backgroundColor: colors.primary,
  },
  templateName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  templateNameSelected: {
    color: colors.primary,
  },
  templatePrice: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
});
