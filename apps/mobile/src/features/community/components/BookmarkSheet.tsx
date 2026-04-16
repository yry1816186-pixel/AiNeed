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
import { theme , Spacing } from '../../../design-system/theme'
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {collections.map((col) => (
                <TouchableOpacity
                  key={col.id}
                  style={styles.collectionItem}
                  onPress={() => handleBookmark(col.id)}
                >
                  <View style={styles.collectionIcon}>
                    <Ionicons name={col.icon as "folder"} size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName}>{col.name}</Text>
                    <Text style={styles.collectionCount}>{col.itemCount} 个内容</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {showNewCollection ? (
            <View style={styles.newCollectionRow}>
              <TextInput
                style={styles.newCollectionInput}
                placeholder="输入分类名称"
                placeholderTextColor={theme.colors.textTertiary}
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
              <Ionicons name="add" size={18} color={theme.colors.primary} />
              <Text style={styles.newBtnText}>新建分类</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingBottom: 34,
    maxHeight: 500,
  },
  handle: {
    width: DesignTokens.spacing[10],
    height: Spacing.xs,
    borderRadius: 2,
    backgroundColor: DesignTokens.colors.neutral[200],
    alignSelf: "center",
    marginTop: DesignTokens.spacing['2.5'],
    marginBottom: DesignTokens.spacing['3.5'],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: DesignTokens.spacing[3],
  },
  loader: { paddingVertical: Spacing.lg},
  list: { maxHeight: 300 },
  collectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: DesignTokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  collectionIcon: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 10,
    backgroundColor: DesignTokens.colors.backgrounds.secondary, // lavender-tinted bg
    alignItems: "center",
    justifyContent: "center",
    marginRight: DesignTokens.spacing[3],
  },
  collectionInfo: { flex: 1 },
  collectionName: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: theme.colors.text },
  collectionCount: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing['1.5'],
    paddingVertical: DesignTokens.spacing['3.5'],
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  newBtnText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.primary, fontWeight: "500" },
  newCollectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: DesignTokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: DesignTokens.spacing[3],
  },
  newCollectionInput: {
    flex: 1,
    height: DesignTokens.spacing[10],
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: DesignTokens.spacing[3],
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
  },
  createBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: colors.textInverse, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
}))

export default BookmarkSheet;
