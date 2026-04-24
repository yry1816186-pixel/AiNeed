import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import type { RootStackParamList } from "../../../types/navigation";

export function QuickChatBar() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [text, setText] = useState("");
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleVoicePress = () => {
    navigation.navigate("MainTabs", {
      screen: "Stylist",
      params: {
        screen: "AIStylist",
        params: { startVoice: true },
      },
    } as never);
  };

  const handleSend = () => {
    const message = text.trim();
    if (!message) return;

    setText("");
    navigation.navigate("MainTabs", {
      screen: "Stylist",
      params: {
        screen: "AIStylist",
        params: { initialMessage: message },
      },
    } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="和伊伊聊聊..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.voiceButton} onPress={handleVoicePress} activeOpacity={0.7}>
          <Ionicons name="mic-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
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
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.primary,
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
