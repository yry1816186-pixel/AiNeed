import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../../design-system/theme';
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";

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
          placeholderTextColor={theme.colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />
        <TextInput
          style={s.modalContentInput}
          placeholder="分享你的穿搭心得..."
          placeholderTextColor={theme.colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
        <View style={s.modalToolbar}>
          <TouchableOpacity style={s.modalToolBtn}>
            <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
            <Text style={s.modalToolText}>添加图片</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalToolBtn}>
            <Ionicons name="pricetag-outline" size={20} color={theme.colors.primary} />
            <Text style={s.modalToolText}>添加标签</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export const CreatePostModal = React.memo(CreatePostModalInner);

const s = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: theme.colors.text },
  modalCancelText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.textSecondary },
  modalSubmitText: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: theme.colors.primary },
  modalCategoryRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  modalCategoryChipActive: { backgroundColor: theme.colors.primary },
  modalCategoryChipText: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary },
  modalCategoryChipTextActive: { color: theme.colors.surface, fontWeight: "600" },
  modalTitleInput: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalContentInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    minHeight: 150,
  },
  modalToolbar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 24,
  },
  modalToolBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalToolText: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary },
});
