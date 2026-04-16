import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from "react-native";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { LinearGradient } from '../../../polyfills/expo-linear-gradient';
import Animated, { SlideInRight, SlideOutLeft, Layout } from "react-native-reanimated";
import { Colors, Spacing, BorderRadius, Shadows } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from "../../../design-system/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- Data types and constants ---

export interface StyleOption {
  id: string;
  label: string;
  labelEn: string;
  icon: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "minimalist",
    label: "极简",
    labelEn: "Minimalist",
    icon: "diamond-outline",
    description: "简洁利落，less is more",
  },
  {
    id: "streetwear",
    label: "街头",
    labelEn: "Streetwear",
    icon: "flash-outline",
    description: "大胆前卫，个性表达",
  },
  {
    id: "smart_casual",
    label: "商务休闲",
    labelEn: "Smart Casual",
    icon: "briefcase-outline",
    description: "得体舒适，进退自如",
  },
  {
    id: "elegant",
    label: "优雅",
    labelEn: "Elegant",
    icon: "star-outline",
    description: "精致高贵，知性品味",
  },
  {
    id: "athleisure",
    label: "运动",
    labelEn: "Athleisure",
    icon: "fitness-outline",
    description: "活力健康，自在随性",
  },
  {
    id: "bohemian",
    label: "波西米亚",
    labelEn: "Bohemian",
    icon: "leaf-outline",
    description: "自由浪漫，文艺随性",
  },
  {
    id: "vintage",
    label: "复古",
    labelEn: "Vintage",
    icon: "time-outline",
    description: "经典回味，岁月沉淀",
  },
  {
    id: "preppy",
    label: "学院风",
    labelEn: "Preppy",
    icon: "school-outline",
    description: "清新干净，青春活力",
  },
];

export interface ColorPaletteOption {
  id: string;
  label: string;
  colors: string[];
  description: string;
}

export const COLOR_PALETTES: ColorPaletteOption[] = [
  {
    id: "warm",
    label: "暖色调",
    colors: ["DesignTokens.colors.brand.terracotta", "DesignTokens.colors.semantic.warning", "DesignTokens.colors.brand.camel", DesignTokens.colors.brand.camel],
    description: "温暖阳光，亲切自然",
  },
  {
    id: "cool",
    label: "冷色调",
    colors: ["DesignTokens.colors.brand.slate", "DesignTokens.colors.brand.slateDark", "DesignTokens.colors.text.tertiary", "DesignTokens.colors.brand.sage"],
    description: "沉静理智，高级质感",
  },
  {
    id: "neutral",
    label: "中性色",
    colors: [DesignTokens.colors.text.primary, "DesignTokens.colors.text.secondary", "DesignTokens.colors.neutral[300]", "DesignTokens.colors.backgrounds.secondary"],
    description: "百搭经典，永不褪色",
  },
  {
    id: "earth",
    label: "大地色",
    colors: ["DesignTokens.colors.brand.sage", DesignTokens.colors.brand.camel, "DesignTokens.colors.brand.terracottaDark", "#6E7A62"],
    description: "自然沉稳，低调内敛",
  },
  {
    id: "morandi",
    label: "莫兰迪色",
    colors: ["DesignTokens.colors.brand.camel", "DesignTokens.colors.brand.sage", "DesignTokens.colors.text.tertiary", "DesignTokens.colors.brand.terracottaLight"],
    description: "低饱和度，温柔高级",
  },
  {
    id: "vivid",
    label: "高饱和",
    colors: ["DesignTokens.colors.semantic.error", DesignTokens.colors.semantic.warning, DesignTokens.colors.semantic.success, "DesignTokens.colors.semantic.info"],
    description: "鲜明醒目，大胆出众",
  },
];

// --- Step components ---

interface StyleStepProps {
  selectedStyles: Set<string>;
  onToggleStyle: (id: string) => void;
}

export const StyleStep: React.FC<StyleStepProps> = ({ selectedStyles, onToggleStyle }) => (
  <Animated.View
    entering={SlideInRight.duration(350)}
    exiting={SlideOutLeft.duration(250)}
    layout={Layout.duration(300)}
    style={stepStyles.stepContent}
  >
    <View style={stepStyles.stepHeader}>
      <Text style={stepStyles.stepTitle}>选择你偏好的风格</Text>
      <Text style={stepStyles.stepSubtitle}>
        选择一个或多个最贴近你审美的风格，我们会据此推荐更适合你的穿搭
      </Text>
    </View>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={stepStyles.gridContainer}
    >
      <View style={stepStyles.styleGrid}>
        {STYLE_OPTIONS.map((option) => {
          const isSelected = selectedStyles.has(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={[stepStyles.styleCard, isSelected && stepStyles.styleCardSelected]}
              onPress={() => onToggleStyle(option.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  stepStyles.styleIconContainer,
                  isSelected && stepStyles.styleIconContainerSelected,
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={isSelected ? colors.surface : colors.primary}
                />
              </View>
              <Text style={[stepStyles.styleLabel, isSelected && stepStyles.styleLabelSelected]}>
                {option.label}
              </Text>
              <Text style={stepStyles.styleEnLabel}>{option.labelEn}</Text>
              <Text
                style={[
                  stepStyles.styleDescription,
                  isSelected && stepStyles.styleDescriptionSelected,
                ]}
                numberOfLines={2}
              >
                {option.description}
              </Text>
              {isSelected && (
                <View style={stepStyles.checkMark}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  </Animated.View>
);

interface ColorStepProps {
  selectedColors: Set<string>;
  onToggleColor: (id: string) => void;
}

export const ColorStep: React.FC<ColorStepProps> = ({ selectedColors, onToggleColor }) => (
  <Animated.View
    entering={SlideInRight.duration(350)}
    exiting={SlideOutLeft.duration(250)}
    layout={Layout.duration(300)}
    style={stepStyles.stepContent}
  >
    <View style={stepStyles.stepHeader}>
      <Text style={stepStyles.stepTitle}>偏好色彩</Text>
      <Text style={stepStyles.stepSubtitle}>选择你日常穿搭中最常出现的色彩方向</Text>
    </View>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={stepStyles.colorGrid}>
        {COLOR_PALETTES.map((palette) => {
          const isSelected = selectedColors.has(palette.id);
          return (
            <TouchableOpacity
              key={palette.id}
              style={[stepStyles.colorCard, isSelected && stepStyles.colorCardSelected]}
              onPress={() => onToggleColor(palette.id)}
              activeOpacity={0.7}
            >
              <View style={stepStyles.colorSwatches}>
                {palette.colors.map((color, index) => (
                  <View
                    key={index}
                    style={[
                      stepStyles.colorSwatch,
                      { backgroundColor: color },
                      isSelected && { opacity: 1 },
                    ]}
                  />
                ))}
              </View>
              <Text style={[stepStyles.colorLabel, isSelected && stepStyles.colorLabelSelected]}>
                {palette.label}
              </Text>
              <Text style={stepStyles.colorDescription} numberOfLines={2}>
                {palette.description}
              </Text>
              {isSelected && (
                <View style={stepStyles.checkMark}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.surface} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  </Animated.View>
);

interface BodyStepProps {
  height: string;
  weight: string;
  bodyType: string | null;
  onHeightChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onBodyTypeChange: (value: string | null) => void;
  onSkip: () => void;
}

export const BodyStep: React.FC<BodyStepProps> = ({
  height,
  weight,
  bodyType,
  onHeightChange,
  onWeightChange,
  onBodyTypeChange,
  onSkip,
}) => (
  <Animated.View
    entering={SlideInRight.duration(350)}
    exiting={SlideOutLeft.duration(250)}
    layout={Layout.duration(300)}
    style={stepStyles.stepContent}
  >
    <View style={stepStyles.stepHeader}>
      <Text style={stepStyles.stepTitle}>身材参数</Text>
      <Text style={stepStyles.stepSubtitle}>
        提供基本身材数据，帮助我们给出更精准的尺码和版型推荐
      </Text>
      <TouchableOpacity onPress={onSkip} style={stepStyles.skipButton}>
        <Text style={stepStyles.skipText}>暂时跳过</Text>
      </TouchableOpacity>
    </View>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={stepStyles.bodyForm}>
        <View style={stepStyles.inputRow}>
          <View style={stepStyles.inputField}>
            <Text style={stepStyles.inputLabel}>身高 (cm)</Text>
            <View style={stepStyles.inputContainer}>
              <Ionicons name="resize-outline" size={18} color={colors.textTertiary} />
              <TextInput
                style={stepStyles.textInput}
                placeholder="170"
                placeholderTextColor={colors.textTertiary}
                value={height}
                onChangeText={onHeightChange}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
          <View style={stepStyles.inputField}>
            <Text style={stepStyles.inputLabel}>体重 (kg)</Text>
            <View style={stepStyles.inputContainer}>
              <Ionicons name="scale-outline" size={18} color={colors.textTertiary} />
              <TextInput
                style={stepStyles.textInput}
                placeholder="65"
                placeholderTextColor={colors.textTertiary}
                value={weight}
                onChangeText={onWeightChange}
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
        </View>
        <Text style={stepStyles.sectionLabel}>体型</Text>
        <View style={stepStyles.bodyTypeGrid}>
          {[
            { id: "rectangle", label: "直筒型", icon: "remove-outline" },
            { id: "triangle", label: "梨型", icon: "triangle-outline" },
            {
              id: "inverted_triangle",
              label: "倒三角",
              icon: "arrow-up-outline",
            },
            { id: "hourglass", label: "沙漏型", icon: "hourglass-outline" },
            { id: "oval", label: "椭圆型", icon: "ellipse-outline" },
          ].map((option) => {
            const isSelected = bodyType === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[stepStyles.bodyTypeOption, isSelected && stepStyles.bodyTypeOptionSelected]}
                onPress={() => onBodyTypeChange(isSelected ? null : option.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={isSelected ? colors.surface : colors.textSecondary}
                />
                <Text
                  style={[stepStyles.bodyTypeLabel, isSelected && stepStyles.bodyTypeLabelSelected]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  </Animated.View>
);

export const AIIntroStep: React.FC = () => (
  <Animated.View
    entering={SlideInRight.duration(350)}
    exiting={SlideOutLeft.duration(250)}
    layout={Layout.duration(300)}
    style={stepStyles.stepContent}
  >
    <View style={stepStyles.stepHeader}>
      <Text style={stepStyles.stepTitle}>认识你的 AI 造型顾问</Text>
      <Text style={stepStyles.stepSubtitle}>
        悬浮在屏幕一侧的 AI 球，随时为你提供穿搭灵感和建议
      </Text>
    </View>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={stepStyles.aiIntroContainer}>
        <View style={stepStyles.aiOrbContainer}>
          <View style={stepStyles.aiOrbOuter}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={stepStyles.aiOrb}
            >
              <Ionicons name="sparkles" size={36} color={colors.surface} />
            </LinearGradient>
          </View>
        </View>

        <View style={stepStyles.featureList}>
          {[
            {
              icon: "shirt-outline",
              title: "智能穿搭推荐",
              description: "根据你的风格偏好、身材数据和场景需求，生成个性化穿搭方案",
            },
            {
              icon: "camera-outline",
              title: "拍照识别",
              description: "拍摄单品照片，自动识别风格、色彩和搭配建议",
            },
            {
              icon: "color-palette-outline",
              title: "色彩分析",
              description: "分析你的肤色和色彩偏好，推荐最适合你的色系",
            },
            {
              icon: "chatbubble-ellipses-outline",
              title: "随时对话",
              description: "点击 AI 球即可开启对话，获取实时穿搭建议",
            },
          ].map((feature, index) => (
            <View key={index} style={stepStyles.featureItem}>
              <View style={stepStyles.featureIconContainer}>
                <Ionicons name={feature.icon} size={22} color={colors.primary} />
              </View>
              <View style={stepStyles.featureContent}>
                <Text style={stepStyles.featureTitle}>{feature.title}</Text>
                <Text style={stepStyles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  </Animated.View>
);

// --- Step-specific styles ---

export const stepStyles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[4],
  },
  stepTitle: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing[2],
    lineHeight: 22,
  },
  gridContainer: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  styleCard: {
    width: (SCREEN_WIDTH - Spacing[10] - Spacing[3]) / 2,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  styleCardSelected: {
    backgroundColor: "rgba(198, 123, 92, 0.08)",
    borderColor: colors.primary,
  },
  styleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[3],
  },
  styleIconContainerSelected: {
    backgroundColor: colors.primary,
  },
  styleLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  styleLabelSelected: {
    color: colors.primary,
  },
  styleEnLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: Spacing[2],
    letterSpacing: 0.5,
  },
  styleDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  styleDescriptionSelected: {
    color: colors.textSecondary,
  },
  checkMark: {
    position: "absolute",
    top: Spacing[2],
    right: Spacing[2],
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  colorCard: {
    width: (SCREEN_WIDTH - Spacing[10] - Spacing[3]) / 2,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  colorCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198, 123, 92, 0.05)",
  },
  colorSwatches: {
    flexDirection: "row",
    gap: Spacing[1],
    marginBottom: Spacing[3],
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
  },
  colorLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  colorLabelSelected: {
    color: colors.primary,
  },
  colorDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  skipButton: {
    marginTop: Spacing[2],
    alignSelf: "flex-start",
  },
  skipText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    textDecorationLine: "underline",
  },
  bodyForm: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  inputField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: Spacing[2],
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    height: 48,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Spacing[2],
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textPrimary,
    padding: 0,
  },
  sectionLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: Spacing[3],
  },
  bodyTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  bodyTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: Spacing[2],
  },
  bodyTypeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bodyTypeLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  bodyTypeLabelSelected: {
    color: colors.surface,
  },
  aiIntroContainer: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
    alignItems: "center",
  },
  aiOrbContainer: {
    alignItems: "center",
    marginBottom: Spacing[8],
    marginTop: Spacing[4],
  },
  aiOrbOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    ...Shadows.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  aiOrb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  featureList: {
    width: "100%",
    gap: Spacing[4],
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  featureDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
