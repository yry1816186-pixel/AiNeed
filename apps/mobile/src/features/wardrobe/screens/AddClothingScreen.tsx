import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';

import * as Haptics from "@/src/polyfills/expo-haptics";
import { pickImageSecurely, ImageValidationError } from '../../../utils/imagePicker';
import { clothingApi } from '../../../services/api/clothing.api';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { flatColors as colors, Spacing } from '../../../design-system/theme';
import type { ClothingCategory, ClothingStyle, Season, Occasion } from '../../types/clothing';
import { CATEGORY_LABELS } from '../../types/clothing';


const { width: _SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORY_OPTIONS: { value: ClothingCategory; label: string }[] = [
  { value: "tops", label: CATEGORY_LABELS.tops },
  { value: "bottoms", label: CATEGORY_LABELS.bottoms },
  { value: "dresses", label: CATEGORY_LABELS.dresses },
  { value: "outerwear", label: CATEGORY_LABELS.outerwear },
  { value: "shoes", label: CATEGORY_LABELS.shoes },
  { value: "accessories", label: CATEGORY_LABELS.accessories },
];

interface FormData {
  imageUri: string | null;
  name: string;
  brand: string;
  category: ClothingCategory | null;
  color: string;
  size: string;
  styles: ClothingStyle[];
  seasons: Season[];
  occasions: Occasion[];
  notes: string;
  price: string;
}

const ChipSelector: React.FC<{
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onSelect: (value: string) => void;
}> = ({ title, options, selected, onSelect }) => (
  <View style={styles.chipSection}>
    <Text style={styles.chipTitle}>{title}</Text>
    <View style={styles.chipContainer}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(option.value)}
            accessibilityLabel={`选择${option.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export const AddClothingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState<FormData>({
    imageUri: null,
    name: "",
    brand: "",
    category: null,
    color: "",
    size: "",
    styles: [],
    seasons: [],
    occasions: [],
    notes: "",
    price: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const handlePickImage = useCallback(async () => {
    if (isPickingImage) return;
    setIsPickingImage(true);
    try {
      const result = await pickImageSecurely();
      if (result) {
        setFormData((prev) => ({ ...prev, imageUri: result.uri }));
        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (err) {
      if (err instanceof ImageValidationError) {
        Alert.alert("图片选择失败", err.message);
      } else {
        Alert.alert("图片选择失败", "请稍后重试");
      }
    } finally {
      setIsPickingImage(false);
    }
  }, [isPickingImage]);

  const handleRemoveImage = useCallback(() => {
    setFormData((prev) => ({ ...prev, imageUri: null }));
  }, []);

  const selectCategory = useCallback((value: string) => {
    setFormData((prev) => ({ ...prev, category: value as ClothingCategory }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formData.category) {
      Alert.alert("提示", "请选择服装分类");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await clothingApi.create({
        imageUri: formData.imageUri || "",
        category: formData.category!,
        name: formData.name || undefined,
        brand: formData.brand || undefined,
        color: formData.color || undefined,
        size: formData.size || undefined,
        style: formData.styles.length > 0 ? formData.styles : undefined,
        seasons: formData.seasons.length > 0 ? formData.seasons : undefined,
        occasions: formData.occasions.length > 0 ? formData.occasions : undefined,
        notes: formData.notes || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
      });
      if (response.success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync("success");
        }
        Alert.alert("成功", "服装已添加到衣橱", [
          { text: "好的", onPress: () => navigation.goBack() },
        ]);
      } else {
        const errorMsg =
          typeof response.error === "string"
            ? response.error
            : response.error?.message || "请稍后重试";
        Alert.alert("保存失败", errorMsg);
      }
    } catch (err: unknown) {
      Alert.alert("保存失败", "网络错误，请重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="关闭添加服装"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>添加服装</Text>
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityLabel="保存服装"
          accessibilityRole="button"
        >
          <Text style={[styles.saveButtonText, isSubmitting && styles.saveButtonTextDisabled]}>
            保存
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.imageSection}>
          {formData.imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: formData.imageUri }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={handleRemoveImage}
                accessibilityLabel="移除图片"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={28} color={colors.surface} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.imagePlaceholder}
              onPress={handlePickImage}
              disabled={isPickingImage}
              activeOpacity={0.7}
              accessibilityLabel="选择图片"
              accessibilityRole="button"
            >
              {isPickingImage ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
                  <Text style={styles.imagePlaceholderText}>点击添加图片</Text>
                  <Text style={styles.imagePlaceholderHint}>支持相册选择或拍照</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>服装名称</Text>
            <TextInput
              style={styles.textInput}
              placeholder="给服装起个名字"
              placeholderTextColor={colors.textTertiary}
              value={formData.name}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              accessibilityLabel="服装名称"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>品牌</Text>
            <TextInput
              style={styles.textInput}
              placeholder="品牌名称（可选）"
              placeholderTextColor={colors.textTertiary}
              value={formData.brand}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, brand: text }))}
              accessibilityLabel="品牌"
            />
          </View>
          <ChipSelector
            title="分类"
            options={CATEGORY_OPTIONS}
            selected={formData.category ? [formData.category] : []}
            onSelect={selectCategory}
          />
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>颜色</Text>
              <TextInput
                style={styles.textInput}
                placeholder="如：黑色"
                placeholderTextColor={colors.textTertiary}
                value={formData.color}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, color: text }))}
                accessibilityLabel="颜色"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>尺码</Text>
              <TextInput
                style={styles.textInput}
                placeholder="如：M"
                placeholderTextColor={colors.textTertiary}
                value={formData.size}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, size: text }))}
                accessibilityLabel="尺码"
              />
            </View>
          </View>
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.text },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonDisabled: { backgroundColor: colors.textTertiary },
  saveButtonText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.surface },
  saveButtonTextDisabled: { color: colors.surface },
  content: { flex: 1 },
  imageSection: { backgroundColor: colors.surface, padding: DesignTokens.spacing[5]},
  imagePlaceholder: {
    backgroundColor: DesignTokens.colors.neutral[100],
    borderRadius: 16,
    padding: Spacing['2xl'],
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary, marginTop: Spacing.sm},
  imagePlaceholderHint: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: Spacing.xs, opacity: 0.7 },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 240,
    borderRadius: 16,
  },
  removeImageButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  formSection: { backgroundColor: colors.surface, marginTop: Spacing.md, padding: DesignTokens.spacing[5]},
  inputGroup: { marginBottom: DesignTokens.spacing[5]},
  inputLabel: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.textPrimary, marginBottom: Spacing.sm},
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textPrimary,
  },
  rowInputs: { flexDirection: "row", gap: DesignTokens.spacing[3]},
  chipSection: { marginBottom: DesignTokens.spacing[5]},
  chipTitle: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.textPrimary, marginBottom: DesignTokens.spacing[3]},
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm},
  chip: {
    backgroundColor: DesignTokens.colors.neutral[100],
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  chipSelected: { backgroundColor: "colors.infoLight", borderWidth: 1, borderColor: colors.primary }, // custom color
  chipText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: "500" },
  bottomSpacer: { height: DesignTokens.spacing[10] },
});

export default AddClothingScreen;
