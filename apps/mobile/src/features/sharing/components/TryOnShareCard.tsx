import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import ShareCardLayout from "./ShareCardLayout";
import { encodeMiniProgramPath } from "../utils/qr-encoder";
import { useSharePrivacy } from "../hooks/useSharePrivacy";

/**
 * Try-On Share Card
 *
 * Displays a try-on result image with AI review text.
 * Includes a privacy gate: before sharing, the user must confirm
 * that the share image only shows try-on effects and will not expose real photos.
 */

interface TryOnShareCardProps {
  tryOnImageUrl: string;
  aiReview: string;
  referrerId: string;
  tryOnId?: string;
}

const TryOnShareCard: React.FC<TryOnShareCardProps> = ({
  tryOnImageUrl,
  aiReview,
  referrerId,
  tryOnId,
}) => {
  const { hasConfirmed, showConfirm, requestConfirmation, confirm, cancel } = useSharePrivacy();

  const qrPath = encodeMiniProgramPath({
    referrerId,
    cardType: "tryon",
    cardId: tryOnId,
  });

  return (
    <View collapsable={false} style={styles.wrapper}>
      <ShareCardLayout qrPath={qrPath}>
        {/* Try-on result image */}
        <Image source={{ uri: tryOnImageUrl }} style={styles.tryOnImage} resizeMode="cover" />

        {/* AI review */}
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewLabel}>{"伊伊说"}</Text>
          <Text style={styles.reviewText} numberOfLines={3}>
            {aiReview}
          </Text>
        </View>

        {/* Share action button (triggers privacy gate) */}
        {!hasConfirmed ? (
          <TouchableOpacity
            style={styles.shareActionButton}
            onPress={requestConfirmation}
            activeOpacity={0.8}
          >
            <Text style={styles.shareActionText}>{"分享试衣效果"}</Text>
          </TouchableOpacity>
        ) : null}
      </ShareCardLayout>

      {/* Privacy confirmation modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={cancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.privacyDialog}>
            <Text style={styles.privacyTitle}>{"分享确认"}</Text>
            <Text style={styles.privacyText}>{"分享图仅展示试衣效果，不会暴露真实照片"}</Text>
            <View style={styles.privacyButtons}>
              <TouchableOpacity
                style={[styles.privacyButton, styles.cancelButton]}
                onPress={cancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>{"取消"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyButton, styles.confirmButton]}
                onPress={confirm}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>{"确认分享"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  tryOnImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  reviewContainer: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.brand.terracotta,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: DesignTokens.colors.text.secondary,
    lineHeight: 20,
  },
  shareActionButton: {
    backgroundColor: DesignTokens.colors.neutral[800],
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  shareActionText: {
    color: DesignTokens.colors.neutral.white,
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: DesignTokens.colors.backgrounds.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  privacyDialog: {
    backgroundColor: DesignTokens.colors.neutral.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  privacyText: {
    fontSize: 14,
    color: DesignTokens.colors.text.secondary,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  privacyButtons: {
    flexDirection: "row",
    gap: 12,
  },
  privacyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: DesignTokens.colors.text.secondary,
  },
  confirmButton: {
    backgroundColor: DesignTokens.colors.neutral[800],
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
});

export default TryOnShareCard;
