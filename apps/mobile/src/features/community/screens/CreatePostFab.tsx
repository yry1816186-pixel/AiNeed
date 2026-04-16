import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { Spacing, flatColors as colors } from '../../../design-system/theme';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';



interface CreatePostFabProps {
  onPress: () => void;
}

function CreatePostFabInner({ onPress }: CreatePostFabProps) {
    const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={s.fab}
      onPress={onPress}
      accessibilityLabel="发布动态"
      accessibilityRole="button"
    >
      <Ionicons name="add" size={28} color={colors.surface} />
    </TouchableOpacity>
  );
}

export const CreatePostFab = React.memo(CreatePostFabInner);

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    right: DesignTokens.spacing[5],
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: Spacing.xs },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
