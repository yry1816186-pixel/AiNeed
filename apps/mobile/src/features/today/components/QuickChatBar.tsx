import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

export function QuickChatBar() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [text, setText] = useState("");

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="和伊伊聊聊..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendButton}>
          <Ionicons name="send" size={20} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
      <View style={styles.quickReplies}>
        <TouchableOpacity style={styles.quickButton}>
          <Text style={styles.quickButtonText}>换一套</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton}>
          <Text style={styles.quickButtonText}>试穿</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickButton}>
          <Text style={styles.quickButtonText}>更正式</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginLeft: 8,
  },
  quickReplies: {
    flexDirection: "row" as const,
    marginTop: 8,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    marginRight: 8,
  },
  quickButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
  },
}));
