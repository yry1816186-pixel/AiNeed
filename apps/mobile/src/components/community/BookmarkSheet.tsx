import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { communityApi } from "../../services/api/community.api";
import { useTheme, createStyles } from '../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";

interface Collection {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

interface BookmarkSheetProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onBookmarked?: (collectionId: string) => void;
}

export const BookmarkSheet: React.FC<BookmarkSheetProps> = ({
  visible,
  postId,
  onClose,
  onBookmarked,
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await communityApi.getCollections?.();
      if (response && response.success && response.data) {
        const items = Array.isArray(response.data) ? response.data : [];
        setCollections(
          items.map(
            (item: { id?: string; name?: string; icon?: string; _count?: { items?: number } }) => ({
              id: item.id ?? "",
              name: item.name ?? "",
              icon: item.icon ?? "folder",
              itemCount: item._count?.items ?? 0,
            })
          )
        );
      }
    } catch (error) {
      // Bookmark loading failure is non-critical
      console.error('Bookmark operation failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void fetchCollections();
      setShowNewCollection(false);
      setNewCollectionName("");
    }
  }, [visible, fetchCollections]);

  const handleBookmark = useCallback(
    async (collectionId: string) => {
      try {
        const response = await communityApi.bookmarkPost(postId, { collectionId });
        if (response.success) {
          const collectionName = collections.find((c) => c.id === collectionId)?.name ?? "分类";
          Alert.alert("成功", `已收藏到「${collectionName}」`);
          onBookmarked?.(collectionId);
          onClose();
        } else {
          Alert.alert("提示", response.error?.message ?? "收藏失败");
        }
      } catch {
        Alert.alert("提示", "收藏失败，请重试");
      }
    },
    [postId, collections, onBookmarked, onClose]
  );

  const handleCreateCollection = useCallback(async () => {
    if (!newCollectionName.trim()) {
      return;
    }
    try {
      setCreating(true);
      const response = await communityApi.createCollection?.({ name: newCollectionName.trim() });
      if (response && response.success && response.data) {
        const newCol: Collection = {
          id: (response.data as { id?: string }).id ?? "",
          name: newCollectionName.trim(),
          icon: "folder",
          itemCount: 0,
        };
        setCollections((prev) => [...prev, newCol]);
        setNewCollectionName("");
        setShowNewCollection(false);
      }
    } catch {
      Alert.alert("提示", "创建分类失败");
    } finally {
      setCreating(false);
    }
  }, [newCollectionName]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>收藏到灵感衣橱</Text>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={styles.collectionItem}
                  onPress={() => handleBookmark(col.id)}
                >
                  <View style={styles.collectionIcon}>
                    <Ionicons name={col.icon as "folder"} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>{col.name}</Text>
                    <Text style={styles.collectionCount}>{col.itemCount} 个内容</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {showNewCollection ? (
            <View style={styles.newCollectionRow}>
              <TextInput
                style={styles.newCollectionInput}
                placeholder="输入分类名称"
                placeholderTextColor={colors.textTertiary}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                autoFocus
                maxLength={20}
              />
              <TouchableOpacity
                style={[styles.createBtn, creating && styles.createBtnDisabled]}
                onPress={handleCreateCollection}
                disabled={creating}
              >
                <Text style={styles.createBtnText}>创建</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.newBtn} onPress={() => setShowNewCollection(true)}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.newBtnText}>新建分类</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 34,
    maxHeight: 500,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  loader: { paddingVertical: 24 },
  list: { maxHeight: 300 },
  collectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "DesignTokens.colors.semantic.infoLight", // custom color
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  collectionInfo: { flex: 1 },
  collectionName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: colors.text },
  collectionCount: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textTertiary, marginTop: 2 },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  newBtnText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary, fontWeight: "500" },
  newCollectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  newCollectionInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: DesignTokens.colors.text.inverse, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
});

export default BookmarkSheet;
