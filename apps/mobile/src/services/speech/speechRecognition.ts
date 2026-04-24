/**
 * Backward-compatible re-export barrel for speech recognition.
 *
 * The actual implementation now lives in voiceRecognitionHook.ts,
 * which uses @react-native-voice/voice (Android SpeechRecognizer).
 * This file preserves existing imports across the codebase.
 */
export type {
  SpeechRecognitionStatus,
  SpeechRecognitionResult,
  SpeechRecognitionError,
} from "./voiceRecognitionHook";

export { useVoiceRecognition as useSpeechRecognition } from "./voiceRecognitionHook";
