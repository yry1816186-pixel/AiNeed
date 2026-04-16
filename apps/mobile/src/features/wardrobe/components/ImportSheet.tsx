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
import { theme , Spacing } from '../../../design-system/theme'
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { communityApi } from "../../services/api/community.api";
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
                    color={activeSource === key ? colors.textInverse : colors.neutral[500]}
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
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
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
                      <Ionicons name="shirt-outline" size={18} color={theme.colors.textTertiary} />
                    </View>
                  )}
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
                    {item.selected && <Ionicons name="checkmark" size={12} color={colors.textInverse} />}
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
              <ActivityIndicator size="small" color={colors.textInverse} />
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

const useStyles = createStyles((colors) => ({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
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
  title: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: theme.colors.textPrimary, marginBottom: DesignTokens.spacing[3]},
  sourceRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: DesignTokens.spacing[3]},
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: DesignTokens.spacing['1.5'],
    borderRadius: 14,
    backgroundColor: DesignTokens.colors.backgrounds.secondary, // lavender-tinted bg
  },
  sourceChipActive: { backgroundColor: colors.neutral[500] },
  sourceChipText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.neutral[500], fontWeight: "500" },
  sourceChipTextActive: { color: colors.textInverse },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: DesignTokens.spacing[3],
  },
  collectionLabel: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary },
  collectionChip: {
    paddingHorizontal: DesignTokens.spacing['2.5'],
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    marginRight: DesignTokens.spacing['1.5'],
  },
  collectionChipActive: { backgroundColor: DesignTokens.colors.backgrounds.secondary }, // lavender-tinted bg
  collectionChipText: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary },
  collectionChipTextActive: { color: colors.neutral[500], fontWeight: "600" },
  loader: { paddingVertical: Spacing.lg},
  itemList: { maxHeight: 250 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: DesignTokens.spacing['2.5'],
    paddingVertical: DesignTokens.spacing['2.5'],
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemRowSelected: { backgroundColor: DesignTokens.colors.backgrounds.tertiary }, // selected row bg
  itemImage: { width: DesignTokens.spacing[10], height: DesignTokens.spacing[10], borderRadius: 6 },
  itemImagePlaceholder: {
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 6,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: { flex: 1, fontSize: DesignTokens.typography.sizes.base, color: theme.colors.text },
  checkbox: {
    width: DesignTokens.spacing[5],
    height: DesignTokens.spacing[5],
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.neutral[500],
    borderColor: colors.neutral[500],
  },
  emptyItems: { paddingVertical: Spacing.xl, alignItems: "center" },
  emptyItemsText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.textTertiary },
  importBtn: {
    backgroundColor: colors.neutral[500],
    borderRadius: 12,
    paddingVertical: DesignTokens.spacing['3.5'],
    alignItems: "center",
    marginTop: DesignTokens.spacing[3],
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: colors.textInverse, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
}))

export default ImportSheet;
