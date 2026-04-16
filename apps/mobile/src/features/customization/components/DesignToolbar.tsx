import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { Colors, Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface DesignToolbarProps {
  onAddImage: () => void;
  onAddText: () => void;
  onDeleteLayer: () => void;
  onBringForward: () => void;
  onSendBack: () => void;
  canDelete: boolean;
}

export const DesignToolbar: React.FC<DesignToolbarProps> = ({
  onAddImage,
  onAddText,
  onDeleteLayer,
  onBringForward,
  onSendBack,
  canDelete,
}) => {
  const tools = [
    { icon: "image-outline", label: "图片", onPress: onAddImage, disabled: false },
    { icon: "text-outline", label: "文字", onPress: onAddText, disabled: false },
    {
      icon: "trash-outline",
      label: "删除",
      onPress: onDeleteLayer,
      disabled: !canDelete,
    },
    {
      icon: "arrow-up-outline",
      label: "上移",
      onPress: onBringForward,
      disabled: !canDelete,
    },
    {
      icon: "arrow-down-outline",
      label: "下移",
      onPress: onSendBack,
      disabled: !canDelete,
    },
  ];

  return (
    <View style={styles.container}>
      {tools.map((tool) => (
        <TouchableOpacity
          key={tool.label}
          style={[styles.toolButton, tool.disabled && styles.toolButtonDisabled]}
          onPress={tool.onPress}
          disabled={tool.disabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tool.icon}
            size={22}
            color={tool.disabled ? Colors.neutral[300] : colors.text}
          />
          <Text style={[styles.toolLabel, tool.disabled && styles.toolLabelDisabled]}>
            {tool.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[2],
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    minWidth: 52,
  },
  toolButtonDisabled: {
    opacity: 0.4,
  },
  toolLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toolLabelDisabled: {
    color: Colors.neutral[300],
  },
});
