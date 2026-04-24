/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { View, Text, Modal, Pressable } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { flatColors as colors } from "../../../design-system/theme";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface FeedbackModalProps {
  visible: boolean;
  onSubmit: (data: { action: "like" | "dislike"; rating?: number; dislikeReason?: string }) => void;
  onClose: () => void;
}

const DISLIKE_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_suitable", label: "Not suitable" },
  { value: "wrong_color", label: "Wrong color" },
  { value: "wrong_style", label: "Wrong style" },
  { value: "other", label: "Other" },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onSubmit, onClose }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [action, setAction] = useState<"like" | "dislike" | null>(null);
  const [rating, setRating] = useState(0);
  const [dislikeReason, setDislikeReason] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    const { colors } = useTheme();
    if (!action) {
      return;
    }
    onSubmit({
      action,
      rating: rating > 0 ? rating : undefined,
      dislikeReason,
    });
    setAction(null);
    setRating(0);
    setDislikeReason(undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Feedback</Text>

          {/* Like / Dislike */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, action === "like" && styles.actionButtonActive]}
              onPress={() => setAction("like")}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  action === "like" && styles.actionButtonTextActive,
                ]}
              >
                Like
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                action === "dislike" && styles.actionButtonActiveDislike,
              ]}
              onPress={() => setAction("dislike")}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  action === "dislike" && styles.actionButtonTextDislike,
                ]}
              >
                Dislike
              </Text>
            </Pressable>
          </View>

          {/* Star rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={32}
                  color={star <= rating ? "#FFB800" : DesignTokens.colors.neutral[300]}
                />
              </Pressable>
            ))}
          </View>

          {/* Dislike reasons */}
          {action === "dislike" && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.reasonsTitle}>Reason:</Text>
              <View style={styles.reasonsRow}>
                {DISLIKE_REASONS.map((reason) => (
                  <Pressable
                    key={reason.value}
                    style={[
                      styles.reasonChip,
                      dislikeReason === reason.value && styles.reasonChipActive,
                    ]}
                    onPress={() => setDislikeReason(reason.value)}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        dislikeReason === reason.value && styles.reasonChipTextActive,
                      ]}
                    >
                      {reason.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Submit */}
          <Pressable
            style={[styles.submitButton, !action && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!action}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </Pressable>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: 16,
    textAlign: "center",
  },
  actionRow: { flexDirection: "row", gap: 16, marginBottom: 20, justifyContent: "center" },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  actionButtonActive: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  actionButtonActiveDislike: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  actionButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[600],
  },
  actionButtonTextActive: { color: colors.success },
  actionButtonTextDislike: { color: colors.error },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  starButton: { padding: 4 },
  reasonsContainer: { marginBottom: 16 },
  reasonsTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[700],
    marginBottom: 8,
  },
  reasonsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    borderWidth: 1,
    borderColor: "transparent",
  },
  reasonChipActive: {
    borderColor: colors.primary,
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  reasonChipText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[600],
  },
  reasonChipTextActive: { color: colors.primary, fontWeight: "500" },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  closeButton: { alignItems: "center", paddingVertical: 10 },
  closeButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
  },
}));
