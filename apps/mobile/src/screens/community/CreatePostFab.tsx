import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';

interface CreatePostFabProps {
  onPress: () => void;
}

function CreatePostFabInner({ onPress }: CreatePostFabProps) {
  return (
    <TouchableOpacity
      style={s.fab}
      onPress={onPress}
      accessibilityLabel="发布动态"
      accessibilityRole="button"
    >
      <Ionicons name="add" size={28} color={theme.colors.surface} />
    </TouchableOpacity>
  );
}

export const CreatePostFab = React.memo(CreatePostFabInner);

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
