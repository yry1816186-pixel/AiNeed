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
      setError({
        code: event.error?.code?.toString() ?? "UNKNOWN",
        message: event.error?.message ?? "语音识别失败",
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
      setError({ code: "NOT_AVAILABLE", message: "此设备不支持语音识别" });
      return;
    }

    try {
      await Voice.start("zh-CN");
    } catch (err: unknown) {
      setError({
        code: "START_FAILED",
        message: err instanceof Error ? err.message : "启动语音识别失败",
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
