import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { DesignTokens } from "../../theme/tokens/design-tokens";

interface FeedbackModalProps {
  visible: boolean;
  onSubmit: (data: {
    action: "like" | "dislike";
    rating?: number;
    dislikeReason?: string;
  }) => void;
  onClose: () => void;
}

const DISLIKE_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_suitable", label: "Not suitable" },
  { value: "wrong_color", label: "Wrong color" },
  { value: "wrong_style", label: "Wrong style" },
  { value: "other", label: "Other" },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onSubmit,
  onClose,
}) => {
  const [action, setAction] = useState<"like" | "dislike" | null>(null);
  const [rating, setRating] = useState(0);
  const [dislikeReason, setDislikeReason] = useState<string | undefined>(undefined);

  const handleSubmit = () => {
    if (!action) return;
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
              <Text style={[styles.actionButtonText, action === "like" && styles.actionButtonTextActive]}>
                Like
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, action === "dislike" && styles.actionButtonActiveDislike]}
              onPress={() => setAction("dislike")}
            >
              <Text style={[styles.actionButtonText, action === "dislike" && styles.actionButtonTextDislike]}>
                Dislike
              </Text>
            </Pressable>
          </View>

          {/* Star rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} style={styles.starButton}>
                <Text style={[styles.star, star <= rating && styles.starActive]}>
                  {"★"}
                </Text>
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
                    style={[styles.reasonChip, dislikeReason === reason.value && styles.reasonChipActive]}
                    onPress={() => setDislikeReason(reason.value)}
                  >
                    <Text style={[styles.reasonChipText, dislikeReason === reason.value && styles.reasonChipTextActive]}>
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

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: { backgroundColor: DesignTokens.colors.backgrounds.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  title: { fontSize: 18, fontWeight: "600", color: DesignTokens.colors.neutral[900], marginBottom: 16, textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 16, marginBottom: 20, justifyContent: "center" },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: DesignTokens.colors.neutral[100], alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  actionButtonActive: { borderColor: DesignTokens.colors.semantic.success, backgroundColor: DesignTokens.colors.semantic.successLight },
  actionButtonActiveDislike: { borderColor: DesignTokens.colors.semantic.error, backgroundColor: DesignTokens.colors.semantic.errorLight },
  actionButtonText: { fontSize: 16, fontWeight: "500", color: DesignTokens.colors.neutral[600] },
  actionButtonTextActive: { color: DesignTokens.colors.semantic.success },
  actionButtonTextDislike: { color: DesignTokens.colors.semantic.error },
  ratingRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  starButton: { padding: 4 },
  star: { fontSize: 32, color: DesignTokens.colors.neutral[300] },
  starActive: { color: "#FFB800" },
  reasonsContainer: { marginBottom: 16 },
  reasonsTitle: { fontSize: 14, fontWeight: "500", color: DesignTokens.colors.neutral[700], marginBottom: 8 },
  reasonsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: DesignTokens.colors.neutral[100], borderWidth: 1, borderColor: "transparent" },
  reasonChipActive: { borderColor: DesignTokens.colors.brand.terracotta, backgroundColor: DesignTokens.colors.neutral[50] },
  reasonChipText: { fontSize: 13, color: DesignTokens.colors.neutral[600] },
  reasonChipTextActive: { color: DesignTokens.colors.brand.terracotta, fontWeight: "500" },
  submitButton: { backgroundColor: DesignTokens.colors.brand.terracotta, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 16, fontWeight: "600", color: DesignTokens.colors.neutral.white },
  closeButton: { alignItems: "center", paddingVertical: 10 },
  closeButtonText: { fontSize: 14, color: DesignTokens.colors.neutral[500] },
});
