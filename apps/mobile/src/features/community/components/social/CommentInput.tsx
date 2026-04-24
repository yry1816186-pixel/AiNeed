import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ViewStyle } from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";

import { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../../design-system/theme";
import { createStyles } from "../../../../shared/contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

export interface CommentInputProps {
  onSubmit: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  placeholder = "写下你的评论...",
  style,
}) => {
  const styles = useStyles(colors);
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scale = useSharedValue(0.95);
  const borderColor = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      scale.value = withSpring(1, springConfig);
      borderColor.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0.95, springConfig);
      borderColor.value = withTiming(0, { duration: 200 });
    }
  }, [isFocused]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    ("worklet");
    const borderColorValue = borderColor.value;
    return {
      transform: [{ scale: scale.value }],
      borderColor: borderColorValue > 0.5 ? colors.primary[500] : colors.neutral[200],
    };
  });

  const handleSubmit = () => {
    if (text.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSubmit(text.trim());
      setText("");
      inputRef.current?.blur();
    }
  };

  return (
    <AnimatedView style={[styles.commentContainer, containerAnimatedStyle, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          value={text}
          onChangeText={setText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, text.trim() ? styles.sendButtonActive : null]}
          onPress={handleSubmit}
          disabled={!text.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={text.trim() ? colors.primary[500] : colors.neutral[300]}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.inputActions}>
        <TouchableOpacity style={styles.actionIcon}>
          <Ionicons name="image-outline" size={20} color={colors.neutral[500]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIcon}>
          <Ionicons name="happy-outline" size={20} color={colors.neutral[500]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIcon}>
          <Ionicons name="at-outline" size={20} color={colors.neutral[500]} />
        </TouchableOpacity>
        <Text style={styles.characterCount}>{text.length}/500</Text>
      </View>
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  commentContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[800],
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: colors.primary[50],
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  actionIcon: {
    padding: 8,
  },
  characterCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[400],
  },
}));
