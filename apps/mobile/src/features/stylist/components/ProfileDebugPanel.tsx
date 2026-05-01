import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import {
  useDemoStore,
  PRESET_PROFILES,
  SEED_PROFILES,
  ALL_SEED_PROFILE_IDS,
} from "../../../shared/stores/demoStore";
import { useQueryClient } from "@tanstack/react-query";
import { logger } from "../../../shared/utils/logger";

const BODY_TYPES = ["hourglass", "rectangle", "pear", "apple", "inverted-triangle"];
const STYLE_EXPRESSIONS = ["minimalist", "classic", "bohemian", "streetwear", "romantic"];
const SCENARIO_OPTIONS = ["commute", "date", "sport", "street", "vacation", "party", "interview"];

export const ProfileDebugPanel = React.forwardRef<BottomSheetModal>(function ProfileDebugPanel(
  _props,
  ref
) {
  const demoMode = useDemoStore((s) => s.demoMode);
  const activeProfile = useDemoStore((s) => s.activeProfile);
  const setCustomProfile = useDemoStore((s) => s.setCustomProfile);
  const setActiveProfile = useDemoStore((s) => s.setActiveProfile);
  const resetProfile = useDemoStore((s) => s.resetProfile);
  const queryClient = useQueryClient();

  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [bodyType, setBodyType] = useState("hourglass");
  const [styleExpression, setStyleExpression] = useState("minimalist");
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>(["commute", "date"]);
  const [switchingProfile, setSwitchingProfile] = useState<string | null>(null);

  const switchStartTime = useRef<number>(0);

  const snapPoints = useMemo(() => ["75%"], []);

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

  const getActiveProfileDisplayName = useCallback(() => {
    if (activeProfile === "default") {return "默认";}
    if (activeProfile === "custom") {return "自定义";}
    const seed = SEED_PROFILES[activeProfile];
    if (seed) {return seed.nickname;}
    const preset = PRESET_PROFILES[activeProfile];
    if (preset) {
      if (activeProfile === "professional") {return "职场精英";}
      if (activeProfile === "creative") {return "创意达人";}
    }
    return activeProfile;
  }, [activeProfile]);

  const seedProfileList = useMemo(() => {
    return ALL_SEED_PROFILE_IDS.map((id) => ({
      id,
      profile: SEED_PROFILES[id],
    }));
  }, []);

  if (!__DEV__ && !demoMode) {return null;}

  const toggleScenario = (scenario: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(scenario) ? prev.filter((s) => s !== scenario) : [...prev, scenario]
    );
  };

  const handleApply = () => {
    setCustomProfile({ bodyType, styleExpression, primaryScenarios: selectedScenarios });
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    queryClient.removeQueries({ queryKey: ["recommendations"] });
  };

  const handlePreset = (name: string) => {
    const profile = PRESET_PROFILES[name];
    if (profile) {
      setSwitchingProfile(name);
      switchStartTime.current = Date.now();
      queryClient.removeQueries({ queryKey: ["recommendations"] });
      setTimeout(() => {
        setActiveProfile(name);
        setBodyType(profile.bodyType);
        setStyleExpression(profile.styleExpression);
        setSelectedScenarios(profile.primaryScenarios);
        queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        setSwitchingProfile(null);
        const elapsed = Date.now() - switchStartTime.current;
        logger.debug(`[ProfileDebug] Switch to ${name} completed in ${elapsed}ms`);
      }, 600);
    }
  };

  const handleSeedProfile = (profileId: string) => {
    const profile = SEED_PROFILES[profileId];
    if (!profile) {return;}
    setSwitchingProfile(profileId);
    switchStartTime.current = Date.now();
    queryClient.removeQueries({ queryKey: ["recommendations"] });
    setTimeout(() => {
      setActiveProfile(profileId);
      setBodyType(profile.bodyType);
      setStyleExpression(profile.styleExpression);
      setSelectedScenarios(profile.primaryScenarios);
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      setSwitchingProfile(null);
      const elapsed = Date.now() - switchStartTime.current;
      logger.debug(
        `[ProfileDebug] Switch to ${profile.nickname} (${profileId}) completed in ${elapsed}ms`
      );
    }, 600);
  };

  const handleReset = () => {
    Alert.alert("重置配置", "确定要恢复默认配置吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "重置",
        style: "destructive",
        onPress: () => {
          resetProfile();
          const defaultProfile = PRESET_PROFILES.default;
          setBodyType(defaultProfile.bodyType);
          setStyleExpression(defaultProfile.styleExpression);
          setSelectedScenarios(defaultProfile.primaryScenarios);
          queryClient.removeQueries({ queryKey: ["recommendations"] });
          queryClient.invalidateQueries({ queryKey: ["recommendations"] });
        },
      },
    ]);
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
    >
      <BottomSheetView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>演示配置</Text>
          <TouchableOpacity
            onPress={() => (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss()}
            style={styles.closeButton}
            accessibilityLabel="关闭"
          >
            <Ionicons name="close" size={22} color={DesignTokens.colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {switchingProfile && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={DesignTokens.colors.brand.terracotta} />
            <Text style={styles.loadingText}>正在切换到 {getActiveProfileDisplayName()}...</Text>
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.activeProfileBanner}>
            <Ionicons name="person-circle" size={20} color={DesignTokens.colors.brand.terracotta} />
            <Text style={styles.activeProfileText}>当前: {getActiveProfileDisplayName()}</Text>
          </View>

          <Text style={styles.sectionTitle}>Seed Profiles ({ALL_SEED_PROFILE_IDS.length})</Text>
          <View style={styles.seedList}>
            {seedProfileList.map(({ id, profile }) => (
              <TouchableOpacity
                key={id}
                style={[styles.seedItem, activeProfile === id && styles.seedItemActive]}
                onPress={() => handleSeedProfile(id)}
                disabled={switchingProfile !== null}
                activeOpacity={0.7}
              >
                <View style={styles.seedItemLeft}>
                  <Text style={[styles.seedName, activeProfile === id && styles.seedNameActive]}>
                    {profile.nickname}
                  </Text>
                  <Text style={styles.seedMeta}>
                    {profile.bodyType} · {profile.styleExpression} · {profile.gender}
                  </Text>
                </View>
                {switchingProfile === id ? (
                  <ActivityIndicator size="small" color={DesignTokens.colors.brand.terracotta} />
                ) : (
                  <TouchableOpacity
                    style={[styles.applyBtn, activeProfile === id && styles.applyBtnActive]}
                    onPress={() => handleSeedProfile(id)}
                    disabled={switchingProfile !== null}
                  >
                    <Text
                      style={[
                        styles.applyBtnText,
                        activeProfile === id && styles.applyBtnTextActive,
                      ]}
                    >
                      {activeProfile === id ? "已激活" : "应用"}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>体型</Text>
          <View style={styles.chipRow}>
            {BODY_TYPES.map((bt) => (
              <TouchableOpacity
                key={bt}
                style={[styles.chip, bodyType === bt && styles.chipActive]}
                onPress={() => setBodyType(bt)}
              >
                <Text style={[styles.chipText, bodyType === bt && styles.chipTextActive]}>
                  {bt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>风格表达</Text>
          <View style={styles.chipRow}>
            {STYLE_EXPRESSIONS.map((se) => (
              <TouchableOpacity
                key={se}
                style={[styles.chip, styleExpression === se && styles.chipActive]}
                onPress={() => setStyleExpression(se)}
              >
                <Text style={[styles.chipText, styleExpression === se && styles.chipTextActive]}>
                  {se}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>主要场景</Text>
          <View style={styles.chipRow}>
            {SCENARIO_OPTIONS.map((sc) => (
              <TouchableOpacity
                key={sc}
                style={[styles.chip, selectedScenarios.includes(sc) && styles.chipActive]}
                onPress={() => toggleScenario(sc)}
              >
                <Text
                  style={[styles.chipText, selectedScenarios.includes(sc) && styles.chipTextActive]}
                >
                  {sc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>快速预设</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.presetButton, activeProfile === "default" && styles.presetActive]}
              onPress={() => handlePreset("default")}
            >
              <Text style={styles.presetText}>默认</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, activeProfile === "professional" && styles.presetActive]}
              onPress={() => handlePreset("professional")}
            >
              <Text style={styles.presetText}>职场精英</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetButton, activeProfile === "creative" && styles.presetActive]}
              onPress={() => handlePreset("creative")}
            >
              <Text style={styles.presetText}>创意达人</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.8}>
            <Text style={styles.applyButtonText}>应用自定义配置</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
            <Text style={styles.resetButtonText}>重置为默认</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const useStyles = createStyles((colors) => ({
  background: {
    backgroundColor: DesignTokens.colors.neutral[50],
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  activeProfileBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    marginBottom: 16,
    gap: 8,
  },
  activeProfileText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: DesignTokens.colors.brand.terracotta,
  },
  loadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 8,
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[600],
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[700],
    marginTop: 12,
    marginBottom: 8,
  },
  seedList: {
    gap: 6,
  },
  seedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.neutral.white,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[100],
  },
  seedItemActive: {
    borderColor: DesignTokens.colors.brand.terracotta,
    backgroundColor: "rgba(74, 222, 128, 0.06)",
  },
  seedItemLeft: {
    flex: 1,
  },
  seedName: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[800],
  },
  seedNameActive: {
    color: DesignTokens.colors.brand.terracotta,
    fontWeight: "600",
  },
  seedMeta: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.neutral[500],
    marginTop: 2,
  },
  applyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  applyBtnActive: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
  applyBtnText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[600],
  },
  applyBtnTextActive: {
    color: DesignTokens.colors.neutral.white,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  chipActive: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
  chipText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[600],
  },
  chipTextActive: {
    color: DesignTokens.colors.neutral.white,
    fontWeight: "600",
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  presetActive: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
  presetText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: DesignTokens.colors.neutral[700],
  },
  applyButton: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  applyButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  resetButton: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.xuno.warmOrange,
  },
  resetButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "500",
    color: DesignTokens.colors.xuno.warmOrange,
  },
}));
