import React, { useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onCancel: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onCancel,
  onFocus,
  onBlur,
  autoFocus = true,
  style,
}) => {
  const inputRef = useRef<TextInput>(null);
  const cancelWidth = useRef(new Animated.Value(0)).current;
  const cancelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cancelWidth, {
        toValue: value.length > 0 ? 52 : 0,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(cancelOpacity, {
        toValue: value.length > 0 ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [value.length, cancelWidth, cancelOpacity]);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputWrapper}>
        <Svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={styles.searchIcon}>
          <Circle cx="8" cy="8" r="5.5" stroke={colors.textTertiary} strokeWidth="1.5" />
          <Path d="M12 12L16 16" stroke={colors.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="搜索服装、搭配、风格..."
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityRole="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="清除搜索"
          >
            <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <Circle cx="8" cy="8" r="7" fill={colors.gray400} />
              <Path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke={colors.white} strokeWidth="1.2" strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        )}
      </View>
      <Animated.View style={{ width: cancelWidth, opacity: cancelOpacity, overflow: 'hidden' }}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton} accessibilityRole="button">
          <Animated.Text style={styles.cancelText}>取消</Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.xl,
    gap: spacing.sm,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: 0,
    height: '100%',
  },
  clearButton: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 52,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
