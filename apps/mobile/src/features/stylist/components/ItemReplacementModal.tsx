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
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


interface ItemReplacementModalProps {
  visible: boolean;
  originalItemName: string;
  alternatives: AlternativeItem[];
  isLoading: boolean;
  onSelect: (itemId: string) => void;
  onClose: () => void;
}

const SkeletonCard: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonText} />
      <View style={[styles.skeletonText, { width: "60%" }]} />
    </View>
  );
};

export const ItemReplacementModal: React.FC<ItemReplacementModalProps> = ({
  visible,
  originalItemName,
  alternatives,
  isLoading,
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: DesignTokens.spacing[5],
  },
  header: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  subtitle: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.neutral[500] },
  closeButton: { position: "absolute", right: Spacing.md, top: Spacing.md, padding: Spacing.xs},
  closeButtonText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
  listContent: { padding: Spacing.md, gap: DesignTokens.spacing[3]},
  card: {
    flexDirection: "row",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: DesignTokens.spacing[3],
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
  itemInfo: { flex: 1, marginLeft: DesignTokens.spacing[3]},
  itemName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[800],
    marginBottom: DesignTokens.spacing['0.5'],
  },
  itemBrand: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.neutral[500], marginBottom: DesignTokens.spacing['0.5']},
  itemPrice: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "600", color: colors.primary },
  scoreContainer: { alignItems: "center", paddingHorizontal: Spacing.sm},
  scoreText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "700", color: colors.secondary },
  scoreLabel: { fontSize: DesignTokens.typography.sizes.xs, color: DesignTokens.colors.neutral[400] },
  skeletonCard: { opacity: 0.5 },
  skeletonImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.neutral[200],
  },
  skeletonText: {
    height: DesignTokens.spacing['3.5'],
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: DesignTokens.spacing['1.5'],
    width: "80%",
  },
  emptyState: { padding: DesignTokens.spacing[10], alignItems: "center" },
  emptyText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.neutral[400] },
}))
