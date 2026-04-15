import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import Animated, { SlideInRight } from "react-native-reanimated";
import { theme, Colors, Spacing, BorderRadius } from '../design-system/theme';

interface PhotoStepProps {
  onNext: () => void;
  onSkip?: () => void;
}

const IMAGE_PICKER_OPTIONS: CameraOptions & ImageLibraryOptions = {
  mediaType: "photo",
  quality: 0.8,
  maxWidth: 1024,
  maxHeight: 1024,
};

export const PhotoStep: React.FC<PhotoStepProps> = ({ onNext, onSkip }) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleTakePhoto = () => {
    void launchCamera(IMAGE_PICKER_OPTIONS, (response) => {
      if (response.didCancel || response.errorCode) {
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setPhotoUri(uri);
      }
    });
  };

  const handlePickFromLibrary = () => {
    void launchImageLibrary(IMAGE_PICKER_OPTIONS, (response) => {
      if (response.didCancel || response.errorCode) {
        return;
      }
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        setPhotoUri(uri);
      }
    });
  };

  return (
    <Animated.View entering={SlideInRight.duration(350)} style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>上传照片解锁个性化分析</Text>
        <Text style={styles.stepSubtitle}>
          上传一张全身照，帮助我们更好地分析体型和生成试衣效果
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.privacyBox}>
          <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.privacyText}>
            你的照片仅用于体型分析和试衣效果生成，绝不会分享给第三方
          </Text>
        </View>

        <View style={styles.photoContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <TouchableOpacity
              style={styles.photoPlaceholder}
              onPress={handlePickFromLibrary}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={48} color={theme.colors.textTertiary} />
              <Text style={styles.photoPlaceholderText}>点击上传照片</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleTakePhoto}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={20} color={theme.colors.surface} />
            <Text style={styles.cameraButtonText}>拍照</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handlePickFromLibrary}
            activeOpacity={0.7}
          >
            <Ionicons name="images-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.galleryButtonText}>从相册选择</Text>
          </TouchableOpacity>
        </View>

        {onSkip && (
          <TouchableOpacity style={styles.skipLink} onPress={onSkip} activeOpacity={0.7}>
            <Text style={styles.skipLinkText}>跳过，稍后上传</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: theme.colors.text,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: Spacing[2],
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
    alignItems: "center",
  },
  privacyBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
    width: "100%",
    marginBottom: Spacing[6],
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: Spacing[6],
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.xl,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[3],
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  buttonGroup: {
    width: "100%",
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: BorderRadius.xl,
    height: 52,
    gap: Spacing[2],
  },
  cameraButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  galleryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    gap: Spacing[2],
  },
  galleryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  skipLink: {
    marginTop: Spacing[2],
  },
  skipLinkText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
});
