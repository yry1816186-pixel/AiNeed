import React, { useState, useCallback, useEffect, useRef } from "react";
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
} from "react-native";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import Animated, { FadeInUp, SlideInLeft } from "react-native-reanimated";
import Share from "react-native-share";
import {
  pickImageSecurely,
  ImageValidationError,
} from "../../utils/imagePicker";
import { photosApi } from "../../services/api/photos.api";
import { tryOnApi, type TryOnResult } from "../../services/api/tryon.api";
import { clothingApi } from "../../services/api/clothing.api";
import {
  wsService,
  type TryOnEventPayload,
  type TryOnProgressPayload,
} from "../../services/websocket";
import type { ClothingItem } from "../../types/clothing";
import { colors } from "../../theme/tokens/colors";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { typography } from "../../theme/tokens/typography";
import { spacing } from "../../theme/tokens/spacing";
import { shadows } from "../../theme/tokens/shadows";
import { TryOnProgress } from "../loading/TryOnProgress";

const { width: _SCREEN_WIDTH } = Dimensions.get("window");

const POLL_INTERVAL = 3000;
const POLL_MAX_ATTEMPTS = 60;
const _UPLOAD_TIMEOUT = 30000;
const TIP_ROTATION_INTERVAL = 5000;
const TIMEOUT_WARNING_MS = 30000;
const TIMEOUT_DEGRADE_MS = 60000;

const STYLE_TIPS = [
  "深色上衣配浅色下装，视觉拉长腿部比例",
  "同色系搭配更显高级感",
  "V 领上衣修饰脸型，适合圆脸和方脸",
  "高腰设计是显腿长的秘密武器",
  "叠穿时内搭比外搭长 2-3cm 更有层次",
  "暖色调适合暖肤色，冷色调适合冷肤色",
  "配饰是点睛之笔，一条腰带改变全身比例",
  "全身不超过 3 种主色调，简约即高级",
];

type TryOnPhase = "idle" | "uploading" | "queued" | "processing" | "completed" | "failed";

export const TryOnScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const routeParams = route.params as { clothingId?: string } | undefined;

  const [personImage, setPersonImage] = useState<string | null>(null);
  const [clothingImage, setClothingImage] = useState<string | null>(null);
  const [clothingItem, setClothingItem] = useState<ClothingItem | null>(null);
  const [phase, setPhase] = useState<TryOnPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTip, setCurrentTip] = useState(0);
  const [timeoutWarning, setTimeoutWarning] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  const wsUnsubscribeRef = useRef<(() => void) | null>(null);
  const wsProgressUnsubscribeRef = useRef<(() => void) | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (routeParams?.clothingId) {
      void loadClothingItem(routeParams.clothingId);
    }
    void wsService.connect();
    return () => {
      cleanup();
    };
  }, []);

  const loadClothingItem = useCallback(async (id: string) => {
    const response = await clothingApi.getById(id);
    if (response.success && response.data) {
      setClothingItem(response.data);
      if (response.data.imageUri) {
        setClothingImage(response.data.imageUri);
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (wsUnsubscribeRef.current) {
      wsUnsubscribeRef.current();
      wsUnsubscribeRef.current = null;
    }
    if (wsProgressUnsubscribeRef.current) {
      wsProgressUnsubscribeRef.current();
      wsProgressUnsubscribeRef.current = null;
    }
    if (tipTimerRef.current) {
      clearInterval(tipTimerRef.current);
      tipTimerRef.current = null;
    }
    setTimeoutWarning(null);
  }, []);

  const onTryOnResolved = useCallback(
    (tryOnId: string, status: "completed" | "failed", errorMessage?: string) => {
      cleanup();
      if (status === "completed") {
        setProgress(100);
        void tryOnApi.getStatus(tryOnId).then((statusResponse) => {
          if (statusResponse.success && statusResponse.data) {
            setResult(statusResponse.data);
          }
        });
        setPhase("completed");
      } else {
        setPhase("failed");
        setErrorMessage(errorMessage || "试衣处理失败");
      }
    },
    [cleanup]
  );

  const startPolling = useCallback(
    (tryOnId: string) => {
      pollAttemptsRef.current = 0;
      startTimeRef.current = Date.now();
      cleanup();

      wsUnsubscribeRef.current = wsService.onTryOnComplete(
        tryOnId,
        (payload: TryOnEventPayload) => {
          onTryOnResolved(tryOnId, payload.status, payload.errorMessage);
        }
      );

      wsProgressUnsubscribeRef.current = wsService.onTryOnProgress(
        tryOnId,
        (payload: TryOnProgressPayload) => {
          setProgress(payload.progress);
          if (payload.stage === "generating") {
            setPhase("processing");
          }
        }
      );

      tipTimerRef.current = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % STYLE_TIPS.length);
      }, TIP_ROTATION_INTERVAL);

      pollTimerRef.current = setInterval(async () => {
        pollAttemptsRef.current++;

        const elapsed = Date.now() - startTimeRef.current;
        if (elapsed > TIMEOUT_DEGRADE_MS && !timeoutWarning) {
          setTimeoutWarning("生成时间较长，是否使用预览模式查看？");
        } else if (elapsed > TIMEOUT_WARNING_MS && !timeoutWarning) {
          setTimeoutWarning("AI 正在努力生成中，请稍候...");
        }

        if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
          onTryOnResolved(tryOnId, "failed", "试衣超时，请稍后重试");
          return;
        }

        if (!isFocused) {
          return;
        }

        const statusResponse = await tryOnApi.getStatus(tryOnId);
        if (!statusResponse.success || !statusResponse.data) {
          return;
        }

        const tryOnData = statusResponse.data;

        if (tryOnData.status === "completed" || tryOnData.status === "failed") {
          onTryOnResolved(tryOnId, tryOnData.status, tryOnData.errorMessage);
        } else if (tryOnData.status === "processing") {
          setPhase("processing");
          setProgress(Math.min(90, 30 + pollAttemptsRef.current * 2));
        } else {
          setPhase("queued");
          setProgress(Math.min(30, pollAttemptsRef.current * 3));
        }
      }, POLL_INTERVAL);
    },
    [isFocused, cleanup, onTryOnResolved, timeoutWarning]
  );

  const pickPersonImage = useCallback(async () => {
    try {
      const result = await pickImageSecurely();
      if (result) {
        setPersonImage(result.uri);
      }
    } catch (error) {
      const msg = error instanceof ImageValidationError ? error.message : "选择图片失败";
      Alert.alert("错误", msg);
    }
  }, []);

  const pickClothingImage = useCallback(async () => {
    try {
      const result = await pickImageSecurely();
      if (result) {
        setClothingImage(result.uri);
        setClothingItem(null);
      }
    } catch (error) {
      const msg = error instanceof ImageValidationError ? error.message : "选择图片失败";
      Alert.alert("错误", msg);
    }
  }, []);

  const handleTryOn = useCallback(async () => {
    if (!personImage) {
      Alert.alert("提示", "请先选择人物照片");
      return;
    }
    if (!clothingImage && !clothingItem) {
      Alert.alert("提示", "请先选择服装图片");
      return;
    }

    setPhase("uploading");
    setProgress(5);
    setErrorMessage(null);
    setResult(null);

    try {
      setProgress(10);
      const uploadResponse = await photosApi.upload(personImage, "full_body");

      if (!uploadResponse.success || !uploadResponse.data) {
        throw new Error(uploadResponse.error?.message || "人物照片上传失败");
      }

      const photoId = uploadResponse.data.id;
      setProgress(25);

      const itemId = clothingItem?.id;
      if (!itemId && !clothingImage) {
        throw new Error("缺少服装信息，请重新选择服装");
      }

      setPhase("queued");
      setProgress(35);

      let createResponse;
      if (itemId) {
        createResponse = await tryOnApi.create(photoId, itemId);
      } else {
        const clothingUploadResponse = await photosApi.upload(clothingImage!, "clothing");
        if (!clothingUploadResponse.success || !clothingUploadResponse.data) {
          throw new Error(clothingUploadResponse.error?.message || "服装图片上传失败");
        }
        createResponse = await tryOnApi.createWithClothingImage(photoId, clothingUploadResponse.data.id);
      }

      if (!createResponse.success || !createResponse.data) {
        throw new Error(createResponse.error?.message || "创建试衣请求失败");
      }

      const tryOnId = createResponse.data.id;
      setProgress(40);

      startPolling(tryOnId);
    } catch (error) {
      setPhase("failed");
      setErrorMessage(error instanceof Error ? error.message : "虚拟试衣失败，请重试");
    }
  }, [personImage, clothingImage, clothingItem, startPolling]);

  const handleRetry = useCallback(() => {
    setPhase("idle");
    setProgress(0);
    setResult(null);
    setErrorMessage(null);
  }, []);

  const handleShare = useCallback(async () => {
    const imageUrl = result?.resultImageDataUri || result?.resultImageUrl;
    if (!imageUrl) {
      Alert.alert("提示", "没有可分享的试衣结果");
      return;
    }
    try {
      await Share.open({
        title: "寻裳 AI 试衣效果",
        message: "看看我的 AI 虚拟试衣效果！",
        url: imageUrl.startsWith("data:") ? imageUrl : imageUrl,
        type: imageUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
      });
    } catch (error: unknown) {
      // User cancelled sharing - not an error
      if (error instanceof Error && error.message?.includes("cancel")) {
        return;
      }
      Alert.alert("提示", "分享失败，请重试");
    }
  }, [result]);

  const handleSaveToAlbum = useCallback(async () => {
    const imageUrl = result?.resultImageUrl;
    if (!imageUrl) {
      Alert.alert("提示", "没有可保存的试衣结果");
      return;
    }
    try {
      // Download image and share via system save option
      await Share.open({
        title: "保存试衣结果",
        url: imageUrl,
        type: "image/jpeg",
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message?.includes("cancel")) {
        return;
      }
      Alert.alert("提示", "保存失败，请重试");
    }
  }, [result]);

  const handleTryMore = useCallback(() => {
    setClothingImage(null);
    setClothingItem(null);
    setResult(null);
    setPhase("idle");
    setProgress(0);
  }, []);

  const phaseLabel: Record<TryOnPhase, string> = {
    idle: "",
    uploading: "上传照片中...",
    queued: "排队等待中...",
    processing: "AI 处理中...",
    completed: "试衣完成！",
    failed: "试衣失败",
  };

  const isProcessing = phase === "uploading" || phase === "queued" || phase === "processing";
  const canStart = personImage && (clothingImage || clothingItem) && !isProcessing;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBackButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>AI 虚拟试衣</Text>
        <View style={styles.navPlaceholder} />
      </View>

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
                <Ionicons name="flash" size={14} color={DesignTokens.colors.text.inverse} />
                <Text style={styles.headerBadgeText}>AI 驱动</Text>
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
            disabled={isProcessing}
          >
            {personImage ? (
              <>
                <Image source={{ uri: personImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changeButton} disabled={isProcessing}>
                  <Ionicons name="camera-outline" size={16} color={DesignTokens.colors.text.inverse} />
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
            {clothingItem && <Text style={styles.clothingNameHint}>{clothingItem.name}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.imagePicker, clothingImage && styles.imagePickerFilled]}
            onPress={pickClothingImage}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            {clothingImage ? (
              <>
                <Image source={{ uri: clothingImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changeButton} disabled={isProcessing}>
                  <Ionicons name="images-outline" size={16} color={DesignTokens.colors.text.inverse} />
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
        {phase === "failed" ? (
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
            <Ionicons name="refresh" size={20} color={DesignTokens.colors.text.inverse} />
            <Text style={styles.buttonText}>重试</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, !canStart && styles.buttonDisabled]}
            onPress={handleTryOn}
            disabled={!canStart}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <View style={styles.processingContent}>
                <ActivityIndicator size="small" color={DesignTokens.colors.text.inverse} />
                <Text style={styles.buttonText}>
                  {phaseLabel[phase]} {progress > 0 ? `${Math.round(progress)}%` : ""}
                </Text>
              </View>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={DesignTokens.colors.text.inverse} />
                <Text style={styles.buttonText}>开始 AI 试衣</Text>
                <Ionicons name="arrow-forward" size={18} color={DesignTokens.colors.text.inverse} />
              </>
            )}
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ========== 进度可视化 ========== */}
      {isProcessing && (
        <Animated.View entering={FadeInUp.duration(300)}>
          <TryOnProgress
            currentStep={
              phase === "uploading" ? 0 :
              phase === "queued" ? 1 :
              phase === "processing" ? 2 : -1
            }
            progress={progress / 100}
          />
          <View style={styles.tipContainer}>
            <Ionicons name="bulb-outline" size={16} color={colors.warmPrimary.coral[500]} />
            <Text style={styles.tipText}>{STYLE_TIPS[currentTip]}</Text>
          </View>
          {timeoutWarning && (
            <View style={styles.timeoutWarning}>
              <Ionicons name="time-outline" size={16} color={colors.warmPrimary.ocean[500]} />
              <Text style={styles.timeoutWarningText}>{timeoutWarning}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* ========== 错误提示 ========== */}
      {phase === "failed" && errorMessage && (
        <Animated.View entering={FadeInUp.duration(300)}>
          <View style={styles.errorSection}>
            <Ionicons name="alert-circle" size={24} color={colors.semantic.error.main} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        </Animated.View>
      )}

      {/* ========== 结果展示 ========== */}
      {result && phase === "completed" && (
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={24} color={colors.warmPrimary.mint[500]} />
              <Text style={styles.resultTitle}>试衣完成！</Text>
            </View>

            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonLabel}>
                  <Text style={styles.comparisonLabelText}>原始照片</Text>
                </View>
                <Image source={{ uri: personImage! }} style={styles.comparisonImage} />
              </View>

              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-forward" size={28} color={colors.brand.warmPrimary} />
              </View>

              <View style={[styles.comparisonCard, styles.comparisonCardAfter]}>
                <View style={[styles.comparisonLabel, styles.comparisonLabelAfter]}>
                  <Ionicons name="sparkles" size={12} color={DesignTokens.colors.text.inverse} />
                  <Text style={[styles.comparisonLabelText, { color: DesignTokens.colors.text.inverse }]}>
                    AI 试衣效果
                  </Text>
                </View>
                <Image
                  source={{
                    uri: result.resultImageDataUri || result.resultImageUrl || personImage!,
                  }}
                  style={styles.comparisonImage}
                />
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleShare}>
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={colors.warmPrimary.ocean[700]}
                />
                <Text style={styles.actionButtonTextSecondary}>分享结果</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonPrimary} onPress={handleSaveToAlbum}>
                <Ionicons name="download-outline" size={20} color={DesignTokens.colors.text.inverse} />
                <Text style={styles.actionButtonTextPrimary}>保存到相册</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.tryMoreButton} onPress={handleTryMore}>
              <Ionicons name="shirt-outline" size={18} color={colors.brand.warmPrimary} />
              <Text style={styles.tryMoreButtonText}>试穿更多</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  content: {
    padding: spacing.layout.screenPadding,
    paddingBottom: 40,
  },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.layout.sectionGap,
    paddingVertical: 4,
  },
  navBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },
  navPlaceholder: {
    width: 40,
  },

  headerSection: {
    marginBottom: spacing.layout.sectionGap,
    borderRadius: spacing.borderRadius["2xl"],
    overflow: "hidden",
    ...shadows.presets.lg,
  },
  headerGradient: {
    padding: spacing.layout.modalPadding,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.text.inverse,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.base,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 22,
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  headerBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.text.inverse,
    marginLeft: 6,
  },

  section: {
    marginBottom: spacing.layout.cardGap,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand.warmPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.text.inverse,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
  },
  clothingNameHint: {
    fontSize: typography.fontSize.sm,
    color: colors.warmPrimary.ocean[600],
    fontWeight: typography.fontWeight.medium,
  },

  imagePicker: {
    borderRadius: spacing.borderRadius.xl,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.neutral[300],
    borderStyle: "dashed",
    backgroundColor: colors.neutral.white,
  },
  imagePickerFilled: {
    borderWidth: 2,
    borderStyle: "solid",
    borderColor: colors.warmPrimary.mint[300],
  },
  placeholder: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  placeholderIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
    marginTop: 10,
  },
  placeholderSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: 6,
    textAlign: "center",
  },
  previewImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
  },
  changeButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  changeButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: DesignTokens.colors.text.inverse,
  },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: typography.fontWeight.bold,
    color: DesignTokens.colors.text.inverse,
  },
  processingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.semantic.error.main,
    borderRadius: spacing.borderRadius.xl,
    paddingVertical: 16,
    gap: 10,
    ...shadows.presets.lg,
    marginBottom: 16,
  },

  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.warmPrimary.mint[500],
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.warmPrimary.mint[600],
  },

  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warmPrimary.coral[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: spacing.borderRadius.lg,
    marginTop: 12,
  },
  tipText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warmPrimary.coral[700],
    lineHeight: 20,
  },
  timeoutWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warmPrimary.ocean[50],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: spacing.borderRadius.lg,
    marginTop: 8,
  },
  timeoutWarningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.warmPrimary.ocean[700],
  },

  errorSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.semantic.error.light,
    padding: 16,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.semantic.error.dark,
  },

  resultSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius["2xl"],
    padding: spacing.layout.cardPadding,
    ...shadows.presets.lg,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
  },

  comparisonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  comparisonCard: {
    flex: 1,
    borderRadius: spacing.borderRadius.lg,
    overflow: "hidden",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  comparisonLabelAfter: {
    backgroundColor: colors.warmPrimary.mint[500],
  },
  comparisonLabelText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
  },
  comparisonImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    resizeMode: "cover",
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warmPrimary.coral[50],
    alignItems: "center",
    justifyContent: "center",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.warmPrimary.ocean[50],
    borderWidth: 1.5,
    borderColor: colors.warmPrimary.ocean[200],
  },
  actionButtonTextSecondary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warmPrimary.ocean[700],
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.warmPrimary.mint[500],
    ...shadows.presets.md,
  },
  actionButtonTextPrimary: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: DesignTokens.colors.text.inverse,
  },
  tryMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.neutral[100],
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
  },
  tryMoreButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.warmPrimary,
  },
});

export default TryOnScreen;
