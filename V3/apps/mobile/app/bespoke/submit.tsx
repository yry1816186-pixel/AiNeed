import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { colors, typography, spacing, radius, shadows } from '../../src/theme';
import { bespokeApi } from '../../src/services/bespoke.api';
import { BUDGET_RANGE_OPTIONS } from '../../src/types';

export default function BespokeSubmitScreen() {
  const router = useRouter();
  const { studioId, studioName } = useLocalSearchParams<{
    studioId?: string;
    studioName?: string;
  }>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!studioId) {
      Alert.alert('提示', '请先选择工作室');
      return;
    }
    if (!description.trim()) {
      Alert.alert('提示', '请描述您的定制需求');
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await bespokeApi.createOrder({
        studioId,
        title: title.trim() || undefined,
        description: description.trim(),
        budgetRange: budgetRange || undefined,
        deadline: deadline || undefined,
      });
      Alert.alert('提交成功', '定制需求已提交，等待工作室回复', [
        {
          text: '查看订单',
          onPress: () => router.replace(`/bespoke/chat/${order.id}`),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '提交失败，请重试';
      Alert.alert('提交失败', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [studioId, title, description, budgetRange, deadline, router]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>提交定制需求</Text>
        {studioName ? (
          <View style={styles.studioTag}>
            <Text style={styles.studioTagText}>{studioName}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>需求标题</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：定制一套商务西装"
          placeholderTextColor={colors.textDisabled}
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          详细描述 <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="请详细描述您的定制需求，包括风格偏好、用途、特殊要求等"
          placeholderTextColor={colors.textDisabled}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>参考图片</Text>
        <TouchableOpacity style={styles.uploadArea} activeOpacity={0.7}>
          <Svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <Rect x="1" y="1" width="30" height="30" rx="8" stroke={colors.textDisabled} strokeWidth="1.5" strokeDasharray="4 3" />
            <Path d="M16 10V22M10 16H22" stroke={colors.textDisabled} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
          <Text style={styles.uploadText}>上传参考图片</Text>
          <Text style={styles.uploadHint}>最多9张</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>预算范围</Text>
        <View style={styles.budgetOptions}>
          {BUDGET_RANGE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.budgetOption,
                budgetRange === option.value && styles.budgetOptionActive,
              ]}
              onPress={() => setBudgetRange(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.budgetOptionText,
                  budgetRange === option.value && styles.budgetOptionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>期望交付日期</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：2026-06-30"
          placeholderTextColor={colors.textDisabled}
          value={deadline}
          onChangeText={setDeadline}
        />
      </View>

      <View style={styles.bottomSpacer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '提交中...' : '提交需求'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  studioTag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  studioTagText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.accent,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md + 2 : spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  textArea: {
    minHeight: 140,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  uploadArea: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  uploadHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  budgetOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  budgetOption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  budgetOptionActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  budgetOptionText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  budgetOptionTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  bottomSpacer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl + spacing.xl,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.button,
    color: colors.white,
  },
});
