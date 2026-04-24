import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
} from "react-native";

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../../design-system/theme";
import { createStyles } from "../../../../shared/contexts/ThemeContext";
import { CommentInput } from "./CommentInput";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
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

const CommentItem: React.FC<{
  item: CommentSheetItem;
  index: number;
  onLikeComment: (commentId: string) => void;
}> = ({ item, index, onLikeComment }) => {
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
              color={item.isLiked ? "colors.error" : colors.neutral[400]}
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

export const CommentSheet: React.FC<CommentSheetProps> = ({
  visible,
  onClose,
  comments,
  onCommentSubmit,
  onLikeComment,
}) => {
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
            <Ionicons name="close" size={24} color={colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={comments}
          renderItem={({ item, index }) => (
            <CommentItem item={item} index={index} onLikeComment={onLikeComment} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          showsVerticalScrollIndicator={false}
        />

        <CommentInput onSubmit={onCommentSubmit} />
      </AnimatedView>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  sheetTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  closeButton: {
    padding: 4,
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
    padding: 16,
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  commentTime: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[400],
    marginLeft: 8,
  },
  commentText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[700],
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  commentLikes: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[500],
    marginLeft: 4,
  },
  replyText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.primary[500],
    fontWeight: "500",
  },
}));
