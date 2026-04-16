import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { communityApi } from "../services/api/community.api";
import apiClient from "../services/api/client";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const DRAFT_KEY = "draft_post";

const PRESET_TAGS = [
  "OOTD",
  "通勤",
  "约会",
  "运动",
  "休闲",
  "法式",
  "日系",
  "韩系",
  "街头",
  "复古",
  "极简",
  "街头风",
  "度假",
  "宴会",
  "日常",
] as const;

const MAX_IMAGES = 9;

interface SelectedItem {
  id: string;
  name: string;
  image: string;
}

export const CreatePostScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [category, setCategory] = useState("outfit_share");
  const [relatedItems, setRelatedItems] = useState<SelectedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSearchResults, setItemSearchResults] = useState<SelectedItem[]>([]);
  const [searching, setSearching] = useState(false);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await AsyncStorage.getItem(DRAFT_KEY);
        if (draft) {
          const parsed = JSON.parse(draft);
          Alert.alert(
            "恢复草稿",
            "检测到未完成的草稿，是否恢复？",
            [
              {
                text: "放弃",
                style: "destructive",
                onPress: () => AsyncStorage.removeItem(DRAFT_KEY),
              },
              {
                text: "恢复",
                onPress: () => {
                  setTitle(parsed.title ?? "");
                  setContent(parsed.content ?? "");
                  setImages(parsed.images ?? []);
                  setSelectedTags(parsed.tags ?? []);
                  setCategory(parsed.category ?? "outfit_share");
                  setRelatedItems(parsed.relatedItems ?? []);
                },
              },
            ],
            { cancelable: false }
          );
        }
      } catch {
        // Draft loading failure is non-critical
      }
    };
    void loadDraft();
  }, []);

  // Auto-save draft with debounce
  const saveDraft = useCallback(async () => {
    try {
      const draft = {
        title,
        content,
        images,
        tags: selectedTags,
        category,
        relatedItems,
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Draft save failure is non-critical
    }
  }, [title, content, images, selectedTags, category, relatedItems]);

  useEffect(() => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = setTimeout(saveDraft, 2000);
    return () => {
      if (draftTimerRef.current) {
        clearTimeout(draftTimerRef.current);
      }
    };
  }, [saveDraft]);

  const pickImage = useCallback(async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("提示", `最多上传${MAX_IMAGES}张图片`);
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: MAX_IMAGES - images.length,
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES));
      }
    } catch {
      Alert.alert("提示", "选择图片失败");
    }
  }, [images]);

  const uploadImage = useCallback(async (uri: string): Promise<string | null> => {
    try {
      const filename = uri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      const formData = new FormData();
      formData.append("file", { uri, name: filename, type } as unknown as Blob);
      const response = await apiClient.upload<{ url?: string }>("/upload", formData);
      if (response.success && response.data?.url) {
        return response.data.url;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const searchItems = useCallback(async (query: string) => {
    if (!query.trim()) {
      setItemSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const response = await apiClient.get<{ id: string; name?: string; mainImage?: string }[]>(
        "/clothing",
        { search: query.trim(), limit: 10 }
      );
      if (response.success && response.data) {
        const results = Array.isArray(response.data)
          ? response.data.map((item) => ({
              id: item.id,
              name: item.name ?? "",
              image: item.mainImage ?? "",
            }))
          : [];
        setItemSearchResults(results);
      }
    } catch {
      setItemSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const addItem = useCallback((item: SelectedItem) => {
    setRelatedItems((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
    setShowItemSearch(false);
    setItemSearchQuery("");
    setItemSearchResults([]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setRelatedItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("提示", "请输入标题");
      return;
    }
    if (!content.trim() && images.length === 0) {
      Alert.alert("提示", "请输入内容或添加图片");
      return;
    }

    try {
      setSubmitting(true);
      setUploading(true);

      const uploadedImageUrls: string[] = [];
      for (const uri of images) {
        if (uri.startsWith("http")) {
          uploadedImageUrls.push(uri);
        } else {
          const url = await uploadImage(uri);
          if (url) {
            uploadedImageUrls.push(url);
          }
        }
      }
      setUploading(false);

      const _relatedItemIds = relatedItems.map((item) => item.id);

      const response = await communityApi.createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        images: uploadedImageUrls,
        tags: selectedTags,
      });

      if (response.success) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        Alert.alert("成功", "发布成功", [{ text: "确定", onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert("提示", response.error?.message || "发布失败，请重试");
      }
    } catch {
      Alert.alert("提示", "发布失败，请重试");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }, [title, content, images, category, selectedTags, relatedItems, uploadImage, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>发布动态</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.headerBtn, submitting && styles.headerBtnDisabled]}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={styles.publishText}>发布</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.titleInput}
          placeholder="标题"
          placeholderTextColor={theme.colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={50}
        />

        <TextInput
          style={styles.contentInput}
          placeholder="分享你的穿搭心得..."
          placeholderTextColor={theme.colors.textTertiary}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Image grid */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionLabel}>图片（最多{MAX_IMAGES}张）</Text>
          <View style={styles.imageGrid}>
            {images.map((uri, index) => (
              <View key={uri} style={styles.imageCell}>
                <Image source={{ uri }} style={styles.imageThumb} />
                <TouchableOpacity style={styles.imageRemove} onPress={() => removeImage(index)}>
                  <Ionicons name="close-circle" size={18} color={DesignTokens.colors.neutral.white} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.imageAddCell} onPress={pickImage}>
                <Ionicons name="add" size={28} color={theme.colors.textTertiary} />
                <Text style={styles.imageAddText}>
                  {images.length}/{MAX_IMAGES}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {uploading && (
            <View style={styles.uploadIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.uploadText}>上传中...</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>标签</Text>
          <View style={styles.tagsContainer}>
            {PRESET_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, selectedTags.includes(tag) && styles.tagChipActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    selectedTags.includes(tag) && styles.tagChipTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>分类</Text>
          <View style={styles.categoryRow}>
            {[
              { key: "outfit_share", label: "穿搭分享" },
              { key: "item_review", label: "好物推荐" },
              { key: "style_tips", label: "风格讨论" },
              { key: "brand_story", label: "OOTD" },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]}
                onPress={() => setCategory(cat.key)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.key && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Related items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>单品标注</Text>
            <TouchableOpacity onPress={() => setShowItemSearch(true)}>
              <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          {relatedItems.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsList}>
              {relatedItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="shirt-outline" size={16} color={theme.colors.textTertiary} />
                    </View>
                  )}
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TouchableOpacity style={styles.itemRemove} onPress={() => removeItem(item.id)}>
                    <Ionicons name="close" size={14} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Item search modal */}
        {showItemSearch && (
          <View style={styles.searchOverlay}>
            <View style={styles.searchBox}>
              <View style={styles.searchInputRow}>
                <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="搜索平台商品..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={itemSearchQuery}
                  onChangeText={(text) => {
                    setItemSearchQuery(text);
                    if (text.trim().length >= 2) {
                      void searchItems(text);
                    }
                  }}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    setShowItemSearch(false);
                    setItemSearchQuery("");
                    setItemSearchResults([]);
                  }}
                >
                  <Ionicons name="close" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              </View>
              {searching ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                  style={styles.searchLoader}
                />
              ) : (
                itemSearchResults.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.searchResultItem}
                    onPress={() => addItem(item)}
                  >
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.searchResultImage} />
                    ) : (
                      <View style={styles.searchResultImagePlaceholder} />
                    )}
                    <Text style={styles.searchResultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  headerBtnDisabled: { opacity: 0.5 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: theme.colors.text },
  cancelText: { fontSize: 15, color: theme.colors.textSecondary },
  publishText: { fontSize: 15, fontWeight: "600", color: theme.colors.primary },
  body: { flex: 1 },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  contentInput: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 120,
    backgroundColor: theme.colors.surface,
    lineHeight: 22,
  },
  imageSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: 10 },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  imageCell: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  imageThumb: { width: "100%", height: "100%" },
  imageRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageAddCell: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  imageAddText: { fontSize: 11, color: theme.colors.textTertiary },
  uploadIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  uploadText: { fontSize: 13, color: theme.colors.textSecondary },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  tagChipActive: { backgroundColor: "#F0EDFF" }, // custom color
  tagChipText: { fontSize: 13, color: theme.colors.textSecondary },
  tagChipTextActive: { color: DesignTokens.colors.brand.slate, fontWeight: "600" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  categoryChipActive: { backgroundColor: theme.colors.primary },
  categoryChipText: { fontSize: 13, color: theme.colors.textSecondary },
  categoryChipTextActive: { color: theme.colors.surface, fontWeight: "600" },
  itemsList: { marginTop: 4 },
  itemCard: {
    width: 80,
    marginRight: 8,
    alignItems: "center",
    position: "relative",
  },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, textAlign: "center" },
  itemRemove: {
    position: "absolute",
    top: -4,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  searchOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  searchBox: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: 400,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, paddingVertical: 4 },
  searchLoader: { paddingVertical: 20 },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchResultImage: { width: 40, height: 40, borderRadius: 6 },
  searchResultImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: theme.colors.background,
  },
  searchResultName: { flex: 1, fontSize: 14, color: theme.colors.text },
});

export default CreatePostScreen;
