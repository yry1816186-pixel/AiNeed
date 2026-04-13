import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ErrorInfo } from 'react';

import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useSharedValue,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from '@/src/polyfills/expo-image-picker';

import {
  aiStylistApi,
  type AiStylistAction,
  type AiStylistProgress,
  type AiStylistSessionResponse,
} from '../services/api/ai-stylist.api';
import { ensureAuthenticatedAssetUrl } from '../services/api/asset-url';
import { resolveDisplayUri } from '../services/api/display-asset';
import photosApi, { type UserPhoto } from '../services/api/photos.api';
import { useAuthStore } from '../stores/index';
import { theme } from '../theme';
// 引入增强主题令牌
import { colors } from '../theme/tokens/colors';
import { typography } from '../theme/tokens/typography';
import { spacing } from '../theme/tokens/spacing';
import { shadows } from '../theme/tokens/shadows';
import type { RootStackParamList } from '../types/navigation';
import { withErrorBoundary } from '../components/ErrorBoundary';
import type { StructuredError } from '../utils/errorHandling';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

const PHOTO_POLL_MAX_ATTEMPTS = 10;
const PHOTO_POLL_INTERVAL_MS = 1500;

/**
 * 消息气泡组件 - 使用 React.memo 优化
 * 避免其他消息变化时不必要的重渲染
 *
 * 视觉升级（国赛一等奖水准）：
 * - 用户消息：珊瑚粉渐变背景 + 右对齐 + 白色文字
 * - AI消息：浅灰背景 + 左对齐 + 深色文字 + 左下角小三角
 * - 圆角：16px（大圆角传达友好感）
 * - 阴影：轻微阴影提升层次感
 */
interface MessageBubbleProps {
  message: ChatMessage;
}

// ========== 打字指示器动画组件 ==========
const TypingIndicator: React.FC = memo(function TypingIndicator() {
  const dot1Y = useSharedValue(0);
  const dot2Y = useSharedValue(0);
  const dot3Y = useSharedValue(0);

  React.useEffect(() => {
    dot1Y.value = withRepeat(
      withSequence(withTiming(-8, { duration: 300 }), withTiming(0, { duration: 300 })),
      -1,
      false,
    );
    dot2Y.value = withRepeat(
      withDelay(150, withSequence(withTiming(-8, { duration: 300 }), withTiming(0, { duration: 300 }))),
      -1,
      false,
    );
    dot3Y.value = withRepeat(
      withDelay(300, withSequence(withTiming(-8, { duration: 300 }), withTiming(0, { duration: 300 }))),
      -1,
      false,
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({ transform: [{ translateY: dot1Y.value }] }));
  const animatedStyle2 = useAnimatedStyle(() => ({ transform: [{ translateY: dot2Y.value }] }));
  const animatedStyle3 = useAnimatedStyle(() => ({ transform: [{ translateY: dot3Y.value }] }));

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <View style={[styles.typingDot, animatedStyle1]} />
        <View style={[styles.typingDot, animatedStyle2]} />
        <View style={[styles.typingDot, animatedStyle3]} />
      </View>
    </View>
  );
});

const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <Animated.View entering={FadeInUp.duration(300).springify()}>
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        {/* AI头像（仅AI消息显示） */}
        {!isUser && (
          <LinearGradient
            colors={[colors.warmPrimary.coral[400], colors.warmPrimary.mint[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiAvatarSmall}
          >
            <Text style={styles.aiAvatarEmoji}>✨</Text>
          </LinearGradient>
        )}

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {/* 用户消息：渐变背景 */}
          {isUser ? (
            <LinearGradient
              colors={[colors.warmPrimary.coral[500], colors.warmPrimary.coral[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.userGradient}
            >
              <Text style={styles.userMessageText}>{message.content}</Text>
            </LinearGradient>
          ) : (
            <>
              <Text style={styles.messageText}>{message.content}</Text>
              {/* AI消息小三角指示器 */}
              <View style={styles.assistantTriangle} />
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

function buildMessage(role: MessageRole, content: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function summariseOutfits(data: AiStylistSessionResponse): string[] {
  if (!data.result?.outfits?.length) {
    return [];
  }

  return data.result.outfits.map((outfit, index) => {
    const items = outfit.items.map((item) => `${item.name}（${item.category}）`).join(' / ');
    const reasoning = outfit.styleExplanation.join(' / ');
    return `方案 ${index + 1} · ${outfit.title}\n${items}\n${reasoning}`;
  });
}

const AiStylistScreenV2: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const hasInitializedRef = useRef(false);
  const lastAssistantMessageRef = useRef<string | null>(null);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<AiStylistAction | null>(null);
  const [progress, setProgress] = useState<AiStylistProgress | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<UserPhoto[]>([]);
  const [recentPhotosLoading, setRecentPhotosLoading] = useState(false);
  const [recentPhotoDisplayUris, setRecentPhotoDisplayUris] = useState<Record<string, string>>(
    {},
  );

  const appendMessage = useCallback((role: MessageRole, content: string) => {
    setMessages((prev) => [...prev, buildMessage(role, content)]);
  }, []);

  const appendAssistantOnce = useCallback(
    (content?: string | null) => {
      const trimmed = content?.trim();
      if (!trimmed || trimmed === lastAssistantMessageRef.current) {
        return;
      }

      lastAssistantMessageRef.current = trimmed;
      appendMessage('assistant', trimmed);
    },
    [appendMessage],
  );

  const handleResponse = useCallback(
    (data: AiStylistSessionResponse, options?: { appendAssistant?: boolean; includeSummary?: boolean }) => {
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      setCurrentAction(data.nextAction ?? null);
      setProgress(data.progress ?? null);

      if (options?.appendAssistant !== false) {
        appendAssistantOnce(data.assistantMessage);
      }

      if (options?.includeSummary !== false) {
        if (data.result?.lookSummary) {
          appendAssistantOnce(data.result.lookSummary);
        }

        summariseOutfits(data).forEach((summary) => appendAssistantOnce(summary));
      }
    },
    [appendAssistantOnce],
  );

  const initSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await aiStylistApi.createSession();
      if (response.success && response.data) {
        handleResponse(response.data);
      } else {
        appendAssistantOnce('AI 造型师已经就位，先告诉我你今天想穿去哪里。');
      }
    } catch {
      appendAssistantOnce('AI 造型师已经就位，先告诉我你今天想穿去哪里。');
    } finally {
      setLoading(false);
    }
  }, [appendAssistantOnce, handleResponse]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    void initSession();
  }, [authLoading, initSession, isAuthenticated]);

  const pollForPhotoAnalysis = useCallback(
    async (activeSessionId: string) => {
      for (let attempt = 0; attempt < PHOTO_POLL_MAX_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, PHOTO_POLL_INTERVAL_MS));

        const response = await aiStylistApi.getSessionStatus(activeSessionId);
        if (!response.success || !response.data) {
          continue;
        }

        const analysisDone = Boolean(
          response.data.analysisStatus &&
            response.data.analysisStatus !== 'pending' &&
            response.data.analysisStatus !== 'processing',
        );

        handleResponse(response.data, { appendAssistant: analysisDone });

        if (analysisDone) {
          return;
        }
      }
    },
    [handleResponse],
  );

  const hydrateRecentPhotoDisplayUris = useCallback(async (photos: UserPhoto[]) => {
    const resolvedEntries = await Promise.all(
      photos.map(async (photo) => {
        const previewUri = ensureAuthenticatedAssetUrl(
          photo.thumbnailDataUri || photo.thumbnailUrl || photo.url || '',
        );
        const resolvedUri = await resolveDisplayUri(previewUri);
        return [photo.id, resolvedUri || previewUri] as const;
      }),
    );

    setRecentPhotoDisplayUris((current) => {
      const next = { ...current };

      for (const [photoId, resolvedUri] of resolvedEntries) {
        if (resolvedUri) {
          next[photoId] = resolvedUri;
        }
      }

      return next;
    });
  }, []);

  const loadRecentPhotos = useCallback(async () => {
    setRecentPhotosLoading(true);
    try {
      const response = await photosApi.getAll();
      if (!response.success || !response.data) {
        setRecentPhotos([]);
        setRecentPhotoDisplayUris({});
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
      void hydrateRecentPhotoDisplayUris(usablePhotos);
    } catch {
      setRecentPhotos([]);
      setRecentPhotoDisplayUris({});
    } finally {
      setRecentPhotosLoading(false);
    }
  }, [currentAction?.photoType, hydrateRecentPhotoDisplayUris]);

  useEffect(() => {
    if (!sessionId) {
      setRecentPhotos([]);
      setRecentPhotosLoading(false);
      setRecentPhotoDisplayUris({});
      return;
    }

    void loadRecentPhotos();
  }, [currentAction?.type, loadRecentPhotos, sessionId]);

  const submitMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) {
        return;
      }

      appendMessage('user', text);
      setSending(true);
      setProgress(null);

      try {
        const response = sessionId
          ? await aiStylistApi.sendMessage(sessionId, text)
          : await aiStylistApi.createSession({ entry: text });

        if (response.success && response.data) {
          handleResponse(response.data);
        } else {
          appendAssistantOnce('我刚才没完全接住这条需求，你再换个说法试试看。');
        }
      } catch {
        appendAssistantOnce('网络有点忙，我马上再帮你接着整理。');
      } finally {
        setSending(false);
      }
    },
    [appendAssistantOnce, appendMessage, handleResponse, sessionId],
  );

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text) {
      return;
    }

    setInputText('');
    await submitMessage(text);
  }, [inputText, submitMessage]);

  const uploadPhoto = useCallback(
    async (source: 'camera' | 'library') => {
      if (!sessionId) {
        appendAssistantOnce('先告诉我你的场景和风格偏好，我再继续分析照片。');
        return;
      }

      setSending(true);
      try {
        const pickerResult =
          source === 'camera'
            ? await (async () => {
                const permission = await requestCameraPermissionsAsync();
                if (!permission.granted) {
                  appendAssistantOnce('需要相机权限后才能拍照分析。');
                  return null;
                }

                return launchCameraAsync({
                  mediaTypes: MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });
              })()
            : await (async () => {
                const permission = await requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                  appendAssistantOnce('需要相册权限后才能选择照片。');
                  return null;
                }

                return launchImageLibraryAsync({
                  mediaTypes: MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });
              })();

        if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]) {
          return;
        }

        appendMessage('user', source === 'camera' ? '我刚拍了一张照片' : '我从相册里选了一张照片');

        const response = await aiStylistApi.uploadPhoto(
          sessionId,
          pickerResult.assets[0].uri,
          currentAction?.photoType ?? 'full_body',
        );

        if (!response.success || !response.data) {
          appendAssistantOnce('照片上传没接上，换一张更清晰的试试。');
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
        appendAssistantOnce('照片上传没接上，换一张更清晰的试试。');
      } finally {
        setSending(false);
      }
    },
    [appendAssistantOnce, appendMessage, currentAction, handleResponse, pollForPhotoAnalysis, sessionId],
  );

  const reuseRecentPhoto = useCallback(
    async (photo: UserPhoto) => {
      if (!sessionId) {
        return;
      }

      setSending(true);
      try {
        appendMessage('user', '我想直接复用最近上传的照片');
        const response = await aiStylistApi.attachExistingPhoto(sessionId, photo.id);

        if (!response.success || !response.data) {
          appendAssistantOnce('最近上传的照片暂时没接上，请换一张或重新上传。');
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
        appendAssistantOnce('最近上传的照片暂时没接上，请换一张或重新上传。');
      } finally {
        setSending(false);
      }
    },
    [appendAssistantOnce, appendMessage, handleResponse, pollForPhotoAnalysis, sessionId],
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
        appendAssistantOnce('还差一点关键信息，我先继续帮你补齐。');
      }
    } catch {
      appendAssistantOnce('生成方案时遇到一点问题，你再点一次我继续。');
    } finally {
      setSending(false);
    }
  }, [appendAssistantOnce, handleResponse, sessionId]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    [],
  );

  const recentPhotoContent = useMemo(() => {
    if (recentPhotosLoading) {
      return <ActivityIndicator size="small" color={theme.colors.primary} />;
    }

    if (recentPhotos.length === 0) {
      return (
        <Text style={styles.recentEmptyText}>
          暂时还没有可复用的照片，也可以直接拍照或从相册选择。
        </Text>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.recentPhotoRow}
      >
        {recentPhotos.map((photo, index) => {
          const statusLabel =
            photo.analysisStatus === 'completed'
              ? '已分析'
              : photo.analysisStatus === 'processing'
                ? '分析中'
                : photo.analysisStatus === 'pending'
                  ? '待分析'
                  : '不可用';

          return (
            <TouchableOpacity
              key={photo.id}
              style={styles.recentPhotoCard}
              onPress={() => reuseRecentPhoto(photo)}
              disabled={sending}
            >
              {(
                recentPhotoDisplayUris[photo.id] ||
                photo.thumbnailDataUri ||
                photo.thumbnailUrl ||
                photo.url
              ) ? (
                <Image
                  source={{
                    uri: ensureAuthenticatedAssetUrl(
                      recentPhotoDisplayUris[photo.id] ||
                        photo.thumbnailDataUri ||
                        photo.thumbnailUrl ||
                        photo.url,
                    ),
                  }}
                  style={styles.recentPhotoImage}
                />
              ) : (
                <View style={[styles.recentPhotoImage, styles.recentPhotoFallback]}>
                  <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
                </View>
              )}
              <Text style={styles.recentPhotoMeta}>{photo.type}</Text>
              <Text style={styles.recentPhotoStatus}>
                {statusLabel} · #{index + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  }, [recentPhotoDisplayUris, recentPhotos, recentPhotosLoading, reuseRecentPhoto, sending]);

  // 使用 useMemo 缓存 Action Panel，避免不必要的重渲染
  const actionPanel = useMemo(() => {
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
          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <Text style={styles.recentSectionTitle}>最近上传</Text>
              {recentPhotos.length > 0 && !recentPhotosLoading ? (
                <TouchableOpacity onPress={loadRecentPhotos} disabled={sending}>
                  <Text style={styles.recentRefreshText}>刷新</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {recentPhotoContent}
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
          <Text style={styles.actionSubtitle}>直接点我给你的选项，会比手打更快。</Text>
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
  }, [
    currentAction,
    progress,
    sending,
    uploadPhoto,
    recentPhotos.length,
    recentPhotosLoading,
    loadRecentPhotos,
    recentPhotoContent,
    handleGenerateOutfit,
    submitMessage,
  ]);

  // 使用 useMemo 缓存 Photo Shortcut Card
  const photoShortcutCard = useMemo(() => {
    if (!sessionId || currentAction?.type === 'request_photo_upload') {
      return null;
    }

    return (
      <View style={styles.shortcutCard}>
        <View style={styles.shortcutHeader}>
          <View>
            <Text style={styles.shortcutTitle}>想让推荐更贴身？</Text>
            <Text style={styles.shortcutSubtitle}>补一张形象照片，或者直接复用最近上传。</Text>
          </View>
          {recentPhotos.length > 0 && !recentPhotosLoading ? (
            <TouchableOpacity onPress={loadRecentPhotos} disabled={sending}>
              <Text style={styles.recentRefreshText}>刷新</Text>
            </TouchableOpacity>
          ) : null}
        </View>
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
        <View style={styles.recentSectionCompact}>{recentPhotoContent}</View>
      </View>
    );
  }, [
    sessionId,
    currentAction?.type,
    recentPhotos.length,
    recentPhotosLoading,
    sending,
    loadRecentPhotos,
    uploadPhoto,
    recentPhotoContent,
  ]);

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
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={3}
          />
        )}

        {actionPanel}
        {photoShortcutCard}

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
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    ...shadows.presets.xs,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== 消息列表 =====
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
    maxWidth: '85%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },

  // ===== 消息气泡（升级版）=====
  messageBubble: {
    borderRadius: spacing.borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.presets.sm,
  },
  assistantBubble: {
    backgroundColor: colors.neutral.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  userGradient: {
    padding: 14,
    borderRadius: spacing.borderRadius['2xl'],
    borderBottomRightRadius: 4,
  },
  assistantTriangle: {
    position: 'absolute',
    bottom: 0,
    left: -6,
    width: 0,
    height: 0,
    borderTopWidth: 0,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftWidth: 0,
    borderRightColor: colors.neutral.white,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  // 文字样式
  messageText: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[900],
    lineHeight: 22,
    padding: 14,
  },
  userMessageText: {
    fontSize: typography.fontSize.base,
    color: '#FFFFFF',
    lineHeight: 22,
  },

  // AI头像
  aiAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  aiAvatarEmoji: {
    fontSize: 16,
  },

  // ===== 打字指示器 =====
  typingContainer: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    marginLeft: 40, // 为AI头像留空间
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: spacing.borderRadius['2xl'],
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.presets.xs,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.warmPrimary.coral[400],
  },

  // ===== 加载状态 =====
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    marginTop: 12,
  },

  // ===== Action卡片 =====
  actionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: spacing.borderRadius['2xl'],
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.presets.md,
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.neutral[500],
    marginTop: 6,
  },

  // 选项按钮
  optionRow: {
    gap: 10,
    paddingTop: 12,
    paddingRight: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.warmPrimary.coral[50],
    borderWidth: 1,
    borderColor: colors.warmPrimary.coral[200],
  },
  optionChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.warmPrimary.coral[700],
  },

  // 照片操作按钮
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
    paddingVertical: 13,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.warmPrimary.ocean[50],
    borderWidth: 1,
    borderColor: colors.warmPrimary.ocean[200],
  },
  photoActionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.warmPrimary.ocean[700],
  },

  // 最近照片区域
  recentSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  recentSectionCompact: {
    marginTop: 14,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
  },
  recentRefreshText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.brand.warmPrimary,
  },
  recentPhotoRow: {
    gap: 12,
    paddingTop: 12,
    paddingRight: 8,
  },
  recentPhotoCard: {
    width: 112,
    padding: 8,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  recentPhotoImage: {
    width: '100%',
    height: 112,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  recentPhotoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentPhotoMeta: {
    marginTop: 8,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold as any,
    color: colors.neutral[700],
    textTransform: 'capitalize',
  },
  recentPhotoStatus: {
    marginTop: 4,
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
  },
  recentEmptyText: {
    marginTop: 12,
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
    color: colors.neutral[500],
  },

  // 快捷卡片
  shortcutCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: spacing.borderRadius['2xl'],
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.presets.sm,
  },
  shortcutHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  shortcutTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.neutral[900],
  },
  shortcutSubtitle: {
    marginTop: 4,
    fontSize: typography.fontSize.sm,
    lineHeight: 19,
    color: colors.neutral[500],
  },

  // 主操作按钮
  primaryActionButton: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: spacing.borderRadius.xl,
    backgroundColor: colors.brand.warmPrimary,
    alignItems: 'center',
    ...shadows.presets.md,
  },
  primaryActionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold as any,
    color: '#FFFFFF',
  },

  // 进度指示
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTextWrap: { flex: 1 },

  // ===== 输入框区域（升级版）=====
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    backgroundColor: colors.neutral.white,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: spacing.borderRadius['2xl'],
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.neutral[900],
    maxHeight: 80,
    paddingVertical: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.warmPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    ...shadows.presets.md,
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
});

const AiStylistScreen = withErrorBoundary(AiStylistScreenV2, {
  screenName: 'AiStylistScreen',
  maxRetries: 2,
  onError: (error: Error, errorInfo: ErrorInfo, structuredError: StructuredError) => {
    console.error('[AiStylistScreen] Error:', structuredError);
  },
  onReset: () => {
    console.log('[AiStylistScreen] Error boundary reset');
  },
});

export { AiStylistScreen };
export default AiStylistScreen;
