import React, { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";

interface StyleTagCloudProps {
  tags: string[];
  onTagPress?: (tag: string) => void;
}

const TAG_BG_OPACITIES = [0.1, 0.15, 0.2, 0.12] as const;
const TAG_STAGGER_DELAY = 40;
const TAG_SPRIFY_CONFIG = { damping: 12, stiffness: 180 } as const;

export const StyleTagCloud: React.FC<StyleTagCloudProps> = ({ tags, onTagPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  if (tags.length === 0) {
    return null;
  }

  return (
    <Animated.View style={styles.container}>
      <Animated.View style={styles.tagWrap}>
        {tags.map((tag, index) => (
          <StyleTagItem
            key={tag}
            tag={tag}
            index={index}
            opacityIndex={index % TAG_BG_OPACITIES.length}
            onTagPress={onTagPress}
            styles={styles}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
};

interface StyleTagItemProps {
  tag: string;
  index: number;
  opacityIndex: number;
  onTagPress?: (tag: string) => void;
  styles: ReturnType<typeof useStyles>;
}

const StyleTagItem: React.FC<StyleTagItemProps> = ({
  tag,
  index,
  opacityIndex,
  onTagPress,
  styles,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, SpringConfigs.bouncy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgOpacity = TAG_BG_OPACITIES[opacityIndex];

  return (
    <Animated.View
      entering={FadeInUp.delay(index * TAG_STAGGER_DELAY)
        .springify()
        .damping(TAG_SPRIFY_CONFIG.damping)
        .stiffness(TAG_SPRIFY_CONFIG.stiffness)}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onTagPress ? () => onTagPress(tag) : undefined}
        accessibilityLabel={`风格标签: ${tag}`}
        accessibilityRole="button"
      >
        <Animated.View
          style={[
            styles.tagPill,
            {
              backgroundColor: `${DesignTokens.colors.brand.terracotta}${opacityToHex(bgOpacity)}`,
            },
          ]}
        >
          <Text style={styles.tagText}>{tag}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

function opacityToHex(opacity: number): string {
  const hex = Math.round(opacity * 255).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

const useStyles = createStyles((colors) => ({
  container: {
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[2],
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DesignTokens.spacing[2],
  },
  tagPill: {
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing[1.5],
    borderRadius: DesignTokens.borderRadius.full,
  },
  tagText: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500",
    color: DesignTokens.colors.brand.terracotta,
  },
}));

export default StyleTagCloud;
