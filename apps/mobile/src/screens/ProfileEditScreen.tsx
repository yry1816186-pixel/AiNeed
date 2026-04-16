import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";

import { Ionicons } from "../polyfills/expo-vector-icons";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { useProfileStore } from "../stores/profileStore";
import { ScreenLayout, Header } from "../shared/components/layout/ScreenLayout";
import type { RootStackParamList } from "../types/navigation";
import type { UpdateProfileDto } from "../services/api/profile.api";

type ProfileEditNavigationProp = NavigationProp<RootStackParamList>;

const GENDER_OPTIONS = [
  { id: "female", label: "女" },
  { id: "male", label: "男" },
  { id: "other", label: "其他" },
];

const AGE_RANGES = ["18-24", "25-30", "31-40", "40+"];

const STYLE_KEYWORDS = [
  "极简",
  "街头",
  "商务休闲",
  "优雅",
  "运动",
  "波西米亚",
  "复古",
  "学院风",
  "休闲",
  "文艺",
  "朋克",
  "韩系",
];

interface BodyFormState {
  height: string;
  weight: string;
  shoulder: string;
  bust: string;
  waist: string;
  hip: string;
  inseam: string;
}

const INITIAL_BODY: BodyFormState = {
  height: "",
  weight: "",
  shoulder: "",
  bust: "",
  waist: "",
  hip: "",
  inseam: "",
};

export const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation<ProfileEditNavigationProp>();
  const { profile, updateProfile, isLoading } = useProfileStore();

  const [gender, setGender] = useState<string | null>(profile?.gender ?? null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [body, setBody] = useState<BodyFormState>(INITIAL_BODY);
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(
    new Set(profile?.stylePreferences?.preferredStyles ?? [])
  );

  useEffect(() => {
    if (profile) {
      setGender(profile.gender ?? null);
      setNickname(profile.nickname ?? "");
      if (profile.height) {
        setBody((prev) => ({ ...prev, height: String(profile.height) }));
      }
      if (profile.weight) {
        setBody((prev) => ({ ...prev, weight: String(profile.weight) }));
      }
      if (profile.shoulder) {
        setBody((prev) => ({ ...prev, shoulder: String(profile.shoulder) }));
      }
      if (profile.bust) {
        setBody((prev) => ({ ...prev, bust: String(profile.bust) }));
      }
      if (profile.waist) {
        setBody((prev) => ({ ...prev, waist: String(profile.waist) }));
      }
      if (profile.hip) {
        setBody((prev) => ({ ...prev, hip: String(profile.hip) }));
      }
      if (profile.inseam) {
        setBody((prev) => ({ ...prev, inseam: String(profile.inseam) }));
      }
      if (profile.stylePreferences?.preferredStyles) {
        setSelectedStyles(new Set(profile.stylePreferences.preferredStyles));
      }
    }
  }, [profile]);

  const handleBodyChange = useCallback((field: keyof BodyFormState, value: string) => {
    setBody((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleStyle = useCallback((keyword: string) => {
    setSelectedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const updateData: UpdateProfileDto = {
      nickname: nickname || undefined,
      gender: (gender as UpdateProfileDto["gender"]) ?? undefined,
      height: body.height ? parseFloat(body.height) : undefined,
      weight: body.weight ? parseFloat(body.weight) : undefined,
      shoulder: body.shoulder ? parseFloat(body.shoulder) : undefined,
      bust: body.bust ? parseFloat(body.bust) : undefined,
      waist: body.waist ? parseFloat(body.waist) : undefined,
      hip: body.hip ? parseFloat(body.hip) : undefined,
      inseam: body.inseam ? parseFloat(body.inseam) : undefined,
      stylePreferences: {
        preferredStyles: Array.from(selectedStyles),
        avoidedStyles: [],
        preferredColors: [],
        avoidedColors: [],
        fitGoals: [],
      },
    };

    try {
      await updateProfile(updateData);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch {
      Alert.alert("保存失败", "请稍后重试");
    }
  }, [nickname, gender, body, selectedStyles, updateProfile, navigation]);

  const renderBodyField = (field: keyof BodyFormState, label: string, unit: string) => (
    <View style={styles.inputField} key={field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="0"
          placeholderTextColor={theme.colors.textTertiary}
          value={body[field]}
          onChangeText={(v) => handleBodyChange(field, v)}
          keyboardType="numeric"
          maxLength={5}
          accessibilityLabel={label}
        />
        <Text style={styles.unitText}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <ScreenLayout
      header={
        <Header
          title="编辑画像"
          leftAction={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityLabel="返回"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          }
          rightAction={
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              accessibilityLabel="保存"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          }
        />
      }
      scrollable
      backgroundColor={Colors.neutral[50]}
    >
      <View style={styles.content}>
        {/* Basic Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>基本信息</Text>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>昵称</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="输入昵称"
                placeholderTextColor={theme.colors.textTertiary}
                value={nickname}
                onChangeText={setNickname}
                accessibilityLabel="昵称"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>性别</Text>
            <View style={styles.pillRow}>
              {GENDER_OPTIONS.map((opt) => {
                const isSelected = gender === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.pill, isSelected && styles.pillSelected]}
                    onPress={() => setGender(opt.id)}
                    activeOpacity={0.7}
                    accessibilityLabel={opt.label}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>年龄段</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {AGE_RANGES.map((range) => {
                const isSelected = ageRange === range;
                return (
                  <TouchableOpacity
                    key={range}
                    style={[styles.pill, isSelected && styles.pillSelected]}
                    onPress={() => setAgeRange(range)}
                    activeOpacity={0.7}
                    accessibilityLabel={range}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {range}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Body Data Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>身材数据</Text>
          <View style={styles.bodyGrid}>
            {renderBodyField("height", "身高", "cm")}
            {renderBodyField("weight", "体重", "kg")}
            {renderBodyField("shoulder", "肩宽", "cm")}
            {renderBodyField("bust", "胸围", "cm")}
            {renderBodyField("waist", "腰围", "cm")}
            {renderBodyField("hip", "臀围", "cm")}
            {renderBodyField("inseam", "内缝", "cm")}
          </View>
        </View>

        {/* Style Preferences Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>风格偏好</Text>
          <View style={styles.tagGrid}>
            {STYLE_KEYWORDS.map((keyword) => {
              const isSelected = selectedStyles.has(keyword);
              return (
                <TouchableOpacity
                  key={keyword}
                  style={[styles.tag, isSelected && styles.tagSelected]}
                  onPress={() => toggleStyle(keyword)}
                  activeOpacity={0.7}
                  accessibilityLabel={keyword}
                  accessibilityRole="button"
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                    {keyword}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  sectionCard: {
    backgroundColor: DesignTokens.colors.neutral.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: Spacing[4],
  },
  formGroup: {
    marginBottom: Spacing[4],
  },
  inputLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: theme.colors.textSecondary,
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
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  unitText: {
    fontSize: DesignTokens.typography.sizes.md,
    color: theme.colors.textTertiary,
    marginLeft: Spacing[2],
  },
  pillRow: {
    flexDirection: "row",
    gap: Spacing[2],
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  pillSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  pillTextSelected: {
    color: DesignTokens.colors.neutral.white,
    fontWeight: "600",
  },
  saveButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  bodyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
  },
  inputField: {
    width: "47%",
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[2],
  },
  tag: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  tagSelected: {
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    borderColor: theme.colors.primary,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "400",
    color: theme.colors.textSecondary,
  },
  tagTextSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
});

export default ProfileEditScreen;
