import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles, type FlatColors } from "../../../shared/contexts/ThemeContext";
import { DesignTokens } from "../../../design-system/theme";
import type { DayPlanData } from "./WeeklyCalendarView";

export interface OutfitOption {
  id: string;
  name: string | null;
  coverImage: string | null;
  occasions: string[];
  seasons: string[];
  style: string | null;
  rating: number | null;
}

export interface OutfitEditBottomSheetProps {
  currentPlan: DayPlanData | null;
  outfitOptions: OutfitOption[];
  isLoading?: boolean;
  onSelect: (outfitId: string) => Promise<void>;
  onClose?: () => void;
}

/**
 * OutfitEditBottomSheet - Bottom sheet for editing a day's outfit plan.
 *
 * Design:
 * - Snap to 60% height
 * - Shows current outfit with weather info
 * - "换一套" button to replace with alternative
 * - List of available outfit options to choose from
 */
export const OutfitEditBottomSheet = React.forwardRef<BottomSheetModal, OutfitEditBottomSheetProps>(
  ({ currentPlan, outfitOptions, isLoading, onSelect, onClose }, ref) => {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const snapPoints = useMemo(() => ["60%"], []);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const weather = currentPlan?.weatherContext;

    const handleSelect = useCallback(
      async (outfitId: string) => {
        setIsSaving(true);
        setSelectedId(outfitId);
        try {
          await onSelect(outfitId);
        } finally {
          setIsSaving(false);
          setSelectedId(null);
        }
      },
      [onSelect]
    );

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

    const renderOutfitOption = useCallback(
      ({ item }: { item: OutfitOption }) => {
        const isCurrentOutfit = item.id === currentPlan?.outfitId;
        const isSavingThis = isSaving && selectedId === item.id;

        return (
          <TouchableOpacity
            style={[styles.optionCard, isCurrentOutfit && styles.optionCardCurrent]}
            onPress={() => !isCurrentOutfit && handleSelect(item.id)}
            disabled={isSaving || isCurrentOutfit}
            activeOpacity={0.7}
          >
            {item.coverImage ? (
              <Image
                source={{ uri: item.coverImage }}
                style={styles.optionImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.optionImagePlaceholder}>
                <Ionicons name="shirt-outline" size={20} color={colors.textTertiary} />
              </View>
            )}

            <View style={styles.optionInfo}>
              <Text style={styles.optionName} numberOfLines={1}>
                {item.name || "未命名方案"}
              </Text>
              <View style={styles.optionTags}>
                {item.occasions.slice(0, 2).map((o) => (
                  <View key={o} style={styles.tagPill}>
                    <Text style={styles.tagText}>{o}</Text>
                  </View>
                ))}
              </View>
              {item.rating !== null && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={colors.warning} />
                  <Text style={styles.ratingText}>{item.rating?.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {isCurrentOutfit ? (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>当前</Text>
              </View>
            ) : isSavingThis ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="swap-horizontal-outline" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        );
      },
      [colors, currentPlan?.outfitId, handleSelect, isSaving, selectedId, styles]
    );

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
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.headerTitle}>
              {currentPlan?.plannedDate ? `${currentPlan.plannedDate} 穿搭` : "编辑穿搭"}
            </Text>
          </View>

          {/* Current outfit + weather */}
          {currentPlan?.outfit && (
            <View style={styles.currentSection}>
              <View style={styles.currentOutfitRow}>
                {currentPlan.outfit.coverImage ? (
                  <Image
                    source={{ uri: currentPlan.outfit.coverImage }}
                    style={styles.currentImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.currentImagePlaceholder}>
                    <Ionicons name="shirt-outline" size={28} color={colors.textTertiary} />
                  </View>
                )}
                <View style={styles.currentInfo}>
                  <Text style={styles.currentName}>{currentPlan.outfit.name || "当前方案"}</Text>
                  {weather && (
                    <View style={styles.weatherRow}>
                      <Ionicons
                        name={weather.condition?.includes("雨") ? "rainy-outline" : "sunny-outline"}
                        size={14}
                        color={colors.textTertiary}
                      />
                      <Text style={styles.weatherText}>
                        {weather.tempHigh ?? "--"}°/{weather.tempLow ?? "--"}°{" "}
                        {weather.condition ?? ""}
                      </Text>
                    </View>
                  )}
                  {currentPlan.sceneTag && (
                    <View style={styles.scenePill}>
                      <Text style={styles.sceneText}>{currentPlan.sceneTag}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* "换一套" section title */}
          <View style={styles.replaceHeader}>
            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
            <Text style={styles.replaceTitle}>换一套</Text>
          </View>

          {/* Outfit options list */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>加载穿搭方案...</Text>
            </View>
          ) : (
            <FlashList
              data={outfitOptions}
              keyExtractor={(item) => item.id}
              renderItem={renderOutfitOption}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const useStyles = createStyles((colors: FlatColors) =>
  StyleSheet.create({
    background: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: DesignTokens.borderRadius["2xl"],
      borderTopRightRadius: DesignTokens.borderRadius["2xl"],
    } as ViewStyle,
    handleIndicator: {
      backgroundColor: colors.border,
      width: 40,
    } as ViewStyle,
    content: {
      flex: 1,
      paddingHorizontal: 16,
    } as ViewStyle,
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    } as ViewStyle,
    headerTitle: {
      fontSize: DesignTokens.typography.sizes.md,
      fontWeight: "700",
      color: colors.textPrimary,
    } as TextStyle,
    currentSection: {
      backgroundColor: colors.backgroundTertiary,
      borderRadius: DesignTokens.borderRadius.lg,
      padding: 12,
      marginBottom: 8,
    } as ViewStyle,
    currentOutfitRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    } as ViewStyle,
    currentImage: {
      width: 64,
      height: 64,
      borderRadius: DesignTokens.borderRadius.md,
    } as ImageStyle,
    currentImagePlaceholder: {
      width: 64,
      height: 64,
      borderRadius: DesignTokens.borderRadius.md,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    } as ViewStyle,
    currentInfo: {
      flex: 1,
      gap: 4,
    } as ViewStyle,
    currentName: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: "600",
      color: colors.textPrimary,
    } as TextStyle,
    weatherRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    } as ViewStyle,
    weatherText: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: colors.textTertiary,
    } as TextStyle,
    scenePill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      backgroundColor: colors.primaryLight,
      alignSelf: "flex-start",
    } as ViewStyle,
    sceneText: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: colors.primaryDark,
      fontWeight: "500",
    } as TextStyle,
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: 8,
    } as ViewStyle,
    replaceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
    } as ViewStyle,
    replaceTitle: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: "600",
      color: colors.textPrimary,
    } as TextStyle,
    listContent: {
      paddingBottom: 24,
      gap: 8,
    } as ViewStyle,
    optionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: DesignTokens.borderRadius.md,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.borderLight,
    } as ViewStyle,
    optionCardCurrent: {
      borderColor: colors.primary,
      opacity: 0.6,
    } as ViewStyle,
    optionImage: {
      width: 44,
      height: 44,
      borderRadius: DesignTokens.borderRadius.sm,
    } as ImageStyle,
    optionImagePlaceholder: {
      width: 44,
      height: 44,
      borderRadius: DesignTokens.borderRadius.sm,
      backgroundColor: colors.backgroundTertiary,
      alignItems: "center",
      justifyContent: "center",
    } as ViewStyle,
    optionInfo: {
      flex: 1,
      gap: 3,
    } as ViewStyle,
    optionName: {
      fontSize: DesignTokens.typography.sizes.base,
      fontWeight: "500",
      color: colors.textPrimary,
    } as TextStyle,
    optionTags: {
      flexDirection: "row",
      gap: 4,
    } as ViewStyle,
    tagPill: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 6,
      backgroundColor: colors.backgroundTertiary,
    } as ViewStyle,
    tagText: {
      fontSize: 9,
      color: colors.textSecondary,
    } as TextStyle,
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    } as ViewStyle,
    ratingText: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: colors.textTertiary,
    } as TextStyle,
    currentBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: colors.successLight,
    } as ViewStyle,
    currentBadgeText: {
      fontSize: DesignTokens.typography.sizes.xs,
      color: colors.success,
      fontWeight: "600",
    } as TextStyle,
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    } as ViewStyle,
    loadingText: {
      fontSize: DesignTokens.typography.sizes.sm,
      color: colors.textTertiary,
    } as TextStyle,
  })
);
