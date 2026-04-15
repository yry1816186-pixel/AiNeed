import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { Colors, theme } from '../design-system/theme';
import { DesignTokens } from "../../../theme/tokens/design-tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface DialogProps {
  visible: boolean;
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
  variant?: "default" | "danger" | "success";
}

export function Dialog({
  visible,
  title,
  message,
  icon,
  iconColor,
  confirmLabel = "确认",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  onClose,
  children,
  variant = "default",
}: DialogProps) {
  const getIconColor = () => {
    if (iconColor) {
      return iconColor;
    }
    switch (variant) {
      case "danger":
        return theme.colors.error;
      case "success":
        return theme.colors.success;
      default:
        return Colors.primary[500];
    }
  };

  const getConfirmButtonStyle = () => {
    switch (variant) {
      case "danger":
        return { backgroundColor: theme.colors.error };
      case "success":
        return { backgroundColor: theme.colors.success };
      default:
        return {};
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose || onCancel}>
      <TouchableWithoutFeedback onPress={onClose || onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              {icon && (
                <View style={[styles.iconContainer, { backgroundColor: `${getIconColor()}15` }]}>
                  <Ionicons name={icon} size={32} color={getIconColor()} />
                </View>
              )}
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
              {children}
              <View style={styles.actions}>
                {onCancel && (
                  <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelText}>{cancelLabel}</Text>
                  </TouchableOpacity>
                )}
                {onConfirm && (
                  <TouchableOpacity
                    style={[styles.confirmButton, getConfirmButtonStyle()]}
                    onPress={onConfirm}
                  >
                    <Text style={styles.confirmText}>{confirmLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// 确认对话框
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "default" | "danger";
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "确认",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      variant={variant}
      icon={variant === "danger" ? "warning" : "help-circle"}
    />
  );
}

// 成功对话框
interface SuccessDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  buttonLabel?: string;
  onClose: () => void;
}

export function SuccessDialog({
  visible,
  title,
  message,
  buttonLabel = "好的",
  onClose,
}: SuccessDialogProps) {
  return (
    <Dialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={buttonLabel}
      onConfirm={onClose}
      variant="success"
      icon="checkmark-circle"
    />
  );
}

// 错误对话框
interface ErrorDialogProps {
  visible: boolean;
  title?: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}

export function ErrorDialog({
  visible,
  title = "出错了",
  message,
  buttonLabel = "知道了",
  onClose,
}: ErrorDialogProps) {
  return (
    <Dialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={buttonLabel}
      onConfirm={onClose}
      variant="danger"
      icon="close-circle"
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    maxWidth: 340,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.neutral[100],
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.neutral[600],
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
});
