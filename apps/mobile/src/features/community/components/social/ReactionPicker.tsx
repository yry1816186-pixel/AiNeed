import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

import { flatColors as colors } from "../../../../design-system/theme";
import { createStyles } from "../../../../shared/contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = AnimatedReanimated.createAnimatedComponent(TouchableOpacity);

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

export interface ReactionPickerProps {
  visible: boolean;
  position: { x: number; y: number };
  onSelect: (reaction: string) => void;
  onDismiss: () => void;
}

interface ReactionOption {
  id: string;
  emoji: string;
  label: string;
}

interface ReactionOptionItemProps {
  reaction: ReactionOption;
  index: number;
  onSelect: (reaction: string) => void;
}

const ReactionOptionItem: React.FC<ReactionOptionItemProps> = ({ reaction, index, onSelect }) => {
  const styles = useStyles(colors);
  const reactionScale = useSharedValue(0);

  useEffect(() => {
    reactionScale.value = withDelay(index * 30, withSpring(1, springConfig));
  }, [index, reactionScale]);

  const reactionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reactionScale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.reactionItem, reactionAnimatedStyle]}
      onPress={() => onSelect(reaction.emoji)}
      activeOpacity={0.7}
    >
      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
      <Text style={styles.reactionLabel}>{reaction.label}</Text>
    </AnimatedTouchableOpacity>
  );
};

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  position,
  onSelect,
  onDismiss,
}) => {
  const styles = useStyles(colors);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, springConfig);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const reactions = [
    { id: "like", emoji: "\u2764\uFE0F", label: "喜欢" },
    { id: "love", emoji: "\uD83D\uDE0D", label: "超爱" },
    { id: "fire", emoji: "\uD83D\uDD25", label: "太棒" },
    { id: "cool", emoji: "\uD83D\uDE0E", label: "酷" },
    { id: "think", emoji: "\uD83E\uDD14", label: "思考" },
    { id: "sad", emoji: "\uD83D\uDE22", label: "难过" },
    { id: "angry", emoji: "\uD83D\uDE20", label: "生气" },
  ];

  const handleReaction = (reaction: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(reaction);
  };

  if (!visible) {
    return null;
  }

  return (
    <AnimatedView
      style={[
        styles.reactionPicker,
        {
          left: position.x - 100,
          top: position.y - 60,
        },
        containerAnimatedStyle,
      ]}
    >
      {reactions.map((reaction, index) => (
        <ReactionOptionItem
          key={reaction.id}
          reaction={reaction}
          index={index}
          onSelect={handleReaction}
        />
      ))}
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  reactionPicker: {
    position: "absolute",
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionItem: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reactionEmoji: {
    fontSize: DesignTokens.typography.sizes["2xl"],
  },
  reactionLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.neutral[500],
    marginTop: 2,
  },
}));
