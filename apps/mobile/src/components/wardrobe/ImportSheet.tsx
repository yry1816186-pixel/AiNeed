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
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from 'undefined';
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { communityApi } from "../../services/api/community.api";

type ImportSource = "community" | "ai_stylist" | "tryon";

interface ImportItem {
  id: string;
  name: string;
  image: string;
  selected: boolean;
}

interface Collection {
  id: string;
  name: string;
  itemCount: number;
}

interface ImportSheetProps {
  visible: boolean;
  source?: ImportSource;
  sourceData?: {
    postId?: string;
    sessionId?: string;
    tryOnId?: string;
    images?: string[];
    items?: { id: string; name: string; image: string }[];
  };
  onClose: () => void;
  onImported?: () => void;
}

const SOURCE_LABELS: Record<ImportSource, string> = {
  community: "社区帖子",
  ai_stylist: "AI造型师方案",
  tryon: "虚拟试衣效果图",
};

const SOURCE_ICONS: Record<ImportSource, string> = {
  community: "people-outline",
  ai_stylist: "sparkles-outline",
  tryon: "shirt-outline",
};

export const ImportSheet: React.FC<ImportSheetProps> = ({
  visible,
  source,
  sourceData,
  onClose,
  onImported,
}) => {
  const [activeSource, setActiveSource] = useState<ImportSource>(source ?? "community");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (visible) {
      if (source) {
        setActiveSource(source);
      }
      void fetchItems();
      void fetchCollections();
    }
  }, [visible, source]);

  const fetchItems = useCallback(async () => {
    if (sourceData?.items) {
      setItems(
        sourceData.items.map((item) => ({
          id: item.id,
          name: item.name,
          image: item.image,
          selected: true,
        }))
      );
      return;
    }

    // Default items for source types
    setLoading(true);
    try {
      if (activeSource === "community" && sourceData?.postId) {
        const response = await communityApi.getPostById(sourceData.postId);
        if (response.success && response.data) {
          const relatedItems = response.data.outfit?.items ?? [];
          setItems(
            relatedItems.map((item) => ({
              id: item.id,
              name: item.name,
              image: item.image,
              selected: true,
            }))
          );
        }
      } else {
        // For AI stylist and tryon, use placeholder items
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeSource, sourceData]);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await communityApi.getCollections?.();
      if (response && response.success && response.data) {
        const cols = Array.isArray(response.data) ? response.data : [];
        setCollections(
          cols.map((c: { id?: string; name?: string; _count?: { items?: number } }) => ({
            id: c.id ?? "",
            name: c.name ?? "",
            itemCount: c._count?.items ?? 0,
          }))
        );
        if (cols.length > 0) {
          setSelectedCollectionId(cols[0].id ?? null);
        }
      }
    } catch (error) {
      // Collections loading failure is non-critical
      console.error('Failed to load collections:', error);
    }
  }, []);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  const handleImport = useCallback(async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      Alert.alert("提示", "请至少选择一个单品");
      return;
    }

    try {
      setImporting(true);
      // Import items to selected collection via wardrobe API
      if (selectedCollectionId) {
        for (const item of selectedItems) {
          await communityApi.createCollection?.({
            name: item.name,
          });
        }
      }
      Alert.alert("成功", `已导入 ${selectedItems.length} 个单品到灵感衣橱`);
      onImported?.();
      onClose();
    } catch {
      Alert.alert("提示", "导入失败，请重试");
    } finally {
      setImporting(false);
    }
  }, [items, selectedCollectionId, onImported, onClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>导入到灵感衣橱</Text>

          {/* Source selector */}
          {!source && (
            <View style={styles.sourceRow}>
              {(Object.keys(SOURCE_LABELS) as ImportSource[]).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.sourceChip, activeSource === key && styles.sourceChipActive]}
                  onPress={() => setActiveSource(key)}
                >
                  <Ionicons
                    name={SOURCE_ICONS[key] as "people-outline"}
                    size={14}
                    color={activeSource === key ? DesignTokens.colors.text.inverse : DesignTokens.colors.brand.slate}
                  />
                  <Text
                    style={[
                      styles.sourceChipText,
                      activeSource === key && styles.sourceChipTextActive,
                    ]}
                  >
                    {SOURCE_LABELS[key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Collection selector */}
          {collections.length > 0 && (
            <View style={styles.collectionRow}>
              <Text style={styles.collectionLabel}>保存到:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {collections.map((col) => (
                  <TouchableOpacity
                    key={col.id}
                    style={[
                      styles.collectionChip,
                      selectedCollectionId === col.id && styles.collectionChipActive,
                    ]}
                    onPress={() => setSelectedCollectionId(col.id)}
                  >
                    <Text
                      style={[
                        styles.collectionChipText,
                        selectedCollectionId === col.id && styles.collectionChipTextActive,
                      ]}
                    >
                      {col.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Item list with checkboxes */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
          ) : items.length > 0 ? (
            <ScrollView style={styles.itemList} showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, item.selected && styles.itemRowSelected]}
                  onPress={() => toggleItem(item.id)}
                >
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="shirt-outline" size={18} color={colors.textTertiary} />
                    </View>
                  )}
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                    {item.selected && <Ionicons name="checkmark" size={12} color={DesignTokens.colors.text.inverse} />}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyItemsText}>无可导入的单品</Text>
            </View>
          )}

          {/* Import button */}
          <TouchableOpacity
            style={[styles.importBtn, importing && styles.importBtnDisabled]}
            onPress={handleImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color={DesignTokens.colors.text.inverse} />
            ) : (
              <Text style={styles.importBtnText}>
                导入选中项 ({items.filter((i) => i.selected).length})
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
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
  title: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary, marginBottom: 12 },
  sourceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "DesignTokens.colors.semantic.infoLight", // custom color
  },
  sourceChipActive: { backgroundColor: DesignTokens.colors.brand.slate },
  sourceChipText: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.brand.slate, fontWeight: "500" },
  sourceChipTextActive: { color: DesignTokens.colors.text.inverse },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  collectionLabel: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  collectionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginRight: 6,
  },
  collectionChipActive: { backgroundColor: "DesignTokens.colors.semantic.infoLight" }, // custom color
  collectionChipText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  collectionChipTextActive: { color: DesignTokens.colors.brand.slate, fontWeight: "600" },
  loader: { paddingVertical: 24 },
  itemList: { maxHeight: 250 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRowSelected: { backgroundColor: "#F8F7FF" }, // custom color
  itemImage: { width: 40, height: 40, borderRadius: 6 },
  itemImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: colors.text },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: DesignTokens.colors.brand.slate,
    borderColor: DesignTokens.colors.brand.slate,
  },
  emptyItems: { paddingVertical: 32, alignItems: "center" },
  emptyItemsText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textTertiary },
  importBtn: {
    backgroundColor: DesignTokens.colors.brand.slate,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: DesignTokens.colors.text.inverse, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
});

export default ImportSheet;
