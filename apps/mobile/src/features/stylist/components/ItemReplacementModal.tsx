import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { AlternativeItem } from '../stores/aiStylistStore';

interface ItemReplacementModalProps {
  visible: boolean;
  originalItemName: string;
  alternatives: AlternativeItem[];
  isLoading: boolean;
  onSelect: (itemId: string) => void;
  onClose: () => void;
}

const SkeletonCard = () => (
  <View style={[styles.card, styles.skeletonCard]}>
    <View style={styles.skeletonImage} />
    <View style={styles.skeletonText} />
    <View style={[styles.skeletonText, { width: "60%" }]} />
  </View>
);

export const ItemReplacementModal: React.FC<ItemReplacementModalProps> = ({
  visible,
  originalItemName,
  alternatives,
  isLoading,
  onSelect,
  onClose,
}) => {
  const renderItem = ({ item }: { item: AlternativeItem }) => (
    <Pressable style={styles.card} onPress={() => onSelect(item.id)}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
      ) : (
        <View style={styles.itemImagePlaceholder}>
          <Text style={styles.placeholderText}>{item.category}</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
        {item.price !== null && (
          <Text style={styles.itemPrice}>{`\u00a5${item.price.toFixed(0)}`}</Text>
        )}
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{`${Math.round(item.matchScore)}%`}</Text>
        <Text style={styles.scoreLabel}>match</Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Replace Item</Text>
            <Text style={styles.subtitle}>{originalItemName}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.listContent}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : alternatives.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No alternative items available</Text>
            </View>
          ) : (
            <FlatList
              data={alternatives}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: 4,
  },
  subtitle: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.neutral[500] },
  closeButton: { position: "absolute", right: 16, top: 16, padding: 4 },
  closeButtonText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.brand.terracotta },
  listContent: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: DesignTokens.colors.backgrounds.elevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
  },
  itemImage: { width: 60, height: 60, borderRadius: 8 },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: DesignTokens.typography.sizes.xs, color: DesignTokens.colors.neutral[400] },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[800],
    marginBottom: 2,
  },
  itemBrand: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.neutral[500], marginBottom: 2 },
  itemPrice: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: DesignTokens.colors.brand.terracotta },
  scoreContainer: { alignItems: "center", paddingHorizontal: 8 },
  scoreText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "700", color: DesignTokens.colors.brand.sage },
  scoreLabel: { fontSize: DesignTokens.typography.sizes.xs, color: DesignTokens.colors.neutral[400] },
  skeletonCard: { opacity: 0.5 },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  skeletonText: {
    height: 14,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: 6,
    width: "80%",
  },
  emptyState: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.neutral[400] },
});
