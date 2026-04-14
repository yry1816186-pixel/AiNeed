import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../theme';
import { DesignTokens } from '../theme/tokens/design-tokens';
import { AIThinkingAnimation } from '../components/aistylist/AIThinkingAnimation';
import { useAiStylistStore } from '../stores/aiStylistStore';
import { useAiStylistChatStore } from '../stores/aiStylistChatStore';
import type { ChatMessage } from '../stores/aiStylistChatStore';
import type { StylistStackParamList } from '../navigation/types';

type AiStylistChatRoute = RouteProp<StylistStackParamList, 'AiStylistChat'>;

const SCENE_BUTTONS = [
  { key: 'date', label: '约会之夜', icon: 'heart-outline' as const, message: '我需要一套约会穿搭' },
  { key: 'work', label: '职场通勤', icon: 'briefcase-outline' as const, message: '我需要一套职场穿搭' },
  { key: 'casual', label: '休闲周末', icon: 'sunny-outline' as const, message: '我需要一套休闲周末穿搭' },
  { key: 'formal', label: '正式场合', icon: 'ribbon-outline' as const, message: '我需要一套正式场合穿搭' },
  { key: 'travel', label: '旅行出行', icon: 'airplane-outline' as const, message: '我需要旅行穿搭建议' },
];

export const AiStylistChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AiStylistChatRoute>();
  const sessionId = route.params?.sessionId;

  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');

  const { messages, addMessage } = useAiStylistChatStore();

  const {
    currentSessionId,
    isGenerating,
    error,
    createSession,
    sendMessage,
    fetchOutfitPlan,
    clearError,
  } = useAiStylistStore();

  const activeSessionId = sessionId ?? currentSessionId;

  useEffect(() => {
    if (sessionId) {
      useAiStylistStore.getState().setCurrentSessionId(sessionId);
    }
  }, [sessionId]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isGenerating) return;

    setInputText('');

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    let sid = activeSessionId;
    if (!sid) {
      sid = await createSession(text);
    }

    if (sid) {
      const result = await sendMessage(text);
      if (result?.assistantMessage) {
        const assistantMsg: ChatMessage = {
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: result.assistantMessage,
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMsg);
      }
      if (result?.result) {
        await fetchOutfitPlan(sid);
      }
    }
  }, [inputText, isGenerating, activeSessionId, createSession, sendMessage, fetchOutfitPlan]);

  const handleScenePress = useCallback(
    async (scene: typeof SCENE_BUTTONS[number]) => {
      if (isGenerating) return;

      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: scene.message,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);

      let sid = activeSessionId;
      if (!sid) {
        sid = await createSession(scene.message);
      }
      if (sid) {
        const result = await sendMessage(scene.message);
        if (result?.assistantMessage) {
          const assistantMsg: ChatMessage = {
            id: `assistant_${Date.now()}`,
            role: 'assistant',
            content: result.assistantMessage,
            timestamp: new Date().toISOString(),
          };
          addMessage(assistantMsg);
        }
      }
    },
    [isGenerating, activeSessionId, createSession, sendMessage],
  );

  const renderMessage = useCallback((msg: ChatMessage) => (
    <View
      key={msg.id}
      style={[s.messageBubble, msg.role === 'user' ? s.userBubble : s.assistantBubble]}
    >
      {msg.role === 'assistant' && (
        <View style={s.aiAvatar}>
          <Ionicons name="sparkles" size={12} color={theme.colors.surface} />
        </View>
      )}
      <View style={[s.bubbleContent, msg.role === 'user' ? s.userBubbleContent : s.assistantBubbleContent]}>
        <Text style={[s.bubbleText, msg.role === 'user' ? s.userBubbleText : s.assistantBubbleText]}>
          {msg.content}
        </Text>
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.onlineDot} />
          <Text style={s.headerTitle}>AI 造型师</Text>
        </View>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => (navigation as any).navigate('ChatHistory')}
        >
          <Ionicons name="time-outline" size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollViewRef}
          style={s.flex}
          contentContainerStyle={s.messagesContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {error && (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>{error}</Text>
              <TouchableOpacity onPress={clearError}>
                <Text style={s.errorDismiss}>关闭</Text>
              </TouchableOpacity>
            </View>
          )}

          {messages.length === 0 && (
            <View style={s.welcomeSection}>
              <View style={s.welcomeIcon}>
                <Ionicons name="sparkles" size={32} color={theme.colors.primary} />
              </View>
              <Text style={s.welcomeTitle}>今天想穿什么？</Text>
              <Text style={s.welcomeSubtitle}>
                告诉我场合、心情，或者让我给你惊喜
              </Text>
            </View>
          )}

          {messages.map(renderMessage)}

          {isGenerating && (
            <View style={[s.messageBubble, s.assistantBubble]}>
              <View style={s.aiAvatar}>
                <Ionicons name="sparkles" size={12} color={theme.colors.surface} />
              </View>
              <AIThinkingAnimation />
            </View>
          )}
        </ScrollView>

        {/* Scene quick buttons */}
        <View style={s.sceneRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sceneScrollContent}>
            {SCENE_BUTTONS.map((scene) => (
              <TouchableOpacity
                key={scene.key}
                style={s.sceneButton}
                onPress={() => handleScenePress(scene)}
                disabled={isGenerating}
              >
                <Ionicons name={scene.icon} size={16} color={theme.colors.primary} />
                <Text style={s.sceneLabel}>{scene.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input area */}
        <View style={s.inputRow}>
          <View style={s.inputWrapper}>
            <TextInput
              style={s.input}
              placeholder="描述你的穿搭需求..."
              placeholderTextColor={theme.colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              editable={!isGenerating}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[s.sendButton, (!inputText.trim() || isGenerating) && s.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={inputText.trim() ? '#fff' : theme.colors.textTertiary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.success },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messagesContainer: { padding: 16, paddingBottom: 8 },
  welcomeSection: { alignItems: 'center', paddingVertical: 40 },
  welcomeIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.colors.subtleBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  welcomeTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  welcomeSubtitle: {
    fontSize: 14, color: theme.colors.textSecondary, marginTop: 8,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 32,
  },
  messageBubble: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  bubbleContent: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  userBubbleContent: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  assistantBubbleContent: { backgroundColor: theme.colors.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userBubbleText: { color: theme.colors.surface },
  assistantBubbleText: { color: theme.colors.text },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomLeftRadius: 4,
  },
  typingText: { fontSize: 13, color: theme.colors.textSecondary },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, padding: 10, borderRadius: 10,
    backgroundColor: DesignTokens.colors.semantic.errorLight,
  },
  errorText: { fontSize: 13, color: theme.colors.error, flex: 1 },
  errorDismiss: { fontSize: 13, color: theme.colors.error, fontWeight: '600', marginLeft: 12 },
  sceneRow: {
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  sceneScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  sceneButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: theme.colors.subtleBg,
  },
  sceneLabel: { fontSize: 12, fontWeight: '500', color: theme.colors.primary },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  inputWrapper: {
    flex: 1, backgroundColor: theme.colors.background,
    borderRadius: 20, paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 14, color: theme.colors.text, maxHeight: 80, paddingVertical: 8 },
  sendButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: theme.colors.subtleBg },
});

export default AiStylistChatScreen;
