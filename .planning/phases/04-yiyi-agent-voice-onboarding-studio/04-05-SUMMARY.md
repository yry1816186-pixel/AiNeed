---
phase: 04-yiyi-agent-voice-onboarding-studio
plan: 05
subsystem: mobile-voice-stt-tts, chat-pipeline
tags: [react-native, voice-recognition, stt, tts, edge-tts, zh-CN, voice-button, audio-playback]

requires:
  - phase: 04-yiyi-agent-voice-onboarding-studio
    plan: 02
    provides: "EdgeTTSService on backend with POST /tts endpoint returning audio URLs"
  - phase: 04-yiyi-agent-voice-onboarding-studio
    plan: 04
    provides: "AiStylistUnifiedScreen with processDialogResponse handling dialog actions"

provides:
  - "useVoiceRecognition hook wrapping @react-native-voice/voice (Android SpeechRecognizer, zh-CN)"
  - "speakFromUrl() for Edge-TTS audio playback from backend URLs"
  - "VoiceButton wired into chat screen input bar with waveform animation"
  - "Auto-send recognized voice text through sendMessage pipeline"
  - "TTS audio auto-play when dialog response includes audioUrl"

affects:
  - apps/mobile/src/services/speech/speechRecognition.ts
  - apps/mobile/src/services/speech/voiceRecognitionHook.ts
  - apps/mobile/src/services/speech/ttsService.ts
  - apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx
  - apps/mobile/src/features/stylist/components/AICompanionProvider.tsx
  - apps/mobile/src/features/stylist/components/index.ts
  - apps/mobile/src/services/api/ai-stylist.api.ts

tech-stack:
  added:
    - "@react-native-voice/voice ^3.2.4"
  patterns:
    - "Hook-based STT via @react-native-voice/voice with onSpeechResults/onSpeechError callbacks"
    - "expo-av Audio.Sound for URL-based audio playback"
    - "Backward-compatible re-export barrel for type migration"

key-files:
  created:
    - apps/mobile/src/services/speech/voiceRecognitionHook.ts
  modified:
    - apps/mobile/src/services/speech/speechRecognition.ts
    - apps/mobile/src/services/speech/ttsService.ts
    - apps/mobile/src/features/stylist/screens/AiStylistUnifiedScreen.tsx
    - apps/mobile/src/features/stylist/components/AICompanionProvider.tsx
    - apps/mobile/src/features/stylist/components/index.ts
    - apps/mobile/src/services/api/ai-stylist.api.ts
    - apps/mobile/package.json
    - pnpm-lock.yaml

decisions:
  - "Used @react-native-voice/voice (Android SpeechRecognizer) for STT per decision #24"
  - "Used expo-av polyfill Audio.Sound for URL-based audio playback (Edge-TTS backend)"
  - "Replaced speechRecognition.ts with backward-compatible re-export barrel instead of deleting"
  - "Added audioUrl to AiStylistSessionResponse for dialog forwarding from DialogChatResponse"

metrics:
  duration: 9min
  completed: 2026-04-24T15:53:23Z
  tasks_completed: 2
  tasks_total: 2
  files_modified: 8
  files_created: 1
---

# Phase 04 Plan 05: Voice STT + TTS Integration Summary

Replaced placeholder speechRecognition.ts (api.example.com) with @react-native-voice/voice for on-device STT, added speakFromUrl() for Edge-TTS audio playback, and wired VoiceButton into the chat screen with auto-send and auto-play.

## What Changed

### Task 1: Replace speechRecognition.ts + Create useVoiceRecognition hook + Update TTS service

- **speechRecognition.ts**: Gutted entirely. Now re-exports types and useVoiceRecognition from the new hook file. Removed placeholder URL `api.example.com`, `SPEECH_SERVICE_CONFIG`, `SpeechRecognitionService` class, and `createSpeechRecognitionService` factory.
- **voiceRecognitionHook.ts** (new): React hook wrapping `@react-native-voice/voice`. Registers `onSpeechStart`, `onSpeechEnd`, `onSpeechResults`, `onSpeechError` callbacks. Uses `Voice.start("zh-CN")` for Chinese speech recognition. Returns `{ isListening, recognizedText, error, startListening, stopListening, cancel, reset, isAvailable, status, result }`.
- **ttsService.ts**: Added `speakFromUrl(url)` using expo-av `Audio.Sound.createAsync({ uri: url })` for Edge-TTS backend audio. Updated `stopSpeaking()` to handle both URL-based sound and device TTS. Retained existing `speak()`, `isTtsAvailable()`.
- **AICompanionProvider.tsx**: Updated to work with new hook API. Replaced config-object callback pattern with useEffect-based status/error/result handlers. Moved voice result effect after `sendMessage` declaration to fix hoisting order.
- Installed `@react-native-voice/voice ^3.2.4`.

### Task 2: Wire VoiceButton + voice hook into chat screen

- **AiStylistUnifiedScreen.tsx**: Imported `useVoiceRecognition` and `speakFromUrl`. Added voice hook with destructured state. Added useEffect to auto-send recognized text through the chat pipeline. Added VoiceButton in the input bar (between text input and send button) with `isListening`/`onPress` wired. Added TTS auto-play when `result.audioUrl` is present in sendMessage response.
- **ai-stylist.api.ts**: Added `audioUrl?: string` field to `AiStylistSessionResponse` for dialog forwarding.
- **components/index.ts**: Exported `VoiceButton` and `VoiceButtonProps`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AICompanionProvider.tsx used old useSpeechRecognition API**

- **Found during:** Task 1 TypeScript compilation
- **Issue:** AICompanionProvider called `useSpeechRecognition(config)` with a config object and destructured `requestPermissions`, but the new hook takes no arguments and handles permissions internally.
- **Fix:** Replaced callback-based config with useEffect-based handlers for status changes, errors, and recognized text. Moved voice result effect after `sendMessage` declaration to fix variable hoisting.
- **Files modified:** AICompanionProvider.tsx
- **Commit:** 2d6881f1

**2. [Rule 3 - Blocking] audioUrl missing from AiStylistSessionResponse**

- **Found during:** Task 2 implementation
- **Issue:** DialogChatResponse has `audioUrl` but AiStylistSessionResponse (the type returned by sendMessage) did not include it, so the field would be lost during API forwarding.
- **Fix:** Added `audioUrl?: string` to AiStylistSessionResponse.
- **Files modified:** ai-stylist.api.ts
- **Commit:** 453cd8ee

None - plan executed exactly as written apart from the two blocking issues above.

## Commits

| Commit  | Message                                                                           |
| ------- | --------------------------------------------------------------------------------- |
| 2d6881f | feat(04-05): replace placeholder speechRecognition with @react-native-voice/voice |
| 453cd8e | feat(04-05): wire VoiceButton + voice hook into chat screen                       |

## Self-Check

- [x] speechRecognition.ts has no placeholder URL (api.example.com not found)
- [x] voiceRecognitionHook.ts uses @react-native-voice/voice with zh-CN
- [x] ttsService.ts has speakFromUrl() function
- [x] useVoiceRecognition imported in AiStylistUnifiedScreen.tsx
- [x] VoiceButton rendered in input bar
- [x] TypeScript compiles with zero errors
- [x] Both commits exist in git log

## Self-Check: PASSED
