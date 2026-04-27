/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import { logger } from "../../../shared/utils/logger";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { navigateTab } from "../../../navigation/navigationService";
import { AICompanionBall, CompanionState } from "./AICompanionBall";
import { AICompanionMenu, QuickAction } from "./AICompanionMenu";
import { AICompanionChat, ChatMessage } from "./AICompanionChat";
import {
  aiStylistApi,
  AiStylistSessionResponse,
  AiStylistAction,
  AiStylistActionType,
  AiStylistSessionState,
  AiStylistSlots,
  AiStylistResolution,
  AiStylistProgress,
  AiStylistOutfitPlan,
} from "../../../services/api/ai-stylist.api";
import { useSpeechRecognition } from "../../../services/speech/speechRecognition";
import { useAiStylistStore } from "../stores/aiStylistStore";

const POSITION_STORAGE_KEY = "@xuno_companion_position";
const SESSION_STORAGE_KEY = "@xuno_stylist_session";

export interface ExtendedChatMessage extends ChatMessage {
  actionType?: AiStylistActionType;
  actionData?: AiStylistAction;
  outfitResult?: AiStylistResolution;
  progress?: AiStylistProgress;
}

interface AICompanionContextValue {
  isVisible: boolean;
  state: CompanionState;
  messages: ExtendedChatMessage[];
  sessionState: AiStylistSessionState | null;
  slots: AiStylistSlots | null;
  showCompanion: () => void;
  hideCompanion: () => void;
  setState: (state: CompanionState) => void;
  sendMessage: (content: string) => Promise<void>;
  openChat: () => void;
  closeChat: () => void;
  showMenu: () => void;
  hideMenu: () => void;
  startVoiceInput: () => void;
  stopVoiceInput: () => void;
  isVoiceAvailable: boolean;
  uploadPhoto: (source?: "camera" | "library") => Promise<void>;
  selectPreference: (field: string, values: string[]) => Promise<void>;
  generateOutfit: () => Promise<void>;
  resetSession: () => void;
}

const AICompanionContext = createContext<AICompanionContextValue | undefined>(undefined);

export const useAICompanion = () => {
  const context = useContext(AICompanionContext);
  if (!context) {
    throw new Error("useAICompanion must be used within AICompanionProvider");
  }
  return context;
};

export interface AICompanionProviderProps {
  children: React.ReactNode;
  actions?: QuickAction[];
  enableChat?: boolean;
  autoShowHint?: boolean;
  enableVoiceInput?: boolean;
  onVoiceResult?: (text: string) => void;
  currentRouteName?: string;
}

const POLL_INTERVAL = 3000;
const MAX_POLL_ATTEMPTS = 60;
const AI_TIMEOUT_MS = 10_000; // 10s timeout for AI responses
const AI_TIMEOUT_MESSAGE = "伊伊正在想...再等一下哦";
const AI_UNAVAILABLE_MESSAGE = "伊伊暂时无法回复，请稍后再试";
const AI_RETRY_FAILED_MESSAGE = "网络似乎不太稳定，请稍后再试试";

/** Wrap a promise with a timeout, returning a tuple [result, timedOut] */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<[T | null, boolean]> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve([null, true]), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve([result, false]);
      })
      .catch((error) => {
        clearTimeout(timer);
        throw error;
      });
  });
}

/** Auto-greeting messages when chat history is empty */
const GREETING_MESSAGES: ExtendedChatMessage[] = [
  {
    id: "greeting-1",
    role: "assistant",
    content: "嗨！我是伊伊，你的穿搭搭子。今天想聊什么穿搭话题？",
    timestamp: new Date(),
  },
];

export const AICompanionProvider: React.FC<AICompanionProviderProps> = ({
  children,
  actions,
  enableChat = true,
  autoShowHint = true,
  enableVoiceInput = true,
  onVoiceResult,
  currentRouteName,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [state, setState] = useState<CompanionState>("idle");
  const [position, setPosition] = useState<{ x: number; y: number } | undefined>();
  const [menuVisible, setMenuVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(autoShowHint);
  const [_isVoiceMode, setIsVoiceMode] = useState(false);
  const [sessionState, setSessionState] = useState<AiStylistSessionState | null>(null);
  const [slots, setSlots] = useState<AiStylistSlots | null>(null);
  const [currentAction, setCurrentAction] = useState<AiStylistAction | null>(null);
  const [_outfitResult, setOutfitResult] = useState<AiStylistResolution | null>(null);
  const suppressedRoutes = new Set(["VirtualTryOn", "Checkout", "AiStylist"]);
  const shouldSuspendFloatingUI =
    currentRouteName !== undefined && suppressedRoutes.has(currentRouteName);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef<number>(0);

  const {
    status: voiceStatus,
    recognizedText: voiceText,
    isAvailable: isVoiceAvailable,
    startListening,
    stopListening,
    cancel: cancelVoice,
    error: voiceError,
  } = useSpeechRecognition();

  // React to voice recognition status changes (replaces callback-based API)
  useEffect(() => {
    if (voiceStatus === "listening") {
      setState("listening");
      setIsVoiceMode(true);
    } else if (voiceStatus === "processing") {
      setState("thinking");
    }
  }, [voiceStatus]);

  // React to voice recognition errors
  useEffect(() => {
    if (voiceError) {
      logger.error("Voice recognition error:", voiceError);
      setIsVoiceMode(false);
      setState("idle");
    }
  }, [voiceError]);

  useEffect(() => {
    void loadPosition();
    void loadSession();

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (autoShowHint && state === "idle" && !chatVisible && !menuVisible) {
      hintTimeoutRef.current = setTimeout(() => {
        setShowHint(true);
      }, 3000);
    } else {
      setShowHint(false);
    }

    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current);
      }
    };
  }, [state, chatVisible, menuVisible, autoShowHint]);

  useEffect(() => {
    if (shouldSuspendFloatingUI) {
      setShowHint(false);
      setMenuVisible(false);
      setChatVisible(false);
      if (state !== "idle") {
        setState("idle");
      }
    }
  }, [shouldSuspendFloatingUI, state]);

  const loadPosition = async () => {
    try {
      const savedPosition = await AsyncStorage.getItem(POSITION_STORAGE_KEY);
      if (savedPosition) {
        setPosition(JSON.parse(savedPosition));
      }
    } catch (error) {
      logger.warn("Failed to load companion position:", error);
    }
  };

  const savePosition = async (x: number, y: number) => {
    try {
      await AsyncStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({ x, y }));
    } catch (error) {
      logger.warn("Failed to save companion position:", error);
    }
  };

  const loadSession = async () => {
    try {
      const savedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const { sessionId: savedId, expiresAt } = JSON.parse(savedSession);
        if (new Date(expiresAt) > new Date()) {
          setSessionId(savedId);
          const response = await aiStylistApi.getSessionStatus(savedId);
          if (response.data?.sessionState) {
            setSessionState(response.data.sessionState);
            setSlots(response.data.sessionState.slots);
          }
          return; // Existing session found, no need for greeting
        }
      }
      // No existing session -- auto-greeting so chat is never blank
      setMessages(GREETING_MESSAGES);
    } catch (error) {
      logger.warn("Failed to load session:", error);
      // On error also show greeting
      setMessages(GREETING_MESSAGES);
    }
  };

  const saveSession = async (id: string, expiresAt?: string) => {
    try {
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          sessionId: id,
          expiresAt: expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    } catch (error) {
      logger.warn("Failed to save session:", error);
    }
  };

  const clearSession = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      logger.warn("Failed to clear session:", error);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === "active") {
      setShowHint(autoShowHint);
    }
    appStateRef.current = nextAppState;
  };

  const handleBallPress = useCallback(() => {
    setShowHint(false);
    if (enableChat) {
      setChatVisible(true);
    } else {
      setMenuVisible(true);
    }
  }, [enableChat]);

  const handleBallLongPress = useCallback(() => {
    setShowHint(false);
    setMenuVisible(true);
  }, []);

  const handleDragEnd = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    void savePosition(x, y);
  }, []);

  const showCompanion = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideCompanion = useCallback(() => {
    setIsVisible(false);
    setMenuVisible(false);
    setChatVisible(false);
  }, []);

  const openChat = useCallback(() => {
    setShowHint(false);
    setChatVisible(true);
  }, []);

  const closeChat = useCallback(() => {
    setChatVisible(false);
    setState("idle");
  }, []);

  const showMenu = useCallback(() => {
    setShowHint(false);
    setMenuVisible(true);
  }, []);

  const hideMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const processResponse = useCallback((response: AiStylistSessionResponse) => {
    if (response.sessionState) {
      setSessionState(response.sessionState);
      setSlots(response.sessionState.slots);
    }

    if (response.nextAction) {
      setCurrentAction(response.nextAction);
    }

    if (response.result) {
      setOutfitResult(response.result);
    }

    if (response.progress) {
      startPollingIfNeeded(response.progress);
    }

    return response;
  }, []);

  const _buildAssistantMessage = useCallback(
    (response: AiStylistSessionResponse): ExtendedChatMessage => ({
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: response.assistantMessage || response.message || "好的，我来帮你分析。",
      timestamp: new Date(),
      actionType: response.nextAction?.type,
      actionData: response.nextAction,
      outfitResult: response.result,
      progress: response.progress,
    }),
    []
  );

  const startPollingIfNeeded = useCallback(
    (progress: AiStylistProgress) => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      if (progress.isWaiting && progress.canLeaveAndResume) {
        pollAttemptsRef.current = 0;
        pollIntervalRef.current = setInterval(async () => {
          if (!sessionId || pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            return;
          }

          pollAttemptsRef.current++;

          try {
            const response = await aiStylistApi.getSessionStatus(sessionId);
            if (response.data?.progress && !response.data.progress.isWaiting) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              processResponse(response.data);

              const statusMessage: ExtendedChatMessage = {
                id: `status-${Date.now()}`,
                role: "assistant",
                content: response.data.assistantMessage || "分析完成！",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, statusMessage]);
            }
          } catch (error) {
            logger.error("Polling error:", error);
            useAiStylistStore.getState().setError("AI 助手连接中断，正在重试...");
          }
        }, POLL_INTERVAL);
      }
    },
    [sessionId, processResponse]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ExtendedChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setState("thinking");

      const loadingMessage: ExtendedChatMessage = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, loadingMessage]);

      /** Core send logic wrapped with timeout + single retry */
      const attemptSend = async (
        attempt: number
      ): Promise<{ success: boolean; timedOut: boolean }> => {
        try {
          let currentSessionId = sessionId;
          let responseData: AiStylistSessionResponse | undefined;

          if (!currentSessionId) {
            const createPromise = aiStylistApi.createSession({
              entry: content,
              goal: "global_ai_companion",
              context: {
                source: "ai_companion_ball",
                channel: "overlay_chat",
              },
            });

            const [createResponse, createTimedOut] = await withTimeout(
              createPromise,
              AI_TIMEOUT_MS
            );

            if (createTimedOut) {
              return { success: false, timedOut: true };
            }

            if (!createResponse!.success || !createResponse!.data) {
              throw new Error(createResponse!.error?.message || "创建会话失败，请重试");
            }

            responseData = createResponse!.data;

            if (responseData.sessionId) {
              currentSessionId = responseData.sessionId;
              setSessionId(currentSessionId);
              void saveSession(currentSessionId!, responseData.sessionExpiresAt);
            } else {
              throw new Error("创建会话失败，请重试");
            }
          } else {
            const sendPromise = aiStylistApi.sendMessage(currentSessionId, content);
            const [response, sendTimedOut] = await withTimeout(sendPromise, AI_TIMEOUT_MS);

            if (sendTimedOut) {
              return { success: false, timedOut: true };
            }

            if (!response!.success || !response!.data) {
              throw new Error(response!.error?.message || "发送消息失败，请重试");
            }
            responseData = response!.data;
          }

          processResponse(responseData);
          const response = { data: responseData! };

          const assistantMessage: ExtendedChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content:
              response.data?.assistantMessage || response.data?.message || "好的，我来帮你分析。",
            timestamp: new Date(),
            actionType: response.data?.nextAction?.type,
            actionData: response.data?.nextAction,
            progress: response.data?.progress,
          };

          if (response.data?.result) {
            assistantMessage.outfitResult = response.data.result;
          }

          setMessages((prev) => prev.filter((m) => !m.isLoading).concat(assistantMessage));
          setState("responding");

          setTimeout(() => {
            setState("idle");
          }, 1000);

          return { success: true, timedOut: false };
        } catch (error) {
          logger.error("AI companion sendMessage failed:", error);
          return { success: false, timedOut: false };
        }
      };

      // First attempt
      let result = await attemptSend(1);

      // If timed out, show "thinking" indicator and retry once
      if (result.timedOut) {
        const thinkingMessage: ExtendedChatMessage = {
          id: `thinking-${Date.now()}`,
          role: "assistant",
          content: AI_TIMEOUT_MESSAGE,
          timestamp: new Date(),
        };
        setMessages((prev) => prev.filter((m) => !m.isLoading).concat(thinkingMessage));

        result = await attemptSend(2);
      }

      // Handle final failure
      if (!result.success) {
        const finalMessage: ExtendedChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: result.timedOut ? AI_RETRY_FAILED_MESSAGE : AI_UNAVAILABLE_MESSAGE,
          timestamp: new Date(),
        };

        setMessages((prev) =>
          prev.filter((m) => !m.isLoading && m.id !== `thinking-${Date.now()}`).concat(finalMessage)
        );
        setState("idle");
      }
    },
    [sessionId, processResponse]
  );

  // React to voice recognition results -- auto-send recognized text
  useEffect(() => {
    if (voiceStatus === "success" && voiceText && voiceText.trim().length > 0) {
      setIsVoiceMode(false);
      setState("thinking");

      if (onVoiceResult) {
        onVoiceResult(voiceText);
      }

      if (enableChat) {
        void sendMessage(voiceText);
      }
    }
  }, [voiceStatus, voiceText, onVoiceResult, enableChat, sendMessage]);

  const uploadPhoto = useCallback(
    async (source: "camera" | "library" = "library") => {
      if (!sessionId) {
        const userMessage: ExtendedChatMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: "我想上传照片进行分析",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        try {
          const createResponse = await aiStylistApi.createSession();
          if (createResponse.data?.sessionId) {
            const newSessionId = createResponse.data.sessionId;
            setSessionId(newSessionId);
            void saveSession(newSessionId);
          }
        } catch (error) {
          logger.error("Failed to create session for photo upload:", error);
          return;
        }
      }

      try {
        let result: ImagePicker.ImagePickerResult;

        if (source === "camera") {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            const errorMessage: ExtendedChatMessage = {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: "需要相机权限才能拍照",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          });
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            const errorMessage: ExtendedChatMessage = {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: "需要相册权限才能选择照片",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
          });
        }

        if (!result.canceled && result.assets && result.assets[0]) {
          const asset = result.assets[0];

          const userMessage: ExtendedChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: "📷 [已上传照片]",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMessage]);

          setState("thinking");

          const photoType = currentAction?.photoType || "full_body";
          const response = await aiStylistApi.uploadPhoto(sessionId!, asset.uri, photoType);
          if (response.data) {
            processResponse(response.data);
          }

          const assistantMessage: ExtendedChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.data?.assistantMessage || "照片已上传，正在分析中...",
            timestamp: new Date(),
            progress: response.data?.progress,
          };

          setMessages((prev) => [...prev, assistantMessage]);

          if (response.data?.progress?.isWaiting) {
            startPollingIfNeeded(response.data.progress);
          }
        }
      } catch (error) {
        logger.error("Failed to upload photo:", error);
        const errorMessage: ExtendedChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "照片上传失败，请重试",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setState("idle");
      }
    },
    [sessionId, currentAction, processResponse, startPollingIfNeeded]
  );

  const selectPreference = useCallback(
    async (field: string, values: string[]) => {
      if (!sessionId) {
        return;
      }

      const userMessage: ExtendedChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: `选择了: ${values.join(", ")}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setState("thinking");

      try {
        const messageContent = `${field}: ${values.join(", ")}`;
        const response = await aiStylistApi.sendMessage(sessionId, messageContent);
        if (response.data) {
          processResponse(response.data);
        }

        const assistantMessage: ExtendedChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.data?.assistantMessage || "好的，已记录你的偏好。",
          timestamp: new Date(),
          actionType: response.data?.nextAction?.type,
          actionData: response.data?.nextAction,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setState("responding");

        setTimeout(() => {
          setState("idle");
        }, 1000);
      } catch (error) {
        logger.error("Failed to select preference:", error);
        setState("idle");
      }
    },
    [sessionId, processResponse]
  );

  const generateOutfit = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setState("thinking");

    const loadingMessage: ExtendedChatMessage = {
      id: `loading-${Date.now()}`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const response = await aiStylistApi.resolveSession(sessionId);
      if (response.data) {
        processResponse(response.data);
      }

      const assistantMessage: ExtendedChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.data?.assistantMessage || "这是为你准备的穿搭方案！",
        timestamp: new Date(),
        outfitResult: response.data?.result,
        actionType: "show_outfit_cards",
      };

      setMessages((prev) => prev.filter((m) => !m.isLoading).concat(assistantMessage));
      setState("responding");

      setTimeout(() => {
        setState("idle");
      }, 1000);
    } catch (error) {
      logger.error("Failed to generate outfit:", error);
      const errorMessage: ExtendedChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "生成穿搭方案失败，请重试",
        timestamp: new Date(),
      };
      setMessages((prev) => prev.filter((m) => !m.isLoading).concat(errorMessage));
      setState("idle");
    }
  }, [sessionId, processResponse]);

  const resetSession = useCallback(async () => {
    setSessionId(null);
    setSessionState(null);
    setSlots(null);
    setCurrentAction(null);
    setOutfitResult(null);
    setMessages([]);
    await clearSession();
  }, []);

  const defaultActions: QuickAction[] = [
    {
      id: "stylist",
      icon: "stylist",
      label: "AI 造型师",
      description: "获取穿搭建议",
      onPress: () => {
        setMenuVisible(false);
        setChatVisible(true);
      },
    },
    {
      id: "photo",
      icon: "photo",
      label: "拍照分析",
      description: "分析身材和肤色",
      onPress: () => {
        setMenuVisible(false);
        navigateTab("Discover", "Wardrobe");
      },
    },
    {
      id: "recommend",
      icon: "recommend",
      label: "智能推荐",
      description: "个性化推荐",
      onPress: () => {
        setMenuVisible(false);
        navigateTab("Discover", "RecommendationDetail");
      },
    },
    {
      id: "wardrobe",
      icon: "wardrobe",
      label: "我的衣橱",
      description: "管理你的衣物",
      onPress: () => {
        setMenuVisible(false);
        navigateTab("Discover", "Wardrobe");
      },
    },
  ];

  const startVoiceInput = useCallback(async () => {
    if (!enableVoiceInput || !isVoiceAvailable) {
      logger.warn("Voice input is not available");
      return;
    }

    try {
      setShowHint(false);
      await startListening();
    } catch (error) {
      logger.error("Failed to start voice input:", error);
      useAiStylistStore.getState().setError("语音输入启动失败");
    }
  }, [enableVoiceInput, isVoiceAvailable, startListening]);

  const stopVoiceInput = useCallback(() => {
    void stopListening();
    setIsVoiceMode(false);
  }, [stopListening]);

  const contextValue: AICompanionContextValue = {
    isVisible,
    state,
    messages,
    sessionState,
    slots,
    showCompanion,
    hideCompanion,
    setState,
    sendMessage,
    openChat,
    closeChat,
    showMenu,
    hideMenu,
    startVoiceInput,
    stopVoiceInput,
    isVoiceAvailable: enableVoiceInput && isVoiceAvailable,
    uploadPhoto,
    selectPreference,
    generateOutfit,
    resetSession,
  };

  return (
    <AICompanionContext.Provider value={contextValue}>
      {children}

      {isVisible && !shouldSuspendFloatingUI && (
        <>
          <AICompanionBall
            state={state}
            onPress={handleBallPress}
            onLongPress={handleBallLongPress}
            onDragEnd={handleDragEnd}
            position={position}
            showHint={showHint}
          />

          <AICompanionMenu
            visible={menuVisible}
            position={position || { x: 0, y: 0 }}
            ballSize={64}
            onClose={hideMenu}
            actions={actions || defaultActions}
          />

          {enableChat && (
            <AICompanionChat
              visible={chatVisible}
              messages={messages}
              state={state}
              onSendMessage={sendMessage}
              onClose={closeChat}
              currentAction={currentAction}
              onUploadPhoto={uploadPhoto}
              onSelectPreference={selectPreference}
              onGenerateOutfit={generateOutfit}
              onStartVoice={startVoiceInput}
              onStopVoice={stopVoiceInput}
              isVoiceAvailable={enableVoiceInput && isVoiceAvailable}
            />
          )}
        </>
      )}
    </AICompanionContext.Provider>
  );
};
