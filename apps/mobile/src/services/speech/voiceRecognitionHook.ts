import { useState, useEffect, useCallback } from "react";
import Voice, { type SpeechResultsEvent, type SpeechErrorEvent } from "@react-native-voice/voice";

export type SpeechRecognitionStatus = "idle" | "listening" | "processing" | "error" | "success";

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  duration: number;
}

export interface SpeechRecognitionError {
  code: string;
  message: string;
}

/**
 * useVoiceRecognition -- React hook wrapping @react-native-voice/voice.
 *
 * Provides on-device speech-to-text via Android SpeechRecognizer (zh-CN locale).
 * Audio never leaves the device for STT.
 *
 * Degradation:
 * - Device unavailable: isAvailable=false, error message in Chinese
 * - STT recognition fails: status transitions to "error", caller should fall back to text input
 */
export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");

  useEffect(() => {
    Voice.isAvailable()
      .then((available) => setIsAvailable(available !== 0))
      .catch(() => setIsAvailable(false));

    Voice.onSpeechStart = () => {
      setIsListening(true);
      setStatus("listening");
    };

    Voice.onSpeechEnd = () => {
      setIsListening(false);
      setStatus("processing");
    };

    Voice.onSpeechResults = (event: SpeechResultsEvent) => {
      if (event.value && event.value.length > 0) {
        setRecognizedText(event.value[0]);
        setStatus("success");
      }
    };

    Voice.onSpeechError = (event: SpeechErrorEvent) => {
      const errorCode = event.error?.code?.toString() ?? "UNKNOWN";
      // Map common error codes to Chinese messages
      const errorMessages: Record<string, string> = {
        "1": "网络不可用，请检查网络连接",
        "2": "网络错误，请稍后重试",
        "3": "语音识别请求失败",
        "4": "当前设备不支持语音识别",
        "5": "语音识别服务忙碌，请稍后再试",
        "6": "没有检测到语音，请靠近麦克风说话",
        "7": "没有匹配到结果，请再试一次",
        "8": "语音识别被中断",
        "9": "语音识别服务不可用",
        "10": "语音识别太长，请缩短说话时间",
        NOT_AVAILABLE: "当前设备不支持语音识别",
      };
      setError({
        code: errorCode,
        message:
          event.error?.message ?? errorMessages[errorCode] ?? "语音识别失败，已切换到文字输入",
      });
      setIsListening(false);
      setStatus("error");
    };

    return () => {
      void Voice.destroy().then(() => {
        Voice.removeAllListeners();
      });
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setRecognizedText("");

    const available = await Voice.isAvailable();
    if (!available) {
      setError({ code: "NOT_AVAILABLE", message: "当前设备不支持语音输入" });
      return;
    }

    try {
      await Voice.start("zh-CN");
    } catch (err: unknown) {
      setError({
        code: "START_FAILED",
        message: err instanceof Error ? err.message : "启动语音识别失败，已切换到文字输入",
      });
      setStatus("error");
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch (err: unknown) {
      setError({
        code: "STOP_FAILED",
        message: err instanceof Error ? err.message : "停止语音识别失败",
      });
    }
  }, []);

  const cancel = useCallback(async () => {
    try {
      await Voice.cancel();
      setIsListening(false);
      setStatus("idle");
    } catch {
      // ignore cancel errors
    }
  }, []);

  const reset = useCallback(() => {
    setRecognizedText("");
    setError(null);
    setStatus("idle");
  }, []);

  return {
    status,
    isListening,
    recognizedText,
    error,
    isAvailable,
    startListening,
    stopListening,
    cancel,
    reset,
    result: recognizedText ? { text: recognizedText, confidence: 0.9, duration: 0 } : null,
  };
}
