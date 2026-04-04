import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInRight,
  SlideInLeft,
  SlideInRight,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker';

// 引入增强主题令牌
import { colors } from '../../theme/tokens/colors';
import { typography } from '../../theme/tokens/typography';
import { spacing } from '../../theme/tokens/spacing';
import { shadows } from '../../theme/tokens/shadows';
import { theme } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TryOnResult {
  id: string;
  personImage: string;
  clothingImage: string;
  resultImage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export const TryOnScreen: React.FC = () => {
  const navigation = useNavigation();
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [showAfter, setShowAfter] = useState(false); // Before/After 切换

  // 动画值
  const scaleValue = useSharedValue(1);

  // 模拟进度动画
  const simulateProgress = useCallback(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => setShowAfter(true), 500);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 300);
    return interval;
  }, []);

  const pickPersonImage = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('错误', response.errorMessage || '选择图片失败');
          return;
        }
        if (response.assets && response.assets[0]) {
          setPersonImage(response.assets[0].uri || null);
        }
      },
    );
  }, []);

  const pickClothingImage = useCallback(() => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      (response: ImagePickerResponse) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('错误', response.errorMessage || '选择图片失败');
          return;
        }
        if (response.assets && response.assets[0]) {
          setClothingImage(response.assets[0].uri || null);
        }
      },
    );
  }, []);

  const handleTryOn = useCallback(async () => {
    if (!personImage || !clothingImage) {
      Alert.alert('提示', '请先选择人物照片和服装图片');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setShowAfter(false);

    // 启动模拟进度
    const progressInterval = simulateProgress();

    try {
      // TODO: 调用实际API
      await new Promise((resolve) => setTimeout(resolve, 3000));

      setResult({
        id: Date.now().toString(),
        personImage: personImage!,
        clothingImage: clothingImage!,
        resultImage: personImage!, // 模拟结果
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('错误', '虚拟试衣失败，请检查后端服务是否运行');
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(100);
    }
  }, [personImage, clothingImage, simulateProgress]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ========== Hero Header ========== */}
      <Animated.View entering={FadeInUp.duration(600).springify()}>
        <View style={styles.headerSection}>
          <LinearGradient
            colors={[colors.gradients.oceanMint[0], colors.gradients.oceanMint[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>AI 虚拟试衣</Text>
              <Text style={styles.headerSubtitle}>上传照片即可体验黑科技试衣效果</Text>
              <View style={styles.headerBadge}>
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.headerBadgeText}>3秒出结果</Text>
              </View>
            </View>
            <Ionicons name="body-outline" size={80} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* ========== Step 1: 选择人物照片 ========== */}
      <Animated.View entering={SlideInLeft.delay(200).springify()}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>选择人物照片</Text>
          </View>

          <TouchableOpacity
            style={[styles.imagePicker, personImage && styles.imagePickerFilled]}
            onPress={pickPersonImage}
            activeOpacity={0.7}
          >
            {personImage ? (
              <>
                <Image source={{ uri: personImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changeButton}>
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.changeButtonText}>更换</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIconContainer}>
                  <Ionicons name="person-outline" size={40} color={colors.warmPrimary.ocean[400]} />
                </View>
                <Text style={styles.placeholderTitle}>点击选择人物照片</Text>
                <Text style={styles.placeholderSubtitle}>建议：全身照、正面站立、光线充足</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ========== Step 2: 选择服装图片 ========== */}
      <Animated.View entering={SlideInLeft.delay(300).springify()}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>选择服装图片</Text>
          </View>

          <TouchableOpacity
            style={[styles.imagePicker, clothingImage && styles.imagePickerFilled]}
            onPress={pickClothingImage}
            activeOpacity={0.7}
          >
            {clothingImage ? (
              <>
                <Image source={{ uri: clothingImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changeButton}>
                  <Ionicons name="images-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.changeButtonText}>更换</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.placeholder}>
                <View style={styles.placeholderIconContainer}>
                  <Ionicons name="shirt-outline" size={40} color={colors.warmPrimary.coral[400]} />
                </View>
                <Text style={styles.placeholderTitle}>点击选择服装图片</Text>
                <Text style={styles.placeholderSubtitle}>支持：上衣、裤子、连衣裙等单品类</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ========== 开始试衣按钮 ========== */}
      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <TouchableOpacity
          style={[
            styles.button,
            (!personImage || !clothingImage || isProcessing) && styles.buttonDisabled,
          ]}
          onPress={handleTryOn}
          disabled={!personImage || !clothingImage || isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <View style={styles.processingContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.buttonText}>AI 处理中... {Math.round(progress)}%</Text>
            </View>
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>开始 AI 试衣</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ========== 进度条（处理中显示）========== */}
      {isProcessing && (
        <Animated.View entering={FadeInUp.duration(300)}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        </Animated.View>
      )}

      {/* ========== 结果展示（Before/After 对比视图）========== */}
      {result && !isProcessing && (
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.warmPrimary.mint[500]} />
              <Text style={styles.resultTitle}>试衣完成！</Text>
            </View>

            {/* Before/After 对比卡片 */}
            <View style={styles.comparisonContainer}>
              {/* Before */}
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonLabel}>
                  <Text style={styles.comparisonLabelText}>原始照片</Text>
                </View>
                <Image
                  source={{ uri: result.personImage }}
                  style={styles.comparisonImage}
                />
              </View>

              {/* 箭头 */}
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={28} color={colors.brand.warmPrimary} />
              </View>

              {/* After */}
              <View style={[styles.comparisonCard, styles.comparisonCardAfter]}>
                <View style={[styles.comparisonLabel, styles.comparisonLabelAfter]}>
                  <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                  <Text style={[styles.comparisonLabelText, { color: '#FFFFFF' }]}>AI 试衣效果</Text>
                </View>
                <Image
                  source={{ uri: showAfter ? result.resultImage : result.personImage }}
                  style={styles.comparisonImage}
                />
                {!showAfter && (
                  <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={colors.warmPrimary.mint[500]} />
                    <Text style={styles.overlayText}>生成中...</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 操作按钮组 */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButtonSecondary}>
                <Ionicons name="share-social-outline" size={20} color={colors.warmPrimary.ocean[700]} />
                <Text style={styles.actionButtonTextSecondary}>分享结果</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonPrimary}>
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonTextPrimary}>保存到相册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
};

// ========== 样式表（使用新主题令牌）==========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing.layout.screenPadding,
    paddingBottom: 40,
  },

  // ===== Header =====
  headerSection: {
    marginBottom: spacing.layout.sectionGap,
    borderRadius: spacing.borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.presets.lg,
  },
  headerGradient: {
    padding: spacing.layout.modalPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  headerBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
    marginLeft: 6,
  },

  // ===== Section =====
  section: {
    marginBottom: spacing.layout.cardGap,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.warmPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.neutral[900],
  },

  // ===== Image Picker =====
  imagePicker: {
    borderRadius: spacing.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.neutral[300],
    borderStyle: 'dashed',
    backgroundColor: colors.neutral.white,
  },
  imagePickerFilled: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: colors.warmPrimary.mint[300],
  },
  placeholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.neutral[700],
    marginTop: 10,
  },
  placeholderSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 6,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  changeButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },

  // ===== Button =====
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.warmPrimary,
    borderRadius: spacing.borderRadius.xl,
    paddingVertical: 16,
    gap: 10,
    ...shadows.presets.lg,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  buttonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ===== Progress Bar =====
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.warmPrimary.mint[500],
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.warmPrimary.mint[600],
  },

  // ===== Result Section =====
  resultSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius['2xl'],
    padding: spacing.layout.cardPadding,
    ...shadows.presets.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
  },

  // Comparison Cards
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  comparisonCard: {
    flex: 1,
    borderRadius: spacing.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
  },
  comparisonCardAfter: {
    borderWidth: 2,
    borderColor: colors.warmPrimary.mint[400],
  },
  comparisonLabel: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  comparisonLabelAfter: {
    backgroundColor: colors.warmPrimary.mint[500],
  },
  comparisonLabelText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.neutral[700],
  },
  comparisonImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    resizeMode: 'cover',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warmPrimary.coral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Overlay for loading state
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  overlayText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium as any,
    color: colors.neutral[700],
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.warmPrimary.ocean[50],
    borderWidth: 1.5,
    borderColor: colors.warmPrimary.ocean[200],
  },
  actionButtonTextSecondary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.warmPrimary.ocean[700],
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.warmPrimary.mint[500],
    ...shadows.presets.md,
  },
  actionButtonTextPrimary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: '#FFFFFF',
  },
});

export default TryOnScreen;
