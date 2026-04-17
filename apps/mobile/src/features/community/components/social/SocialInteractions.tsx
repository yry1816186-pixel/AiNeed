import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  ViewStyle,
} from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors , Spacing } from '../../../../design-system/theme'
import { DesignTokens } from '../../../../design-system/theme/tokens/design-tokens';

import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';

const { width: _SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);
const _AnimatedImage = AnimatedReanimated.createAnimatedComponent(Image);
const AnimatedTouchableOpacity = AnimatedReanimated.createAnimatedComponent(TouchableOpacity);

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

const bounceConfig = {
  damping: 8,
  stiffness: 400,
  mass: 0.5,
};

export interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onLikePress: () => void;
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
}

export const AnimatedLikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likeCount,
  onLikePress,
  size = "medium",
  style,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const particleScale = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const particleY = useSharedValue(0);

  const sizeConfig = {
    small: { iconSize: 20, fontSize: DesignTokens.typography.sizes.sm },
    medium: { iconSize: 28, fontSize: DesignTokens.typography.sizes.base },
    large: { iconSize: 36, fontSize: DesignTokens.typography.sizes.md },
  };

  const config = sizeConfig[size];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!isLiked) {
      scale.value = withSpring(0.9, springConfig);
      heartScale.value = withSequence(withSpring(1.3, bounceConfig), withSpring(1, springConfig));
      particleScale.value = withSpring(1.5, bounceConfig);
      particleOpacity.value = withTiming(1, { duration: 300 });
      particleY.value = withTiming(-30, { duration: 400 });

      setTimeout(() => {
        scale.value = withSpring(1, springConfig);
        particleOpacity.value = withTiming(0, { duration: 200 });
        particleScale.value = withTiming(0, { duration: 200 });
      }, 400);
    } else {
      scale.value = withSpring(0.9, springConfig);
      setTimeout(() => {
        scale.value = withSpring(1, springConfig);
      }, 100);
    }

    onLikePress();
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const particleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: particleScale.value }, { translateY: particleY.value }],
    opacity: particleOpacity.value,
  }));

  return (
    <TouchableOpacity style={[styles.likeButton, style]} onPress={handlePress} activeOpacity={0.9}>
      <AnimatedView style={buttonAnimatedStyle}>
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={config.iconSize}
          color={isLiked ? "colors.error" : Colors.neutral[400]}
        />
        {isLiked && (
          <AnimatedView style={[StyleSheet.absoluteFill, heartAnimatedStyle]}>
            <Ionicons name="heart" size={config.iconSize} color="colors.error" />
          </AnimatedView>
        )}
      </AnimatedView>

      {isLiked && (
        <AnimatedView style={[styles.particlesContainer, particleAnimatedStyle]}>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <View
                key={i}
                style={[
                  styles.particle,
                  {
                    transform: [{ rotate: `${i * 60}deg` }],
                  },
                ]}
              >
                <View style={styles.particleDot} />
              </View>
            ))}
        </AnimatedView>
      )}

      {likeCount > 0 && (
        <Text style={[styles.likeCount, { fontSize: config.fontSize }]}>{likeCount}</Text>
      )}
    </TouchableOpacity>
  );
};

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  onShare?: (platform: string) => void;
  onSave?: () => void;
  onCopyLink?: () => void;
  product?: {
    name: string;
    image: string;
    price: number;
  };
}

interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SharePlatformItemProps {
  platform: SharePlatform;
  index: number;
  onPress: (platformId: string) => void;
}

const SharePlatformItem: React.FC<SharePlatformItemProps> = ({ platform, index, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const platformScale = useSharedValue(0);

  useEffect(() => {
    platformScale.value = withDelay(300 + index * 50, withSpring(1, springConfig));
  }, [index, platformScale]);

  const platformAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: platformScale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.platformItem, platformAnimatedStyle]}
      onPress={() => onPress(platform.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.platformIcon, { backgroundColor: `${platform.color}20` }]}>
        <Ionicons name={platform.icon} size={24} color={platform.color} />
      </View>
      <Text style={styles.platformName}>{platform.name}</Text>
    </AnimatedTouchableOpacity>
  );
};

export const ShareSheet: React.FC<ShareSheetProps> = ({
  visible,
  onClose,
  onShare,
  onSave,
  onCopyLink,
  product,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const itemOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
      itemOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  const platforms = [
    {
      id: "wechat",
      name: "微信",
      icon: "chatbubble-ellipses",
      color: "colors.success",
    },
    { id: "moments", name: "朋友圈", icon: "camera-outline", color: "colors.success" },
    { id: "weibo", name: "微博", icon: "logo-twitter", color: "colors.error" },
    { id: "qq", name: "QQ", icon: "chatbubbles", color: "colors.info" },
    {
      id: "link",
      name: "复制链接",
      icon: "link-outline",
      color: Colors.neutral[500],
    },
  ];

  const handlePlatformPress = (platformId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare?.(platformId);
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <AnimatedView style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableOpacity>
      </AnimatedView>

      <AnimatedView style={[styles.sheet, sheetAnimatedStyle]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>分享</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {product && (
          <AnimatedView style={[styles.productPreview, itemAnimatedStyle]}>
            <Image source={{ uri: product.image }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>¥{product.price}</Text>
            </View>
          </AnimatedView>
        )}

        <View style={styles.platformsContainer}>
          {platforms.map((platform, index) => (
            <SharePlatformItem
              key={platform.id}
              platform={platform}
              index={index}
              onPress={handlePlatformPress}
            />
          ))}
        </View>

        <View style={styles.actionsContainer}>
          {onSave && (
            <TouchableOpacity style={styles.actionButton} onPress={onSave}>
              <Ionicons name="bookmark-outline" size={20} color={Colors.neutral[600]} />
              <Text style={styles.actionText}>保存到衣橱</Text>
            </TouchableOpacity>
          )}
          {onCopyLink && (
            <TouchableOpacity style={styles.actionButton} onPress={onCopyLink}>
              <Ionicons name="link-outline" size={20} color={Colors.neutral[600]} />
              <Text style={styles.actionText}>复制链接</Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedView>
    </Modal>
  );
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
  const { colors } = useTheme();
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
    "worklet";
    const borderColorValue = borderColor.value;
    return {
      transform: [{ scale: scale.value }],
      borderColor: borderColorValue > 0.5 ? Colors.primary[500] : Colors.neutral[200],
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
          placeholderTextColor={Colors.neutral[400]}
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
            color={text.trim() ? Colors.primary[500] : Colors.neutral[300]}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.inputActions}>
        <TouchableOpacity style={styles.actionIcon}>
          <Ionicons name="image-outline" size={20} color={Colors.neutral[500]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIcon}>
          <Ionicons name="happy-outline" size={20} color={Colors.neutral[500]} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIcon}>
          <Ionicons name="at-outline" size={20} color={Colors.neutral[500]} />
        </TouchableOpacity>
        <Text style={styles.characterCount}>{text.length}/500</Text>
      </View>
    </AnimatedView>
  );
};

export interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: {
    id: string;
    user: { name: string; avatar: string };
    text: string;
    time: string;
    likes: number;
    isLiked: boolean;
  }[];
  onCommentSubmit: (text: string) => void;
  onLikeComment: (commentId: string) => void;
}

type CommentSheetItem = CommentSheetProps["comments"][number];

interface AnimatedCommentItemProps {
  item: CommentSheetItem;
  index: number;
  onLikeComment: (commentId: string) => void;
}

/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks */
const _AnimatedCommentItem: React.FC<AnimatedCommentItemProps> = ({
  item,
  index,
  onLikeComment,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const commentOpacity = useSharedValue(0);
  const commentTranslateX = useSharedValue(20);

  useEffect(() => {
    commentOpacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
    commentTranslateX.value = withDelay(index * 50, withSpring(0, springConfig));
  }, [commentOpacity, commentTranslateX, index]);

  const commentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: commentOpacity.value,
    transform: [{ translateX: commentTranslateX.value }],
  }));

  return (
    <AnimatedView style={[styles.commentItem, commentAnimatedStyle]}>
      <Image source={{ uri: item.user.avatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUserName}>{item.user.name}</Text>
          <Text style={styles.commentTime}>{item.time}</Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity style={styles.commentAction} onPress={() => onLikeComment(item.id)}>
            <Ionicons
              name={item.isLiked ? "heart" : "heart-outline"}
              size={16}
              color={item.isLiked ? "colors.error" : Colors.neutral[400]}
            />
            <Text style={styles.commentLikes}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.commentAction}>
            <Text style={styles.replyText}>鍥炲</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedView>
  );
};
/* eslint-enable @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks */

export const CommentSheet: React.FC<CommentSheetProps> = ({
  visible,
  onClose,
  comments,
  onCommentSubmit,
  onLikeComment,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const CommentItem: React.FC<{ item: CommentSheetItem; index: number }> = ({ item, index }) => {
    const { colors } = useTheme();
    const styles = useStyles(colors);
    const commentOpacity = useSharedValue(0);
    const commentTranslateX = useSharedValue(20);

    useEffect(() => {
      commentOpacity.value = withDelay(index * 50, withTiming(1, { duration: 200 }));
      commentTranslateX.value = withDelay(index * 50, withSpring(0, springConfig));
    }, []);

    const commentAnimatedStyle = useAnimatedStyle(() => ({
      opacity: commentOpacity.value,
      transform: [{ translateX: commentTranslateX.value }],
    }));

    return (
      <AnimatedView key={item.id} style={[styles.commentItem, commentAnimatedStyle]}>
        <Image source={{ uri: item.user.avatar }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUserName}>{item.user.name}</Text>
            <Text style={styles.commentTime}>{item.time}</Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentAction} onPress={() => onLikeComment(item.id)}>
              <Ionicons
                name={item.isLiked ? "heart" : "heart-outline"}
                size={16}
                color={item.isLiked ? "colors.error" : Colors.neutral[400]}
              />
              <Text style={styles.commentLikes}>{item.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.commentAction}>
              <Text style={styles.replyText}>回复</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AnimatedView>
    );
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <AnimatedView style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableOpacity>
      </AnimatedView>

      <AnimatedView style={[styles.commentSheet, sheetAnimatedStyle]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>评论 ({comments.length})</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={comments}
          renderItem={({ item, index }) => <CommentItem item={item} index={index} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          showsVerticalScrollIndicator={false}
        />

        <CommentInput onSubmit={onCommentSubmit} />
      </AnimatedView>
    </Modal>
  );
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
  const { colors } = useTheme();
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
  const { colors } = useTheme();
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
    { id: "like", emoji: "❤️", label: "喜欢" },
    { id: "love", emoji: "😍", label: "超爱" },
    { id: "fire", emoji: "🔥", label: "太棒" },
    { id: "cool", emoji: "😎", label: "酷" },
    { id: "think", emoji: "🤔", label: "思考" },
    { id: "sad", emoji: "😢", label: "难过" },
    { id: "angry", emoji: "😠", label: "生气" },
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
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
  },
  likeCount: {
    marginLeft: Spacing.xs,
    color: Colors.neutral[600],
  },
  particlesContainer: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  particleDot: {
    width: DesignTokens.spacing['1.5'],
    height: DesignTokens.spacing['1.5'],
    borderRadius: 3,
    backgroundColor: "colors.error", // custom color
  },
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  sheetTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: Colors.neutral[800],
  },
  closeButton: {
    padding: Spacing.xs,
  },
  productPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
    marginLeft: DesignTokens.spacing[3],
  },
  productName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: Colors.neutral[800],
  },
  productPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.primary[500],
    marginTop: Spacing.xs,
  },
  platformsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: DesignTokens.spacing[5],
  },
  platformItem: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  platformName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[600],
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: DesignTokens.spacing[3],
    gap: Spacing.sm,
  },
  actionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[600],
    marginLeft: Spacing.sm,
  },
  commentContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: DesignTokens.spacing[3],
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[800],
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary[50],
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  actionIcon: {
    padding: Spacing.sm,
  },
  characterCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[400],
  },
  commentSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  commentsList: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: DesignTokens.spacing[3],
  },
  commentAvatar: {
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    marginRight: DesignTokens.spacing[3],
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  commentUserName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: Colors.neutral[800],
  },
  commentTime: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[400],
    marginLeft: Spacing.sm,
  },
  commentText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  commentLikes: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
    marginLeft: Spacing.xs,
  },
  replyText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.primary[500],
    fontWeight: "500",
  },
  reactionPicker: {
    position: "absolute",
    width: 200,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: DesignTokens.spacing[3],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: Spacing.xs },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionItem: {
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
  },
  reactionEmoji: {
    fontSize: DesignTokens.typography.sizes['2xl'],
  },
  reactionLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: Colors.neutral[500],
    marginTop: DesignTokens.spacing['0.5'],
  },
}))

export default {
  AnimatedLikeButton,
  ShareSheet,
  CommentInput,
  CommentSheet,
  ReactionPicker,
};
