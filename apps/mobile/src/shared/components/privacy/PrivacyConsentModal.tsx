import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius } from '../../../design-system/theme';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from '../../contexts/ThemeContext';

interface PrivacyConsentModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{"\uD83D\uDD12"}</Text>
          </View>

          <Text style={styles.title}>隐私保护承诺</Text>

          <Text style={styles.body}>
            你的照片仅用于体型分析和试衣效果生成，不会公开展示或分享给第三方。
          </Text>

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={onConfirm}
              accessibilityLabel="确认"
              accessibilityRole="button"
              style={styles.confirmButton}
            >
              <Text style={styles.confirmText}>确认</Text>
            </Pressable>

            <Pressable
              onPress={onCancel}
              accessibilityLabel="取消"
              accessibilityRole="button"
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing[5],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing[6],
    width: "100%",
    maxWidth: 360,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  icon: {
    fontSize: DesignTokens.typography.sizes['3xl'],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: Colors.neutral[900],
    textAlign: "center",
    marginBottom: Spacing[3],
  },
  body: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    lineHeight: 24,
    color: Colors.neutral[600],
    textAlign: "center",
    marginBottom: Spacing[6],
  },
  buttonContainer: {
    gap: Spacing[3],
  },
  confirmButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[3],
    minHeight: Spacing['2xl'],
    justifyContent: "center",
    alignItems: "center",
  },
  confirmText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[3],
    minHeight: Spacing['2xl'],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  cancelText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: Colors.neutral[600],
  },
}))

export default PrivacyConsentModal;
