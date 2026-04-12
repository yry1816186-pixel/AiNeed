import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ActionSheet } from '../actions/ActionSheet';
import { Badge } from './Badge';
import { colors, spacing, radius, typography, shadows } from '../../theme';

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label?: string;
  options: SelectOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  required?: boolean;
  placeholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  options,
  value,
  onChange,
  multiple = false,
  required = false,
  placeholder = '请选择',
  error,
  containerStyle,
}) => {
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectedValues: string[] = Array.isArray(value) ? value : value ? [value] : [];

  const getLabelByValue = useCallback(
    (val: string): string => {
      const opt = options.find((o) => o.value === val);
      return opt ? opt.label : val;
    },
    [options],
  );

  const displayText = useCallback((): string => {
    if (selectedValues.length === 0) return placeholder;
    if (multiple) {
      return selectedValues.map(getLabelByValue).join('、');
    }
    return getLabelByValue(selectedValues[0]);
  }, [selectedValues, multiple, placeholder, getLabelByValue]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const next = selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange(next);
      } else {
        onChange(optionValue);
        setSheetVisible(false);
      }
    },
    [multiple, selectedValues, onChange],
  );

  const handleRemoveTag = useCallback(
    (tagValue: string) => {
      if (multiple) {
        onChange(selectedValues.filter((v) => v !== tagValue));
      }
    },
    [multiple, selectedValues, onChange],
  );

  const isOptionSelected = useCallback(
    (optionValue: string): boolean => selectedValues.includes(optionValue),
    [selectedValues],
  );

  const renderOption = useCallback(
    ({ item }: { item: SelectOption }) => {
      const selected = isOptionSelected(item.value);
      return (
        <Pressable
          style={[styles.optionItem, selected && styles.optionItemSelected]}
          onPress={() => handleSelect(item.value)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
        >
          <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected ? <View style={styles.checkboxInner} /> : null}
          </View>
          <Text
            style={[styles.optionLabel, selected && styles.optionLabelSelected]}
          >
            {item.label}
          </Text>
        </Pressable>
      );
    },
    [isOptionSelected, handleSelect],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={[
          styles.trigger,
          error ? styles.triggerError : undefined,
        ]}
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.triggerText,
            selectedValues.length === 0 && styles.triggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {displayText()}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {multiple && selectedValues.length > 0 ? (
        <View style={styles.tagsContainer}>
          {selectedValues.map((tagValue) => (
            <Pressable
              key={tagValue}
              onPress={() => handleRemoveTag(tagValue)}
              hitSlop={4}
            >
              <Badge
                label={`${getLabelByValue(tagValue)} ×`}
                variant="accent"
                size="small"
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ActionSheet visible={sheetVisible} onClose={() => setSheetVisible(false)}>
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>{label ?? '请选择'}</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={renderOption}
            scrollEnabled={options.length > 8}
            style={styles.optionList}
          />
        </View>
      </ActionSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    lineHeight: typography.body2.lineHeight,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    height: 48,
    paddingHorizontal: spacing.lg,
    ...shadows.input,
  },
  triggerError: {
    borderColor: colors.error,
  },
  triggerText: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: typography.body.lineHeight,
  },
  triggerPlaceholder: {
    color: colors.textTertiary,
  },
  chevron: {
    fontSize: 16,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  errorText: {
    fontSize: typography.caption.fontSize,
    color: colors.error,
    lineHeight: typography.caption.lineHeight,
    marginLeft: spacing.lg,
  },
  sheetContent: {
    maxHeight: 400,
  },
  sheetTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    lineHeight: typography.h3.lineHeight,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  optionList: {
    maxHeight: 340,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  optionItemSelected: {
    backgroundColor: colors.gray50,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
  optionLabel: {
    fontSize: typography.body.fontSize,
    color: colors.textPrimary,
    lineHeight: typography.body.lineHeight,
  },
  optionLabelSelected: {
    color: colors.accent,
    fontWeight: '500' as const,
  },
});
