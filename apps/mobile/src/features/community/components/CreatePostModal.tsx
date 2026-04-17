import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { Spacing, flatColors as staticColors } from '../../../design-system/theme';


const CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "outfit", label: "穿搭分享" },
  { key: "recommend", label: "好物推荐" },
  { key: "style", label: "风格讨论" },
  { key: "ootd", label: "OOTD" },
] as const;

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, category: string) => void;
}

function CreatePostModalInner({ visible, onClose, onSubmit }: CreatePostModalProps) {
    const { colors } = useTheme();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("outfit");

  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      Alert.alert("提示", "请输入标题");
      return;
    }
    onSubmit(title, content, selectedCategory);
    setTitle("");
    setContent("");
    setSelectedCategory("outfit");
    onClose();
  }, [title, content, selectedCategory, onSubmit, onClose]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.modalCancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>发布动态</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={s.modalSubmitText}>发布</Text>
          </TouchableOpacity>
        </View>
        <View style={s.modalCategoryRow}>
          {CATEGORIES.filter((c) => c.key !== "all").map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                s.modalCategoryChip,
                selectedCategory === cat.key && s.modalCategoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  s.modalCategoryChipText,
                  selectedCategory === cat.key && s.modalCategoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={s.modalTitleInput}
          placeholder="标题"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />
        <TextInput
          style={s.modalContentInput}
          placeholder="分享你的穿搭心得..."
          placeholderTextColor={colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <View style={s.modalToolbar}>
          <TouchableOpacity style={s.modalToolBtn}>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
            <Text style={s.modalToolText}>添加图片</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalToolBtn}>
            <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
            <Text style={s.modalToolText}>添加标签</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export const CreatePostModal = React.memo(CreatePostModalInner);

const s = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: staticColors.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  modalTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: staticColors.textPrimary },
  modalCancelText: { fontSize: DesignTokens.typography.sizes.base, color: staticColors.textSecondary },
  modalSubmitText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: staticColors.primary },
  modalCategoryRow: {
    flexDirection: "row",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing[3],
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  modalCategoryChip: {
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 16,
    backgroundColor: staticColors.surface,
  },
  modalCategoryChipActive: { backgroundColor: staticColors.primary },
  modalCategoryChipText: { fontSize: DesignTokens.typography.sizes.sm, color: staticColors.textSecondary },
  modalCategoryChipTextActive: { color: staticColors.surface, fontWeight: "600" },
  modalTitleInput: {
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing['3.5'],
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: staticColors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  modalContentInput: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing['3.5'],
    fontSize: DesignTokens.typography.sizes.base,
    color: staticColors.textPrimary,
    lineHeight: 22,
    minHeight: 150,
  },
  modalToolbar: {
    flexDirection: "row",
    paddingHorizontal: DesignTokens.spacing[5],
    paddingVertical: DesignTokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: staticColors.border,
    gap: Spacing.lg,
  },
  modalToolBtn: { flexDirection: "row", alignItems: "center", gap: DesignTokens.spacing['1.5']},
  modalToolText: { fontSize: DesignTokens.typography.sizes.sm, color: staticColors.textSecondary },
});
