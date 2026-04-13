import React, { useCallback, useEffect, useRef, useState, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from '@/src/polyfills/expo-image-picker';
import { theme } from '../theme';
import { useAuthStore } from '../stores/index';
import photosApi, { type UserPhoto } from '../services/api/photos.api';
import {
  aiStylistApi,
  AiStylistAction,
  AiStylistSessionResponse,
  type AiStylistProgress,
} from '../services/api/ai-stylist.api';
import type { RootStackParamList } from '../types/navigation';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const PHOTO_POLL_MAX_ATTEMPTS = 10;
const PHOTO_POLL_INTERVAL_MS = 1500;

// 消息项高度常量
const MESSAGE_ITEM_HEIGHT = 60;

/**
 * 消息项组件 - 使用 React.memo 优化
 * 避免不必要的重渲染
 */
interface MessageItemProps {
  item: ChatMessage;
}

const MessageItem = memo(function MessageItem({ item }: MessageItemProps) {
  return (
    <View style={[styles.messageRow, item.role === 'user' && styles.userMessageRow]}>
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.messageText, item.role === 'user' && styles.userMessageText]}>
          {item.content}
        </Text>
      </View>
    </View>
  );
});

export const AiStylistScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<AiStylistAction | null>(null);
  const [progress, setProgress] = useState<AiStylistProgress | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<UserPhoto[]>([]);
  const [recentPhotosLoading, setRecentPhotosLoading] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const hasInitializedRef = useRef(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const handleResponse = useCallback(
    (data: AiStylistSessionResponse, appendAssistant: boolean = true) => {
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setCurrentAction(data.nextAction ?? null);
      setProgress(data.progress ?? null);

      if (appendAssistant && data.assistantMessage) {
        addMessage('assistant', data.assistantMessage);
      }

      if (data.result?.lookSummary) {
        addMessage('assistant', data.result.lookSummary);
      }

      if (data.result?.outfits) {
        data.result.outfits.forEach((outfit, index) => {
          const itemSummary = outfit.items
            .map((item) => `${item.name} (${item.category})`)
            .join(' / ');
          addMessage(
            'assistant',
            `方案 ${index + 1}：${outfit.title}\n${itemSummary}\n${outfit.styleExplanation.join('，')}`,
          );
        });
      }
    },
    [addMessage],
  );

  const initSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await aiStylistApi.createSession();
      if (response.success && response.data) {
        handleResponse(response.data);
      } else {
        addMessage('assistant', 'AI 造型师已上线，请告诉我你今天想要什么风格。');
      }
    } catch {
      addMessage('assistant', 'AI 造型师已上线，请告诉我你今天想要什么风格。');
    } finally {
      setLoading(false);
    }
  }, [addMessage, handleResponse]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    initSession();
  }, [authLoading, initSession, isAuthenticated]);

  const submitMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) {
        return;
      }

      addMessage('user', text);
      setSending(true);
      setProgress(null);

      try {
        let response;
        if (sessionId) {
          response = await aiStylistApi.sendMessage(sessionId, text);
        } else {
          response = await aiStylistApi.createSession({ entry: text });
        }

        if (response.success && response.data) {
          handleResponse(response.data);
        } else {
          addMessage('assistant', '抱歉，我刚才没有接住这条需求，请再说一次。');
        }
      } catch {
        addMessage('assistant', '网络有点忙，稍后再试一次。');
      } finally {
        setSending(false);
      }
    },
    [addMessage, handleResponse, sessionId],
  );

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text) {
      return;
    }

    setInputText('');
    await submitMessage(text);
  }, [inputText, submitMessage]);

  const pollForPhotoAnalysis = useCallback(
    async (activeSessionId: string) => {
      for (let attempt = 0; attempt < PHOTO_POLL_MAX_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, PHOTO_POLL_INTERVAL_MS));

        const response = await aiStylistApi.getSessionStatus(activeSessionId);
        if (!response.success || !response.data) {
          continue;
        }

        handleResponse(response.data);

        if (
          response.data.analysisStatus &&
          response.data.analysisStatus !== 'pending' &&
          response.data.analysisStatus !== 'processing'
        ) {
          return;
        }
      }
    },
    [handleResponse],
  );

  const loadRecentPhotos = useCallback(async () => {
    setRecentPhotosLoading(true);
    try {
      const response = await photosApi.getAll();
      if (!response.success || !response.data) {
        setRecentPhotos([]);
        return;
      }

      const preferredType = currentAction?.photoType ?? 'full_body';
      const usablePhotos = response.data
        .filter((photo) => photo.analysisStatus !== 'failed')
        .sort((left, right) => {
          if (left.type === preferredType && right.type !== preferredType) {
            return -1;
          }
          if (right.type === preferredType && left.type !== preferredType) {
            return 1;
          }
          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        })
        .slice(0, 6);

      setRecentPhotos(usablePhotos);
    } catch {
      setRecentPhotos([]);
    } finally {
      setRecentPhotosLoading(false);
    }
  }, [currentAction?.photoType]);

  useEffect(() => {
    if (currentAction?.type !== 'request_photo_upload' || !sessionId) {
      setRecentPhotos([]);
      setRecentPhotosLoading(false);
      return;
    }

    loadRecentPhotos();
  }, [currentAction?.type, loadRecentPhotos, sessionId]);

  const uploadPhoto = useCallback(
    async (source: 'camera' | 'library') => {
      if (!sessionId) {
        addMessage('assistant', '请先告诉我你的场景和风格偏好，我再继续分析照片。');
        return;
      }

      setSending(true);
      try {
        let imageResult;
        if (source === 'camera') {
          const permission = await requestCameraPermissionsAsync();
          if (!permission.granted) {
            addMessage('assistant', '需要相机权限后才能拍照分析。');
            return;
          }

          imageResult = await launchCameraAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
        } else {
          const permission = await requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            addMessage('assistant', '需要相册权限后才能选择照片。');
            return;
          }

          imageResult = await launchImageLibraryAsync({
            mediaTypes: MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
        }

        if (imageResult.canceled || !imageResult.assets?.[0]) {
          return;
        }

        addMessage('user', source === 'camera' ? '我已拍照上传' : '我已从相册上传照片');

        const response = await aiStylistApi.uploadPhoto(
          sessionId,
          imageResult.assets[0].uri,
          currentAction?.photoType ?? 'full_body',
        );

        if (!response.success || !response.data) {
          addMessage('assistant', '照片上传失败了，请换一张清晰一些的照片再试。');
          return;
        }

        handleResponse(response.data);

        if (
          response.data.analysisStatus === 'pending' ||
          response.data.analysisStatus === 'processing' ||
          response.data.nextAction?.type === 'poll_analysis'
        ) {
          await pollForPhotoAnalysis(sessionId);
        }
      } catch {
        addMessage('assistant', '照片上传失败了，请换一张清晰一些的照片再试。');
      } finally {
        setSending(false);
      }
    },
    [addMessage, currentAction, handleResponse, pollForPhotoAnalysis, sessionId],
  );

  const reuseRecentPhoto = useCallback(
    async (photo: UserPhoto) => {
      if (!sessionId) {
        return;
      }

      setSending(true);
      try {
        addMessage('user', '我想直接复用最近上传的照片');
        const response = await aiStylistApi.attachExistingPhoto(sessionId, photo.id);

        if (!response.success || !response.data) {
          addMessage('assistant', '最近上传的照片暂时没接上，请换一张或重新上传。');
          return;
        }

        handleResponse(response.data);

        if (
          response.data.analysisStatus === 'pending' ||
          response.data.analysisStatus === 'processing' ||
          response.data.nextAction?.type === 'poll_analysis'
        ) {
          await pollForPhotoAnalysis(sessionId);
        }
      } catch {
        addMessage('assistant', '最近上传的照片暂时没接上，请换一张或重新上传。');
      } finally {
        setSending(false);
      }
    },
    [addMessage, handleResponse, pollForPhotoAnalysis, sessionId],
  );

  const handleGenerateOutfit = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setSending(true);
    try {
      const response = await aiStylistApi.resolveSession(sessionId);
      if (response.success && response.data) {
        handleResponse(response.data);
      } else {
        addMessage('assistant', '还差一点信息，我先继续帮你补齐。');
      }
    } catch {
      addMessage('assistant', '生成方案时遇到一点问题，请再试一次。');
    } finally {
      setSending(false);
    }
  }, [addMessage, handleResponse, sessionId]);

  const renderActionPanel = () => {
    if (!currentAction && !progress) {
      return null;
    }

    if (progress?.isWaiting || currentAction?.type === 'poll_analysis') {
      return (
        <View style={styles.actionCard}>
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <View style={styles.progressTextWrap}>
              <Text style={styles.actionTitle}>{progress?.title ?? '正在分析照片'}</Text>
              <Text style={styles.actionSubtitle}>
                {progress?.detail ?? '我正在读取你的身材和色彩信息，请稍等片刻。'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (currentAction?.type === 'request_photo_upload') {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>补一张照片，推荐会更准</Text>
          <Text style={styles.actionSubtitle}>
            我会结合身材比例、肤色和场景继续细化推荐。
          </Text>
          <View style={styles.photoButtonRow}>
            <TouchableOpacity
              style={styles.photoActionButton}
              onPress={() => uploadPhoto('camera')}
              disabled={sending}
            >
              <Ionicons name="camera-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.photoActionText}>拍照</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoActionButton}
              onPress={() => uploadPhoto('library')}
              disabled={sending}
            >
              <Ionicons name="images-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.photoActionText}>相册</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (currentAction?.type === 'generate_outfit') {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>信息已经够用了</Text>
          <Text style={styles.actionSubtitle}>我可以直接开始为你生成完整穿搭方案。</Text>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleGenerateOutfit}
            disabled={sending}
          >
            <Text style={styles.primaryActionText}>生成穿搭方案</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentAction?.options?.length) {
      return (
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>继续点选也可以</Text>
          <Text style={styles.actionSubtitle}>直接点我给你的选项，会比纯手打更快。</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionRow}
          >
            {currentAction.options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.optionChip}
                onPress={() => submitMessage(option)}
                disabled={sending}
              >
                <Text style={styles.optionChipText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    return null;
  };

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageItem item={item} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // 使用 getItemLayout 优化 FlatList 性能
  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
      length: MESSAGE_ITEM_HEIGHT,
      offset: MESSAGE_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>AI 造型师</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading && messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>AI 造型师准备中...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            // FlatList 性能优化参数
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={15}
            windowSize={5}
            initialNumToRender={15}
          />
        )}

        {renderActionPanel()}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="描述你的场景、预算和风格偏好..."
              placeholderTextColor={theme.colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
              editable={!sending}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? '#fff' : theme.colors.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: {
    marginBottom: 12,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  userMessageRow: { alignSelf: 'flex-end' },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
  userMessageText: { color: '#fff' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8 },
  actionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  optionRow: {
    gap: 10,
    paddingTop: 12,
    paddingRight: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: theme.colors.cartLight,
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  photoButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  photoActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.cartLight,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  primaryActionButton: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTextWrap: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: theme.colors.surface },
});

export default AiStylistScreen;
