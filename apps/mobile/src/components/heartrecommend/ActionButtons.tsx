import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme, Colors } from "../../theme";

interface ActionButtonsProps {
  onRefresh: () => void;
}

export const EmptyState: React.FC<ActionButtonsProps> = ({ onRefresh }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>👗</Text>
    <Text style={styles.emptyTitle}>暂无更多推荐</Text>
    <Text style={styles.emptySubtitle}>我们正在为您寻找更多心仪好物</Text>
    <TouchableOpacity
      style={styles.refreshButton}
      onPress={onRefresh}
    >
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.refreshGradient}
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.refreshText}>刷新推荐</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

export const SwipeHints: React.FC = () => (
  <View style={styles.hintRow}>
    <View style={styles.hintItem}>
      <View
        style={[styles.hintIcon, { backgroundColor: Colors.success[50] }]}
      >
        <Ionicons name="arrow-up" size={20} color={Colors.success[500]} />
      </View>
      <Text style={styles.hintText}>上滑加入购物车</Text>
    </View>
    <View style={styles.hintItem}>
      <View
        style={[
          styles.hintIcon,
          { backgroundColor: Colors.neutral[100] },
        ]}
      >
        <Ionicons
          name="arrow-down"
          size={20}
          color={Colors.neutral[500]}
        />
      </View>
      <Text style={styles.hintText}>下滑不喜欢</Text>
    </View>
    <View style={styles.hintItem}>
      <View
        style={[styles.hintIcon, { backgroundColor: Colors.primary[50] }]}
      >
        <Ionicons
          name="arrow-forward"
          size={20}
          color={Colors.primary[500]}
        />
      </View>
      <Text style={styles.hintText}>左右滑浏览</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  refreshButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  refreshGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  refreshText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  hintRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  hintItem: {
    alignItems: "center",
    gap: 6,
  },
  hintIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
});
