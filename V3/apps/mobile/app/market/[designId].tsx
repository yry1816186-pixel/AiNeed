import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Loading } from '../../src/components/ui/Loading';
import { Button } from '../../src/components/ui/Button';
import {
  useDesignDetail,
  useToggleLike,
  useDownloadDesign,
  useReportDesign,
} from '../../src/hooks/useDesignMarket';
import {
  PRODUCT_TYPE_LABELS,
  REPORT_REASON_LABELS,
  type ReportReason,
} from '../../src/services/design-market.service';

const SCREEN_WIDTH = Dimensions.get('window').width;

const REPORT_REASONS: ReportReason[] = [
  'inappropriate',
  'copyright',
  'spam',
  'violence',
  'other',
];

export default function DesignDetailScreen() {
  const { designId } = useLocalSearchParams<{ designId: string }>();
  const router = useRouter();
  const toggleLike = useToggleLike();
  const downloadDesign = useDownloadDesign();
  const reportDesign = useReportDesign();

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reportDescription, setReportDescription] = useState('');

  const { data: design, isLoading, isError, refetch } = useDesignDetail(designId);

  if (!designId) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="body" color={colors.textTertiary}>参数错误</Text>
      </View>
    );
  }

  if (isLoading) {
    return <Loading variant="fullscreen" message="加载设计详情..." />;
  }

  if (isError || !design) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="h3" style={styles.errorTitle}>加载失败</Text>
        <Text variant="body2" color={colors.textTertiary}>请检查网络后重试</Text>
        <Button variant="primary" size="medium" onPress={() => refetch()} style={styles.errorButton}>
          重试
        </Button>
      </View>
    );
  }

  const handleLike = () => {
    toggleLike.mutate(designId);
  };

  const handleDownload = () => {
    downloadDesign.mutate(designId);
  };

  const handleUseForCustomize = () => {
    router.push({
      pathname: '/customize/editor',
      params: { designId },
    });
  };

  const handleReport = () => {
    setReportModalVisible(true);
  };

  const submitReport = () => {
    if (!selectedReason) return;
    reportDesign.mutate(
      {
        designId,
        params: {
          reason: selectedReason,
          description: reportDescription || undefined,
        },
      },
      {
        onSuccess: () => {
          setReportModalVisible(false);
          setSelectedReason(null);
          setReportDescription('');
        },
      },
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.previewContainer}>
          {design.previewImageUrl ? (
            <Image
              source={{ uri: design.previewImageUrl }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text variant="h3" color={colors.textTertiary}>
                {PRODUCT_TYPE_LABELS[design.productType] ?? design.productType}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text variant="h2" weight="700" style={styles.designName}>
              {design.name}
            </Text>
            <TouchableOpacity
              onPress={handleLike}
              style={styles.likeButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={design.isLiked ? '取消点赞' : '点赞'}
            >
              <Text variant="h3" color={design.isLiked ? colors.accent : colors.textTertiary}>
                {design.isLiked ? '♥' : '♡'}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {design.likesCount}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.designerCard}>
            {design.designer.avatarUrl ? (
              <Image
                source={{ uri: design.designer.avatarUrl }}
                style={styles.designerAvatar}
              />
            ) : (
              <View style={styles.designerAvatarPlaceholder} />
            )}
            <View style={styles.designerInfo}>
              <Text variant="body" weight="600">
                {design.designer.nickname ?? '匿名设计师'}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>
                {PRODUCT_TYPE_LABELS[design.productType] ?? design.productType}
              </Text>
            </View>
          </View>

          {design.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {design.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text variant="caption" color={colors.accent}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="h3" weight="700" color={colors.primary}>
                {design.likesCount}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>点赞</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="h3" weight="700" color={colors.primary}>
                {design.downloadsCount}
              </Text>
              <Text variant="caption" color={colors.textTertiary}>下载</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleReport} style={styles.reportButton} activeOpacity={0.7}>
            <Text variant="caption" color={colors.textTertiary}>
              举报此设计
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, shadows.md]}>
        <TouchableOpacity
          onPress={handleDownload}
          style={styles.downloadButton}
          activeOpacity={0.7}
          disabled={downloadDesign.isPending}
          accessibilityRole="button"
          accessibilityLabel="下载设计"
        >
          <Text variant="buttonSmall" weight="600" color={colors.primary}>
            {downloadDesign.isPending ? '下载中...' : '免费下载'}
          </Text>
        </TouchableOpacity>
        <Button
          variant="primary"
          size="large"
          onPress={handleUseForCustomize}
          style={styles.customizeButton}
        >
          用这个定制
        </Button>
      </View>

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, shadows.modal]}>
            <View style={styles.modalHeader}>
              <Text variant="h3" weight="600">举报设计</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Text variant="body2" color={colors.textTertiary}>关闭</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reasonList}>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonItem,
                    selectedReason === reason && styles.reasonItemActive,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body2"
                    color={selectedReason === reason ? colors.accent : colors.textPrimary}
                  >
                    {REPORT_REASON_LABELS[reason]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              variant="primary"
              size="medium"
              fullWidth
              onPress={submitReport}
              disabled={!selectedReason || reportDesign.isPending}
            >
              {reportDesign.isPending ? '提交中...' : '提交举报'}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    marginBottom: spacing.xs,
  },
  errorButton: {
    marginTop: spacing.md,
  },
  previewContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: colors.backgroundSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  designName: {
    flex: 1,
    color: colors.primary,
    marginRight: spacing.md,
  },
  likeButton: {
    alignItems: 'center',
    gap: 2,
  },
  designerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
  },
  designerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
  },
  designerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
  },
  designerInfo: {
    gap: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accent + '10',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.divider,
  },
  reportButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  downloadButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizeButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonList: {
    gap: spacing.sm,
  },
  reasonItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSecondary,
  },
  reasonItemActive: {
    backgroundColor: colors.accent + '15',
    borderWidth: 1,
    borderColor: colors.accent,
  },
});
