import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { useDemoStore, PRESET_PROFILES, type DemoProfile } from "../../../shared/stores/demoStore";
import { useQueryClient } from "@tanstack/react-query";

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

  if (!__DEV__ && !demoMode) return null;

  const snapPoints = useMemo(() => ["60%"], []);

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

  const toggleScenario = (scenario: string) => {
    setSelectedScenarios((prev) =>
      prev.includes(scenario) ? prev.filter((s) => s !== scenario) : [...prev, scenario]
    );
  };

  const handleApply = () => {
    setCustomProfile({ bodyType, styleExpression, primaryScenarios: selectedScenarios });
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };

  const handlePreset = (name: string) => {
    const profile = PRESET_PROFILES[name];
    if (profile) {
      setActiveProfile(name);
      setBodyType(profile.bodyType);
      setStyleExpression(profile.styleExpression);
      setSelectedScenarios(profile.primaryScenarios);
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    }
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
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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

          <Text style={styles.sectionTitle}>预设 Profile</Text>
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
            <Text style={styles.applyButtonText}>应用配置</Text>
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
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
