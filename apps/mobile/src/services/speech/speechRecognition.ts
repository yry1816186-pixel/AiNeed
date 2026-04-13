declare const process: any;

import { useState, useCallback, useRef, useEffect } from "react";
import { Platform, PermissionsAndroid, PermissionStatus } from "react-native";
import * as FileSystem from '@/src/polyfills/expo-file-system';
import { Audio, Recording } from '@/src/polyfills/expo-av';

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "processing"
  | "error"
  | "success";

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  duration: number;
}

export interface SpeechRecognitionError {
  code: string;
  message: string;
}

export interface SpeechRecognitionConfig {
  language?: string;
  continuous?: boolean;
  timeout?: number;
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: SpeechRecognitionError) => void;
  onStatusChange?: (status: SpeechRecognitionStatus) => void;
}

const SPEECH_SERVICE_CONFIG = {
  apiUrl:
    (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SPEECH_API_URL : undefined) || "https://api.example.com/speech",
  apiKey: (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_SPEECH_API_KEY : undefined) || "",
  defaultLanguage: "zh-CN",
  defaultTimeout: 30000,
};

export function useSpeechRecognition(config: SpeechRecognitionConfig = {}) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [result, setResult] = useState<SpeechRecognitionResult | null>(null);
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const recordingRef = useRef<Recording | null>(null);
  const startTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkAvailability();
    return () => {
      stopListening();
    };
  }, []);

  const checkAvailability = async (): Promise<boolean> => {
    try {
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      const available = audioStatus === "granted";
      setIsAvailable(available);
      return available;
    } catch (err) {
      console.error("Failed to check speech recognition availability:", err);
      setIsAvailable(false);
      return false;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const { status } = await Audio.requestPermissionsAsync();
        return status === "granted";
      }
    } catch (err) {
      console.error("Failed to request permissions:", err);
      return false;
    }
  };

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setResult(null);

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        const permissionError: SpeechRecognitionError = {
          code: "PERMISSION_DENIED",
          message: "麦克风权限被拒绝",
        };
        setError(permissionError);
        config.onError?.(permissionError);
        return;
      }

      setStatus("listening");
      config.onStatusChange?.("listening");
      startTimeRef.current = Date.now();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      recordingRef.current = recording;

      const timeout = config.timeout || SPEECH_SERVICE_CONFIG.defaultTimeout;
      setTimeout(() => {
        if (status === "listening") {
          stopListening();
        }
      }, timeout);
    } catch (err) {
      const speechError: SpeechRecognitionError = {
        code: "START_FAILED",
        message: err instanceof Error ? err.message : "启动语音识别失败",
      };
      setError(speechError);
      setStatus("error");
      config.onError?.(speechError);
      config.onStatusChange?.("error");
    }
  }, [config, status]);

  const stopListening = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        return;
      }

      setStatus("processing");
      config.onStatusChange?.("processing");

      const recording = recordingRef.current;
      recordingRef.current = null;

      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (!uri) {
        throw new Error("Failed to get recording URI");
      }

      const duration = Date.now() - startTimeRef.current;

      await processAudioFile(uri, duration);
    } catch (err) {
      const speechError: SpeechRecognitionError = {
        code: "STOP_FAILED",
        message: err instanceof Error ? err.message : "停止语音识别失败",
      };
      setError(speechError);
      setStatus("error");
      config.onError?.(speechError);
      config.onStatusChange?.("error");
    }
  }, [config]);

  const processAudioFile = async (uri: string, duration: number) => {
    try {
      abortControllerRef.current = new AbortController();

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(
        `${SPEECH_SERVICE_CONFIG.apiUrl}/recognize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SPEECH_SERVICE_CONFIG.apiKey}`,
          },
          body: JSON.stringify({
            audio: base64Audio,
            language: config.language || SPEECH_SERVICE_CONFIG.defaultLanguage,
            format: "wav",
          }),
          signal: abortControllerRef.current.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Speech API error: ${response.status}`);
      }

      const data = await response.json();

      const recognitionResult: SpeechRecognitionResult = {
        text: data.text || data.result || "",
        confidence: data.confidence || 0.9,
        duration,
      };

      setResult(recognitionResult);
      setStatus("success");
      config.onResult?.(recognitionResult);
      config.onStatusChange?.("success");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      const speechError: SpeechRecognitionError = {
        code: "RECOGNITION_FAILED",
        message: err instanceof Error ? err.message : "语音识别失败",
      };
      setError(speechError);
      setStatus("error");
      config.onError?.(speechError);
      config.onStatusChange?.("error");
    }
  };

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }

    setStatus("idle");
    setError(null);
    setResult(null);
    config.onStatusChange?.("idle");
  }, [config]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
    config.onStatusChange?.("idle");
  }, [config]);

  return {
    status,
    result,
    error,
    isAvailable,
    startListening,
    stopListening,
    cancel,
    reset,
    requestPermissions,
  };
}

export interface SpeechRecognitionServiceConfig {
  apiUrl: string;
  apiKey: string;
  defaultLanguage?: string;
}

export class SpeechRecognitionService {
  private config: SpeechRecognitionServiceConfig;

  constructor(config: SpeechRecognitionServiceConfig) {
    this.config = {
      defaultLanguage: "zh-CN",
      ...config,
    };
  }

  async recognize(
    audioBase64: string,
    language?: string,
  ): Promise<SpeechRecognitionResult> {
    const response = await fetch(`${this.config.apiUrl}/recognize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        audio: audioBase64,
        language: language || this.config.defaultLanguage,
        format: "wav",
      }),
    });

    if (!response.ok) {
      throw new Error(`Speech recognition failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      text: data.text || data.result || "",
      confidence: data.confidence || 0.9,
      duration: data.duration || 0,
    };
  }
}

export const createSpeechRecognitionService = (): SpeechRecognitionService => {
  return new SpeechRecognitionService({
    apiUrl: SPEECH_SERVICE_CONFIG.apiUrl,
    apiKey: SPEECH_SERVICE_CONFIG.apiKey,
  });
};
