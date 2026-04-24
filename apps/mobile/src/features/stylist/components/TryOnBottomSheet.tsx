import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  type TextStyle,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

interface OutfitItem {
  name: string;
  category: string;
  imageUrl?: string;
  price?: number;
}

export interface OutfitData {
  imageUrl?: string;
  items: OutfitItem[];
  overall_score?: number;
  title?: string;
}

export interface TryOnBottomSheetProps {
  outfit: OutfitData | null;
  onSave: () => void;
  onTryAnother: () => void;
}

/**
 * TryOnBottomSheet - BottomSheet modal for virtual try-on display.
 *
 * Design:
 * - Slides up within chat screen (no page navigation)
 * - Shows outfit image, items list, save/try-another buttons
 * - Uses terracotta accent for save button, neutral for try-another
 */
export const TryOnBottomSheet = React.forwardRef<BottomSheetModal, TryOnBottomSheetProps>(
  ({ outfit, onSave, onTryAnother }, ref) => {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const snapPoints = useMemo(() => ["70%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      []
    );

    const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
      const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
        top: "shirt-outline",
        bottom: "ellipse-outline",
        dress: "female-outline",
        outerwear: "layers-outline",
        shoes: "footsteps-outline",
        accessories: "watch-outline",
        bag: "bag-outline",
      };
      return iconMap[category.toLowerCase()] || "cube-outline";
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.background}
      >
        <BottomSheetView style={styles.content}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Ionicons name="sparkles" size={18} color={DesignTokens.colors.brand.terracotta} />
            <Text style={styles.headerTitle}>试穿效果图</Text>
          </View>

          {/* Try-on image area */}
          <View style={styles.imageContainer}>
            {outfit?.imageUrl ? (
              <Image source={{ uri: outfit.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={DesignTokens.colors.neutral[300]} />
                <Text style={styles.placeholderText}>试穿效果图</Text>
              </View>
            )}
            {outfit?.overall_score != null && (
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{Math.round(outfit.overall_score)}%</Text>
              </View>
            )}
          </View>

          {/* Outfit items */}
          {outfit?.items && outfit.items.length > 0 && (
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>搭配单品</Text>
              {outfit.items.map((item, i) => (
                <View key={`${item.category}-${i}`} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Ionicons
                      name={getCategoryIcon(item.category)}
                      size={16}
                      color={DesignTokens.colors.brand.terracotta}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  {item.price != null && (
                    <Text style={styles.itemPrice}>¥{item.price.toFixed(0)}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveButton} onPress={onSave} activeOpacity={0.8}>
              <Ionicons name="heart-outline" size={18} color={DesignTokens.colors.neutral.white} />
              <Text style={styles.saveButtonText}>保存到衣橱</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tryAnotherButton}
              onPress={onTryAnother}
              activeOpacity={0.8}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={DesignTokens.colors.brand.terracotta}
              />
              <Text style={styles.tryAnotherButtonText}>换一套试试</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

TryOnBottomSheet.displayName = "TryOnBottomSheet";

const useStyles = createStyles((colors) =>
  StyleSheet.create({
    background: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: DesignTokens.borderRadius["3xl"],
      borderTopRightRadius: DesignTokens.borderRadius["3xl"],
    },
    handleIndicator: {
      backgroundColor: DesignTokens.colors.neutral[300],
      width: 40,
      height: 4,
    },
    content: {
      flex: 1,
      paddingHorizontal: DesignTokens.spacing[5],
      paddingTop: DesignTokens.spacing[2],
      paddingBottom: DesignTokens.spacing[6],
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: DesignTokens.spacing[2],
      marginBottom: DesignTokens.spacing[4],
    },
    headerTitle: {
      fontSize: DesignTokens.typography.sizes.lg,
      fontWeight: DesignTokens.typography.fontWeights.bold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral[900],
    },
    imageContainer: {
      width: "100%",
      height: 240,
      borderRadius: DesignTokens.borderRadius.xl,
      overflow: "hidden",
      backgroundColor: DesignTokens.colors.neutral[100],
      marginBottom: DesignTokens.spacing[4],
    } as ViewStyle,
    image: {
      width: "100%",
      height: "100%",
    } as ImageStyle,
    imagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: DesignTokens.spacing[2],
    } as ViewStyle,
    placeholderText: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: DesignTokens.colors.neutral[400],
    },
    scoreBadge: {
      position: "absolute",
      top: DesignTokens.spacing[3],
      right: DesignTokens.spacing[3],
      backgroundColor: DesignTokens.colors.brand.terracotta,
      paddingHorizontal: DesignTokens.spacing[3],
      paddingVertical: DesignTokens.spacing[1],
      borderRadius: DesignTokens.borderRadius.full,
    } as ViewStyle,
    scoreText: {
      fontSize: DesignTokens.typography.sizes.xs,
      fontWeight: DesignTokens.typography.fontWeights.bold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral.white,
    },
    itemsSection: {
      marginBottom: DesignTokens.spacing[4],
    } as ViewStyle,
    sectionTitle: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral[700],
      marginBottom: DesignTokens.spacing[3],
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: DesignTokens.spacing[2],
      borderBottomWidth: 1,
      borderBottomColor: DesignTokens.colors.neutral[100],
    } as ViewStyle,
    itemIcon: {
      width: 32,
      height: 32,
      borderRadius: DesignTokens.borderRadius.md,
      backgroundColor: DesignTokens.colors.neutral[50],
      alignItems: "center",
      justifyContent: "center",
      marginRight: DesignTokens.spacing[3],
    } as ViewStyle,
    itemContent: {
      flex: 1,
    } as ViewStyle,
    itemCategory: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: DesignTokens.colors.neutral[400],
      textTransform: "uppercase" as const,
    },
    itemName: {
      fontSize: DesignTokens.typography.sizes.sm,
      fontWeight: DesignTokens.typography.fontWeights.medium as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral[800],
    },
    itemPrice: {
      fontSize: DesignTokens.typography.sizes.sm,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.brand.terracotta,
    },
    actions: {
      flexDirection: "row",
      gap: DesignTokens.spacing[3],
      marginTop: "auto",
    } as ViewStyle,
    saveButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: DesignTokens.spacing[2],
      height: 48,
      borderRadius: DesignTokens.borderRadius.xl,
      backgroundColor: DesignTokens.colors.brand.terracotta,
      ...DesignTokens.shadows.brand,
    } as ViewStyle,
    saveButtonText: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.neutral.white,
    },
    tryAnotherButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: DesignTokens.spacing[2],
      height: 48,
      borderRadius: DesignTokens.borderRadius.xl,
      borderWidth: 1.5,
      borderColor: DesignTokens.colors.brand.terracotta,
      backgroundColor: colors.surface,
    } as ViewStyle,
    tryAnotherButtonText: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: DesignTokens.typography.fontWeights.semibold as TextStyle["fontWeight"],
      color: DesignTokens.colors.brand.terracotta,
    },
  })
);
