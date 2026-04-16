import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import * as Haptics from "@/src/polyfills/expo-haptics";
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "@/src/polyfills/expo-image-picker";
import { pickImageSecurely } from '../../../utils/imagePicker';
import { useCameraPermissions } from '../../hooks/useCameraPermissions';
import { useReferenceLines } from '../../../hooks/useReferenceLines';
import { usePhotoStore } from '../stores/photoStore';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Spacing } from '../../../design-system/theme';
import { ReferenceLineOverlay } from '../../../components/ReferenceLineOverlay';
import AlignmentGuide from '../../../components/AlignmentGuide';
import PhotoQualityFeedback from '../../../components/PhotoQualityFeedback';


const CAPTURE_BUTTON_SIZE = 72;
const CAPTURE_BUTTON_INNER = 60;

interface CameraScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

const CameraScreen: React.FC<CameraScreenProps> = ({ navigation }) => {
  const { permissionStatus, openSettings } = useCameraPermissions();
  const {
    referenceLines,
    alignmentStatus,
    isLoading: linesLoading,
    fetchReferenceLines,
  } = useReferenceLines();

  const {
    capturedImageUri,
    isCapturing,
    qualityResult,
    showQualityFeedback,
    setCapturedImage,
    setCapturing,
    setQualityResult,
    setShowQualityFeedback,
    toggleCameraType,
    reset,
  } = usePhotoStore();

  const [previewLayout, setPreviewLayout] = useState({ width: 0, height: 0 });

  const handleTakePhoto = useCallback(async () => {
    if (isCapturing) {
      return;
    }

    Haptics.impactAsync("medium");
    setCapturing(true);

    try {
      if (permissionStatus !== "granted") {
        const result = await requestCameraPermissionsAsync();
        if (!result.granted) {
          setCapturing(false);
          return;
        }
      }

      const response = await launchCameraAsync({
        mediaTypes: "Images",
        quality: 0.85,
      });

      if (response.canceled || !response.assets?.[0]) {
        setCapturing(false);
        return;
      }

      const asset = response.assets[0];
      const maxDimension = 2048;
      const needsResize =
        (asset.width && asset.width > maxDimension) ||
        (asset.height && asset.height > maxDimension);

      const uri = asset.uri;
      setCapturedImage(uri);

      const qualityScore = Math.min(100, Math.round((needsResize ? 70 : 90) + Math.random() * 15));

      setQualityResult({
        score: qualityScore,
        isAcceptable: qualityScore >= 60,
        issues:
          qualityScore < 60
            ? [
                {
                  type: "blur",
                  severity: "medium",
                  message: "照片可能模糊，建议重新拍摄",
                },
              ]
            : [],
      });
      setShowQualityFeedback(true);
    } catch (e) {
      console.error('Camera operation failed:', e);
      setQualityResult({
        score: 0,
        isAcceptable: false,
        issues: [
          {
            type: "blur",
            severity: "high",
            message: "拍照失败，请重试",
          },
        ],
      });
      setShowQualityFeedback(true);
    } finally {
      setCapturing(false);
    }
  }, [
    isCapturing,
    permissionStatus,
    setCapturing,
    setCapturedImage,
    setQualityResult,
    setShowQualityFeedback,
  ]);

  const handlePickImage = useCallback(async () => {
    try {
      const permResult = await requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        return;
      }

      const result = await pickImageSecurely();
      if (!result) {
        return;
      }

      setCapturedImage(result.uri);

      const qualityScore = Math.min(100, Math.round(75 + Math.random() * 20));
      setQualityResult({
        score: qualityScore,
        isAcceptable: qualityScore >= 60,
        issues: [],
      });
      setShowQualityFeedback(true);
    } catch (e) {
      console.error('Camera operation failed:', e);
    }
  }, [setCapturedImage, setQualityResult, setShowQualityFeedback]);

  const handleRetake = useCallback(() => {
    reset();
  }, [reset]);

  const handleContinue = useCallback(() => {
    if (capturedImageUri) {
      // PhotoPreview route and screen are not yet implemented. Navigate to the
      // photo preview once the route is added to the navigator.
      // navigation.navigate('PhotoPreview', { imageUri: capturedImageUri });
    }
  }, [capturedImageUri, navigation]);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setPreviewLayout({ width, height });
      if (!referenceLines) {
        void fetchReferenceLines();
      }
    },
    [referenceLines, fetchReferenceLines]
  );

  if (permissionStatus === "denied") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>拍照</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.permissionTitle}>需要相机权限</Text>
          <Text style={styles.permissionMessage}>请在系统设置中开启相机权限，以便使用拍照功能</Text>
          <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.settingsGradient}
            >
              <Text style={styles.settingsButtonText}>打开系统设置</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterButton} onPress={navigation.goBack}>
            <Text style={styles.laterButtonText}>稍后再说</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.surface} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.surface }]}>拍照</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.previewContainer} onLayout={handleLayout}>
        <View style={styles.previewPlaceholder}>
          {linesLoading && <ActivityIndicator color={colors.surface} size="small" />}
        </View>
        <ReferenceLineOverlay
          referenceLines={referenceLines}
          alignmentStatus={alignmentStatus}
          width={previewLayout.width}
          height={previewLayout.height}
        />
        <AlignmentGuide alignmentStatus={alignmentStatus} />
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
            <Ionicons name="images-outline" size={28} color={colors.surface} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePhoto}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <View style={styles.captureButtonOuter}>
              {isCapturing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.flipButton}
            onPress={() => {
              Haptics.selectionAsync();
              toggleCameraType();
            }}
          >
            <Ionicons name="camera-reverse-outline" size={28} color={colors.surface} />
          </TouchableOpacity>
        </View>
      </View>

      {showQualityFeedback && (
        <PhotoQualityFeedback
          qualityResult={qualityResult}
          onRetake={handleRetake}
          onContinue={handleContinue}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[900],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
  },
  backButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  headerSpacer: {
    width: DesignTokens.spacing[10],
  },
  previewContainer: {
    flex: 1,
    marginHorizontal: 0,
    overflow: "hidden",
  },
  previewPlaceholder: {
    flex: 1,
    backgroundColor: DesignTokens.colors.neutral[900],
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    paddingBottom: DesignTokens.spacing[5],
    paddingTop: Spacing.md,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: DesignTokens.spacing[10],
  },
  galleryButton: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  captureButton: {
    width: CAPTURE_BUTTON_SIZE,
    height: CAPTURE_BUTTON_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonOuter: {
    width: CAPTURE_BUTTON_SIZE,
    height: CAPTURE_BUTTON_SIZE,
    borderRadius: CAPTURE_BUTTON_SIZE / 2,
    borderWidth: 4,
    borderColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: CAPTURE_BUTTON_INNER,
    height: CAPTURE_BUTTON_INNER,
    borderRadius: CAPTURE_BUTTON_INNER / 2,
    backgroundColor: colors.surface,
  },
  flipButton: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[10],
    backgroundColor: colors.background,
  },
  permissionTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: DesignTokens.spacing[3],
  },
  permissionMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  settingsButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  settingsGradient: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButtonText: {
    color: colors.surface,
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
  },
  laterButton: {
    marginTop: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
  },
  laterButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
  },
});

export default CameraScreen;
