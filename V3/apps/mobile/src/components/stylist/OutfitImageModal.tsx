import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Share,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Button, Text, Skeleton } from '../ui';
import { colors, spacing, radius, shadows, typography } from '../../theme';
import type { OutfitImageResult } from '../../services/outfit-image.service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OutfitImageModalProps {
  visible: boolean;
  onClose: () => void;
  isLoading: boolean;
  result: OutfitImageResult | null;
  error: string | null;
  onRegenerate: () => void;
}

export const OutfitImageModal: React.FC<OutfitImageModalProps> = ({
  visible,
  onClose,
  isLoading,
  result,
  error,
  onRegenerate,
}) => {
  const handleShare = async () => {
    if (!result?.imageUrl) return;

    try {
      await Share.share({
        message: result.imageUrl,
        title: 'AI穿搭效果图',
      });
    } catch {}
  };

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.skeletonImage}>
        <Skeleton width={SCREEN_WIDTH - spacing.xl * 2} height={SCREEN_WIDTH * 1.2} borderRadius={radius.xl} />
      </View>
      <View style={styles.loadingTextContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text variant="body" color={colors.textSecondary} style={styles.loadingText}>
          AI正在生成穿搭效果...
        </Text>
      </View>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text variant="h3" color={colors.textPrimary}>
        生成失败
      </Text>
      <Text variant="body2" color={colors.textTertiary} style={styles.errorMessage}>
        {error ?? '请稍后重试'}
      </Text>
      <Button variant="primary" size="medium" onPress={onRegenerate}>
        重新生成
      </Button>
    </View>
  );

  const renderResult = () => (
    <View style={styles.resultContainer}>
      {result?.imageUrl ? (
        <Image
          source={{ uri: result.imageUrl }}
          style={styles.resultImage}
          resizeMode="contain"
        />
      ) : null}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text variant="buttonSmall" color={colors.accent}>分享</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onRegenerate}>
          <Text variant="buttonSmall" color={colors.accent}>重新生成</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonPrimary} onPress={onClose}>
          <Text variant="buttonSmall" color={colors.white}>完成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text variant="h3" color={colors.textPrimary}>✕</Text>
          </TouchableOpacity>
          <Text variant="h3" color={colors.textPrimary}>穿搭效果图</Text>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading && renderLoading()}
        {error && !isLoading && renderError()}
        {result && !isLoading && !error && renderResult()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  skeletonImage: {
    marginBottom: spacing.xl,
  },
  loadingTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    marginTop: 0,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
  },
  resultImage: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: radius.xl,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  actionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  actionButtonPrimary: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
});
