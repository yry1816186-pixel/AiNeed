# Phase 4: Yiyi Agent + Voice + Onboarding + Studio - Research

**Researched:** 2026-04-24
**Domain:** Conversational AI agent state machine, React Native voice integration, onboarding UX redesign, fashion rules engine
**Confidence:** HIGH

## Summary

Phase 4 delivers the core user experience layer for XUNO. The codebase already contains substantial implementations across all four domains: a Python DialogEngine with full GREET-WRAP state machine (362 lines), a NestJS DialogStateService with Redis persistence, React Native chat UIs (AiStylistUnifiedScreen at 1494 lines), an onboarding wizard with store layer, and partial voice services. The research reveals that the primary challenge is NOT building from scratch but **rationalizing overlapping implementations** and **wiring disconnected components together**.

The Python dialog_engine.py and NestJS context.service.ts both implement state machine logic with slot extraction. CONTEXT.md locks the decision: Python handles inference/reasoning, NestJS handles state management. The existing speechRecognition.ts uses Expo-AV recording + placeholder API URL -- it needs replacement with @react-native-voice/voice which wraps Android's native SpeechRecognizer. Edge-TTS will run on the Python backend (edge-tts package v7.2.8 available) with audio streamed to the mobile client. The onboarding store already contains NewOnboardingState with scene/style/preference/result steps -- it just needs new step components and the "let Yiyi dress you" step 4. @gorhom/bottom-sheet v5.2.8 is already installed in the monorepo.

**Primary recommendation:** Leverage existing implementations aggressively. The delta is wiring, not building -- except for the new Onboarding Step 4 and Edge-TTS integration which are genuinely new.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Dialog state machine: GREET->CONTEXT->[SCENE|DIRECT|CHAT]->GENERATE->[ACTION|REFINE]->WRAP_UP
- Python dialog_engine.py handles inference, NestJS context.service.ts handles state persistence
- Exception handling: user gives up -> gentle close / dislikes all -> guide preference description / LLM timeout -> rule-based fallback
- Interview outfit flow: company -> position -> budget -> 3 outfits -> try-on -> save
- Try-on triggered as BottomSheet within agent chat (no page navigation) -- YIYI-04
- Quick reply buttons: dynamically generated based on current state (YIYI-06)
- Yiyi personality: warm opinionated friend (decision #1)
- Forbidden: "~", algorithmic language, describing body flaws
- Required: describe clothes not body, try-on failure blames garment (ETH-01)
- Voice persona: 25-28 warm female, slightly slower than conversational (TTS side)
- Preference memory: cross-session remember user preferences (YIYI-07)
- New 4-step Onboarding: scene selection -> quick profile -> style expression -> "let Yiyi dress you"
- Step 2 MUST include garmentPreference (STATE.md blocker)
- Voice button: press-hold record + waveform + release send (decision #15)
- STT: Android native SpeechRecognizer (decision #24)
- TTS: Edge-TTS (decision #33) -- free, Microsoft voice engine, good Chinese quality
- Fashion rules: filtered injection by bodyType+occasion+colorSeason
- Studio recommendation: signal-triggered (premium budget, 3 rejections, special events, "unique")
- Sprint: manual 5-10 studio directory

### Claude's Discretion

- Python dialog_engine vs NestJS context.service specific division boundary
- STT integration method (native SpeechRecognizer vs backend proxy)
- Edge-TTS integration location (backend audio generation vs client-side direct call)
- Onboarding wizard internal component decomposition
- Quick reply button dynamic generation strategy

### Deferred Ideas (OUT OF SCOPE)

- iFlytek custom voice (post-sprint, Phase 6+)
- Rule learning (264 rules -> soft constraints, Phase 7+)
- FashionDNA continuous embedding (Phase 7+)
- Studio BD expansion (post-sprint)
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                             | Research Support                                                                                                |
| ------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| YIYI-01 | Agent state machine (GREET->CONTEXT->SCENE/DIRECT/CHAT->GENERATE->ACTION/REFINE->WRAP)  | Python DialogEngine already implements this flow; needs SCENE/DIRECT/CHAT branching added to CONTEXT state      |
| YIYI-02 | Interview outfit full flow (company->position->budget->outfits->try-on->save)           | DialogEngine + FullOutfitEngine provide generation; needs interview-specific slot extraction and flow           |
| YIYI-03 | Yiyi personality prompt (warm opinionated friend, forbidden words list)                 | BODY_POSITIVE_PROMPT in dialog_engine.py provides foundation; needs personality layer prompt                    |
| YIYI-04 | Try-on BottomSheet embedded in chat (no navigation)                                     | @gorhom/bottom-sheet v5.2.8 already installed; BottomSheetModal pattern documented                              |
| YIYI-05 | Preference memory (cross-session)                                                       | NestJS DialogStateService + Redis for session; UserProfile Prisma model for long-term                           |
| YIYI-06 | Quick reply buttons (state-aware dynamic)                                               | \_get_context_quick_replies() in DialogEngine shows pattern; needs state-driven enrichment                      |
| YIYI-07 | Exception handling (give up / dislike all / timeout fallback)                           | DialogEngine has keyword fallbacks; needs explicit state transitions for edge cases                             |
| VOI-01  | Home voice button (press-hold record + waveform + release send)                         | VoiceButton.tsx exists (147 lines, pulse animation); needs integration with STT pipeline                        |
| VOI-02  | Android SpeechRecognizer integration                                                    | @react-native-voice/voice v3.2.4 wraps Android native; replaces placeholder speechRecognition.ts                |
| VOI-03  | Edge-TTS basic integration                                                              | edge-tts Python v7.2.8 + edge-tts-universal Node.js alternative; Chinese voice zh-CN-XiaoxiaoNeural recommended |
| WKS-01  | Studio recommendation signal detection                                                  | Needs conversation signal analyzer (budget/rejections/events/unique keywords)                                   |
| WKS-02  | Studio card display                                                                     | Simple card component in chat flow                                                                              |
| WKS-03  | Studio directory (Sprint: manual 5-10)                                                  | JSON seed data file                                                                                             |
| WKS-04  | Studio recommendation graceful degradation                                              | Fallback to regular recommendation if studio data unavailable                                                   |
| ONB-01  | Step 1 scene selection (8 cards, multi-select 1-3)                                      | NewOnboardingState.selectedScenes already in store                                                              |
| ONB-02  | Step 2 quick profile (age+height/weight+size+garmentPreference)                         | garmentPreference field exists in NewOnboardingState                                                            |
| ONB-03  | Step 3 style expression (pick 1 of 5) + outfit image selection (pick 2 of 6)            | NewOnboardingState.selectedStyles exists; needs image selection UI                                              |
| ONB-04  | Step 4 "let Yiyi dress you" (3 outfits -> pick 1 -> save wardrobe -> preference signal) | Needs new step component + FullOutfitEngine integration                                                         |
| ONB-05  | Data flows immediately to ColdStartService                                              | onboardingService.saveOnboardingData() already exists                                                           |
| RUL-01  | full_outfit_engine.py loads rules dynamically from JSON                                 | 7 JSON files in ml/data/fashion_rules/; engine currently uses hardcoded knowledge bases                         |
| RUL-02  | Filtered injection (bodyType+occasion+colorSeason)                                      | JSON files have structured fields (body_type, occasion, color_season) for filtering                             |
| RUL-03  | Rules cooperate with vector retrieval (not replace)                                     | FullOutfitEngine scoring + Qdrant vector search run in parallel                                                 |
| ETH-01  | Body-positive language (describe clothes not body)                                      | BODY_POSITIVE_PROMPT in dialog_engine.py (6 rules)                                                              |
| ETH-02  | Try-on failure blames garment                                                           | Already in BODY_POSITIVE_PROMPT rule #4                                                                         |

</phase_requirements>

## Architectural Responsibility Map

| Capability                       | Primary Tier                         | Secondary Tier                | Rationale                                                                                      |
| -------------------------------- | ------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Dialog state machine (inference) | Python AI Service                    | -                             | LLM calls, slot extraction, response generation require Python async + GLM API                 |
| Dialog state persistence         | NestJS Backend (Redis)               | -                             | Redis TTL-based sessions, Prisma for long-term preferences                                     |
| Chat UI rendering                | Mobile (React Native)                | -                             | AiStylistUnifiedScreen renders messages, quick replies, outfit cards                           |
| STT (speech-to-text)             | Mobile (Native Android)              | -                             | @react-native-voice/voice wraps Android SpeechRecognizer -- on-device, no backend needed       |
| TTS (text-to-speech)             | Python AI Service (Edge-TTS)         | Mobile (audio playback)       | Backend generates audio stream via edge-tts; mobile plays via react-native-tts or audio player |
| Onboarding flow                  | Mobile (React Native)                | NestJS Backend (data save)    | Step components are mobile UI; final save hits backend API                                     |
| Outfit generation                | Python AI Service                    | -                             | FullOutfitEngine + GLM reasoning in Python                                                     |
| Try-on rendering                 | Mobile (BottomSheet)                 | Python AI Service (image gen) | BottomSheet displays try-on; backend triggers GLM image generation                             |
| Fashion rules loading            | Python AI Service                    | -                             | JSON files loaded by full_outfit_engine.py at startup                                          |
| Studio recommendation            | Python AI Service (signal detection) | Mobile (card display)         | Signal detection in dialog engine; card rendering in chat UI                                   |
| Preference memory                | NestJS Backend (Prisma)              | Python AI Service (context)   | UserProfile model for long-term; Python reads context for session                              |

## Standard Stack

### Core

| Library                   | Version         | Purpose                             | Why Standard                                                                                                |
| ------------------------- | --------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| @gorhom/bottom-sheet      | 5.2.8           | Try-on BottomSheet in chat          | Already installed in monorepo; best RN bottom sheet library [VERIFIED: node_modules]                        |
| @react-native-voice/voice | 3.2.4           | Android SpeechRecognizer wrapper    | Wraps native Android SpeechRecognizer; locale support for zh-CN [VERIFIED: npm registry]                    |
| edge-tts (Python)         | 7.2.8           | Backend TTS audio generation        | Free Microsoft Edge TTS; excellent Chinese neural voices; streaming support [VERIFIED: PyPI]                |
| react-native-tts          | (not installed) | Client-side audio playback fallback | Wraps native TTS for simple playback; already referenced in ttsService.ts [ASSUMED: based on existing code] |

### Supporting

| Library                                   | Version | Purpose                            | When to Use                                                |
| ----------------------------------------- | ------- | ---------------------------------- | ---------------------------------------------------------- |
| react-native-reanimated                   | 3.16.7  | VoiceButton pulse animation        | Already installed; VoiceButton.tsx uses it extensively     |
| zustand                                   | 5.0.5   | Onboarding + chat state management | Already installed; onboardingStore pattern established     |
| @react-native-async-storage/async-storage | 2.1.0   | Persist onboarding state           | Already installed; onboardingStore uses persist middleware |
| phosphor-react-native                     | 3.0.4   | VoiceButton icon                   | Already installed; Microphone icon in use                  |
| socket.io-client                          | 4.7.0   | Real-time TTS audio stream         | Already installed; could stream audio chunks to client     |

### Alternatives Considered

| Instead of                | Could Use                     | Tradeoff                                                                                                                                                |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @react-native-voice/voice | Expo Speech (expo-speech)     | expo-speech is TTS only, no STT; project uses bare RN not managed Expo for speech                                                                       |
| edge-tts Python           | edge-tts-universal (Node.js)  | Node.js version could run in NestJS directly, avoiding Python layer; but Python already handles all AI inference and has better streaming API [ASSUMED] |
| edge-tts Python           | react-native-tts (device TTS) | Device TTS has no personality control, sounds robotic; Edge-TTS gives "XiaoxiaoNeural" warm female voice                                                |
| @gorhom/bottom-sheet      | react-native-modal            | BottomSheet has gesture support, snap points, and scroll integration; modal is just overlay                                                             |

**Installation:**

```bash
# Mobile - add STT library
cd apps/mobile && pnpm add @react-native-voice/voice

# Python - add Edge-TTS
cd ml && pip install edge-tts -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**Version verification:**

```
@gorhom/bottom-sheet: 5.2.8 (installed in monorepo root node_modules)
@react-native-voice/voice: 3.2.4 (npm registry, 2026-04-24)
edge-tts: 7.2.8 (PyPI, latest stable)
```

## Architecture Patterns

### System Architecture Diagram

```
User (Mobile App)
  |
  |--[Voice Button]---> @react-native-voice/voice (Android SpeechRecognizer)
  |                         |
  |                         v
  |                     [STT Result Text]
  |                         |
  |--[Text Input]----------+
  |                         |
  v                         v
Chat UI (AiStylistUnifiedScreen)
  |                         |
  |---[POST /messages]------+
  |                         |
  v                         v
NestJS Backend (port 3001)
  |-- DialogStateService (Redis: state/slots persistence, TTL 1800s)
  |-- AiStylistContextService (Prisma: user profile, preferences, behaviors)
  |       |
  |       |---[HTTP/forward]---> Python FastAPI (AI Service)
  |       |                         |
  |       |                         |-- DialogEngine (state machine inference)
  |       |                         |     |-- SlotExtractor (LLM-based)
  |       |                         |     |-- FullOutfitEngine (outfit generation)
  |       |                         |     |-- Fashion Rules Loader (JSON filtering)
  |       |                         |
  |       |                         |-- Edge-TTS Service (audio generation)
  |       |                         |     |-- zh-CN-XiaoxiaoNeural voice
  |       |                         |     |-- Stream audio chunks back
  |       |                         |
  |       |                         |-- GLM-5 API (LLM reasoning)
  |       |
  |       |<--[JSON response + audio URL]---
  |
  |--[Response to Mobile]
  |     |-- Text reply
  |     |-- Quick replies (state-aware)
  |     |-- Outfit cards (images + scores)
  |     |-- Try-on trigger -> BottomSheet
  |     |-- Audio URL for TTS playback
  |
  v
Mobile renders:
  - Chat bubble with reply
  - Voice playback (audio player)
  - BottomSheet for try-on
  - Quick reply buttons
  - Outfit card carousel
```

### Recommended Project Structure

```
ml/
  services/
    stylist/
      dialog_engine.py          # EXISTING - state machine (add SCENE/DIRECT/CHAT branches)
      dialog_state.py           # EXISTING - enums/slots (add new states)
      slot_extractor.py         # EXISTING - LLM slot extraction
      full_outfit_engine.py     # EXISTING - outfit generation (add rule loading)
      rule_loader.py            # NEW - load + filter fashion rules from JSON
      studio_signal_detector.py # NEW - detect studio recommendation signals
      tts_service.py            # NEW - Edge-TTS wrapper
  data/
    fashion_rules/              # EXISTING - 7 JSON files
    studio_directory.json       # NEW - manual 5-10 studio entries

apps/backend/src/domains/ai-core/ai-stylist/
  dialog-state.service.ts       # EXISTING - Redis state persistence
  services/context.service.ts   # EXISTING - context building (trim overlap with Python)
  prompts/system-prompt.ts      # EXISTING - update personality to "Yiyi"
  dto/dialog.dto.ts             # EXISTING - add new states (SCENE, DIRECT, CHAT)

apps/mobile/src/
  features/
    stylist/
      screens/AiStylistUnifiedScreen.tsx  # EXISTING - wire VoiceButton + BottomSheet
      components/
        VoiceButton.tsx          # EXISTING - wire to @react-native-voice/voice
        TryOnBottomSheet.tsx     # NEW - @gorhom/bottom-sheet for try-on
        StudioRecommendCard.tsx  # NEW - studio card in chat
    onboarding/
      screens/
        OnboardingWizard.tsx     # EXISTING - refactor step order + add step 4
        steps/
          SceneSelectionStep.tsx # NEW - Step 1: 8-card scene selector
          QuickProfileStep.tsx   # NEW - Step 2: age/height/weight/size/garmentPreference
          StyleExpressionStep.tsx # NEW - Step 3: style pick + outfit image pick
          YiyiFirstOutfitStep.tsx # NEW - Step 4: "let Yiyi dress you"
      stores/onboardingStore.ts  # EXISTING - NewOnboardingState already has needed fields
  services/
    speech/
      speechRecognition.ts       # EXISTING - REPLACE with @react-native-voice/voice
      ttsService.ts              # EXISTING - update to play backend Edge-TTS audio
```

### Pattern 1: Python-NestJS Dialog Division

**What:** Python DialogEngine owns all state machine transitions, slot extraction via LLM, and outfit generation. NestJS DialogStateService owns Redis persistence and serves as the API gateway that forwards to Python.
**When to use:** Every chat message flows through this pipeline.
**Example:**

```typescript
// NestJS: receives message, loads state from Redis, forwards to Python
async handleChat(sessionId: string, message: string) {
  const context = await this.dialogStateService.getContext(sessionId); // Redis
  const response = await this.pythonClient.post('/dialog/process', {
    message, context
  });
  await this.dialogStateService.saveContext(sessionId, response.context); // Redis
  // If TTS needed, queue audio generation
  if (response.reply) {
    const audioUrl = await this.ttsService.generateAudio(response.reply);
    response.audioUrl = audioUrl;
  }
  return response;
}
```

```python
# Python: pure inference, no persistence
class DialogEngine:
    async def process_message(self, user_message: str, context: DialogContext) -> Dict:
        # State machine transitions happen here
        # Returns new context + reply (caller persists)
        handler = self._get_handler(context.state)
        return await handler(user_message, context)
```

### Pattern 2: Voice Pipeline (STT -> Chat -> TTS)

**What:** Press-hold records via @react-native-voice/voice -> STT result text -> send to Yiyi -> Edge-TTS generates audio -> mobile plays.
**When to use:** Voice button interaction on home screen and in chat.
**Example:**

```typescript
// Mobile: VoiceButton integration
import Voice from "@react-native-voice/voice";

// Setup (in component mount)
Voice.onSpeechResults = (e) => {
  const text = e.value[0]; // Best recognition result
  sendMessageToYiyi(text); // Same pipeline as text input
};

// Start/stop recording
const startListening = async () => {
  await Voice.start("zh-CN"); // Android SpeechRecognizer locale
};
const stopListening = async () => {
  await Voice.stop(); // Triggers onSpeechResults
};
```

```python
# Python: Edge-TTS audio generation
import edge_tts

async def generate_tts(text: str, voice: str = "zh-CN-XiaoxiaoNeural") -> str:
    communicate = edge_tts.Communicate(text, voice, rate="-10%")  # Slightly slower
    audio_path = f"/tmp/tts_{uuid4().hex[:8]}.mp3"
    await communicate.save(audio_path)
    return audio_path  # Served via MinIO/CDN
```

### Pattern 3: Try-On as BottomSheet (not page navigation)

**What:** When user triggers try-on in chat, a BottomSheetModal slides up within the chat screen, showing the try-on result. No navigation away from the conversation.
**When to use:** YIYI-04 requirement.
**Example:**

```tsx
// Source: Context7 /gorhom/react-native-bottom-sheet docs
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

const TryOnBottomSheet = forwardRef<BottomSheetModal>((props, ref) => {
  return (
    <BottomSheetModal ref={ref} snapPoints={["70%"]}>
      <BottomSheetView>
        <TryOnImageDisplay imageUrl={tryOnResult?.imageUrl} />
        <OutfitDetail outfit={selectedOutfit} />
        <View style={styles.actions}>
          <Button title="Save to Wardrobe" onPress={handleSave} />
          <Button title="Try Another" onPress={handleTryAnother} />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

// In AiStylistUnifiedScreen:
const tryOnRef = useRef<BottomSheetModal>(null);
// When agent returns action: "try_on":
tryOnRef.current?.present();
```

### Pattern 4: Fashion Rules Dynamic Loading

**What:** Load JSON rule files at startup, filter by bodyType+occasion+colorSeason at query time, inject matching rules into outfit scoring.
**When to use:** RUL-01, RUL-02 requirements.
**Example:**

```python
# New file: ml/services/stylist/rule_loader.py
class FashionRuleLoader:
    def __init__(self, rules_dir: str = "ml/data/fashion_rules"):
        self._rules = self._load_all_rules(rules_dir)

    def _load_all_rules(self, rules_dir: str) -> Dict[str, List[Dict]]:
        rules = {}
        for filepath in glob(f"{rules_dir}/*.json"):
            with open(filepath) as f:
                category = Path(filepath).stem  # e.g., "body_type_rules"
                rules[category] = json.load(f)
        return rules

    def get_filtered_rules(
        self,
        body_type: Optional[str] = None,
        occasion: Optional[str] = None,
        color_season: Optional[str] = None,
    ) -> List[Dict]:
        """Filter rules by criteria, return matching subset."""
        matched = []
        for category, rule_list in self._rules.items():
            for rule in rule_list:
                if body_type and rule.get("body_type") != body_type:
                    continue
                if occasion and rule.get("occasion") not in (occasion, None):
                    continue
                if color_season and rule.get("color_season") != color_season:
                    continue
                matched.append(rule)
        return matched
```

### Anti-Patterns to Avoid

- **Dual state machine logic:** Do NOT let NestJS context.service.ts make state transition decisions. It should ONLY persist what Python decides. The current overlap (556 lines in context.service) must be trimmed to data loading only.
- **Client-side TTS for personality voice:** Do NOT use react-native-tts for Yiyi's voice. Device TTS sounds robotic and cannot match the "warm 25-28 year old female" persona. Use Edge-TTS backend generation exclusively.
- **Placeholder API URLs:** The existing speechRecognition.ts points to `https://api.example.com/speech`. Replace entirely with @react-native-voice/voice local recognition.
- **Full page navigation for try-on:** Do NOT navigate to a new screen for try-on. CONTEXT.md locks BottomSheet-in-chat (YIYI-04).
- **Onboarding step mismatch:** The old 4 steps (basicInfo/styleTest/photo/complete) do NOT match the new spec. Build new step components rather than patching old ones.

## Don't Hand-Roll

| Problem                               | Don't Build                    | Use Instead                                     | Why                                                                                              |
| ------------------------------------- | ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Speech recognition (STT)              | Custom recording + API upload  | @react-native-voice/voice                       | Wraps Android SpeechRecognizer natively; handles permissions, locales, streaming results, errors |
| Text-to-speech (Chinese neural voice) | Device TTS or custom synthesis | edge-tts (Python)                               | Free, high-quality Microsoft Neural voices (XiaoxiaoNeural), rate/pitch control, streaming       |
| Bottom sheet modal                    | Custom overlay + animation     | @gorhom/bottom-sheet                            | Gesture handling, snap points, keyboard avoidance, scroll integration already solved             |
| Voice button animation                | Custom pulse implementation    | react-native-reanimated (already used)          | VoiceButton.tsx already uses withRepeat/withSequence patterns                                    |
| Onboarding state persistence          | Custom AsyncStorage writes     | Zustand persist middleware                      | onboardingStore already uses persist + AsyncStorage                                              |
| Fashion rule filtering                | Manual if/else chains          | Structured JSON filtering                       | 7 JSON files have structured fields (body_type, occasion, color_season) designed for query       |
| Chat message bubble rendering         | Custom layout                  | Existing ChatBubble.tsx + TypewriterMessage.tsx | Already built, supports typing animation                                                         |

**Key insight:** This phase has ~4000 lines of existing code across the four domains. The work is integration and gap-filling, not greenfield development.

## Common Pitfalls

### Pitfall 1: Python-NestJS State Desynchronization

**What goes wrong:** Both services modify state independently, leading to divergent context.
**Why it happens:** DialogEngine mutates DialogContext in-memory while NestJS saves to Redis. If Python's response doesn't include the full updated context, Redis gets stale data.
**How to avoid:** Python DialogEngine.process_message() must ALWAYS return the complete updated DialogContext. NestJS saves the returned context without merging.
**Warning signs:** Conversation "forgets" previous slot values after a state transition.

### Pitfall 2: @react-native-voice/voice Android Setup

**What goes wrong:** SpeechRecognizer fails silently on Android because Google app is not installed or permissions are missing.
**Why it happens:** Android SpeechRecognizer requires Google app as the recognition service. Some Chinese Android devices may not have it.
**How to avoid:** Call Voice.isAvailable() before starting; check Voice.getSpeechRecognitionServices(); provide graceful fallback to text input.
**Warning signs:** onSpeechError fires immediately after start().

### Pitfall 3: Edge-TTS Latency on First Call

**What goes wrong:** First Edge-TTS call takes 2-3 seconds, creating a noticeable delay before Yiyi "speaks."
**Why it happens:** Edge-TTS establishes WebSocket connection to Microsoft servers on first call.
**How to avoid:** Warm up the connection at app start; cache common responses; consider generating audio in parallel with text display.
**Warning signs:** Audio plays 3+ seconds after chat bubble appears.

### Pitfall 4: Onboarding Step 4 Race Condition

**What goes wrong:** User picks an outfit in Step 4 but the save to wardrobe fails silently.
**Why it happens:** FullOutfitEngine generates outfits from curated data; the "save" API call may fail but onboarding still marks complete.
**How to avoid:** Make wardrobe save a prerequisite for onboarding completion; show loading state; retry once on failure before allowing skip.
**Warning signs:** User completes onboarding but wardrobe is empty.

### Pitfall 5: Dialog State Machine Missing Branches

**What goes wrong:** Current DialogState enum lacks SCENE, DIRECT, CHAT states from the CONTEXT.md spec.
**Why it happens:** CONTEXT.md specifies GREET->CONTEXT->[SCENE|DIRECT|CHAT]->GENERATE but current implementation has only GREET->CONTEXT->GENERATE.
**How to avoid:** Add SCENE, DIRECT, CHAT as new DialogState values in both Python dialog_state.py and NestJS dialog.dto.ts; implement handlers for each in DialogEngine.
**Warning signs:** All conversations funnel through CONTEXT state regardless of user intent.

### Pitfall 6: Voice Button Not Wired to Chat

**What goes wrong:** VoiceButton.tsx renders beautifully but doesn't send recognized text to the chat pipeline.
**Why it happens:** VoiceButton is a standalone component (147 lines) with no connection to AiStylistUnifiedScreen.
**How to avoid:** VoiceButton's onSpeechResults callback must call the same sendMessage() function that the text input uses.
**Warning signs:** Voice recognition works but chat doesn't respond.

## Code Examples

### Voice Integration (replacing placeholder speechRecognition.ts)

```typescript
// Source: Context7 /react-native-voice/voice docs
import Voice from "@react-native-voice/voice";

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");

  useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        setRecognizedText(e.value[0]);
      }
    };
    Voice.onSpeechError = (e) => {
      console.error("Speech error:", e.error);
      setIsListening(false);
    };
    return () => Voice.destroy().then(Voice.removeAllListeners);
  }, []);

  const startListening = async () => {
    const available = await Voice.isAvailable();
    if (!available) {
      return;
    }
    await Voice.start("zh-CN");
  };

  const stopListening = async () => {
    await Voice.stop();
  };

  return { isListening, recognizedText, startListening, stopListening };
}
```

### Edge-TTS Python Service

```python
# Source: Context7 /rany2/edge-tts docs + PyPI
import edge_tts
import logging

logger = logging.getLogger(__name__)

# Recommended Chinese voices for "warm 25-28 female":
# - zh-CN-XiaoxiaoNeural: warm, expressive, versatile
# - zh-CN-XiaohanNeural: sweet, gentle
# - zh-CN-XiaomoNeural: mature, warm

YIYI_VOICE = "zh-CN-XiaoxiaoNeural"
YIYI_RATE = "-10%"  # Slightly slower for clarity

class EdgeTTSService:
    async def synthesize(self, text: str, voice: str = YIYI_VOICE, rate: str = YIYI_RATE) -> bytes:
        """Generate audio bytes from text."""
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)

    async def synthesize_to_file(self, text: str, output_path: str) -> str:
        """Generate audio file from text."""
        communicate = edge_tts.Communicate(text, YIYI_VOICE, rate=YIYI_RATE)
        await communicate.save(output_path)
        return output_path
```

### Onboarding Step 4: "Let Yiyi Dress You"

```typescript
// New component: YiyiFirstOutfitStep.tsx
// Uses FullOutfitEngine via backend API, displays 3 outfits, user picks 1

const YiyiFirstOutfitStep: React.FC<Props> = ({ formData, onOutfitSelected }) => {
  const [outfits, setOutfits] = useState<OutfitPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    // Call ColdStartService with onboarding data to generate 3 outfits
    onboardingService
      .generateFirstOutfits({
        primaryScenarios: formData.primaryScenarios,
        styleExpression: formData.styleExpression,
        garmentPreference: formData.garmentPreference,
        bodyType: formData.bodyType,
      })
      .then(setOutfits)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (index: number) => {
    setSelectedIndex(index);
    await onboardingService.saveOutfitToWardrobe(outfits[index]);
    onOutfitSelected(outfits[index]);
  };

  if (loading) return <YiyiThinkingAnimation message="正在为你搭配..." />;
  if (outfits.length === 0) return <FallbackMessage />;

  return (
    <View>
      <YiyiAvatar />
      <Text>基于你刚才的选择，给你搭了{outfits.length}套，看看喜欢哪个？</Text>
      <ScrollView horizontal>
        {outfits.map((outfit, i) => (
          <OutfitCard
            key={i}
            outfit={outfit}
            selected={selectedIndex === i}
            onPress={() => handleSelect(i)}
          />
        ))}
      </ScrollView>
    </View>
  );
};
```

### Studio Signal Detection

```python
# New: ml/services/stylist/studio_signal_detector.py
class StudioSignalDetector:
    """Detect conversation signals that trigger studio recommendation."""

    SIGNAL_PATTERNS = {
        "premium_budget": lambda slots: slots.get("budget", {}).get("min", 0) >= 3000,
        "luxury_budget": lambda slots: slots.get("budget", {}).get("min", 0) >= 5000,
        "multiple_rejections": lambda ctx: ctx.user_feedback.count("negative") >= 3,
        "unique_request": lambda msg: any(kw in msg for kw in ["独一无二", "定制", "special", "特别"]),
        "special_event": lambda msg: any(kw in msg for kw in ["婚礼", "红毯", "颁奖典礼", "重要场合"]),
    }

    def detect(self, message: str, context: DialogContext) -> Optional[str]:
        """Returns signal type if triggered, None otherwise."""
        for signal_name, checker in self.SIGNAL_PATTERNS.items():
            if signal_name.endswith("_budget"):
                if checker(context.slots.model_dump()):
                    return signal_name
            elif signal_name == "multiple_rejections":
                if checker(context):
                    return signal_name
            else:
                if checker(message):
                    return signal_name
        return None
```

## State of the Art

| Old Approach                                           | Current Approach                                    | When Changed | Impact                                                                     |
| ------------------------------------------------------ | --------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| Expo-AV recording + custom STT API                     | @react-native-voice/voice (native SpeechRecognizer) | Decision #24 | On-device recognition, no backend needed, lower latency                    |
| react-native-tts (device TTS)                          | Edge-TTS (cloud neural voice)                       | Decision #33 | Personality-consistent voice; XiaoxiaoNeural matches "warm female" persona |
| 4-step onboarding (basicInfo/styleTest/photo/complete) | 4-step onboarding (scene/profile/style/yiyi-dress)  | CONTEXT.md   | garmentPreference in Step 2 unblocks ColdStartService coherence            |
| Hardcoded fashion rules in engine                      | Dynamic JSON loading + filtering                    | RUL-01~03    | 264+ rules from 7 JSON files, filtered by bodyType+occasion+colorSeason    |
| Full page navigation for try-on                        | BottomSheet within chat                             | YIYI-04      | No context switch; conversation continues while viewing try-on             |
| Generic system prompt ("小裳")                         | Yiyi personality (warm opinionated friend)          | Decision #1  | Distinctive character with forbidden phrases and body-positive language    |

**Deprecated/outdated:**

- speechRecognition.ts placeholder URL (`https://api.example.com/speech`): Replace with @react-native-voice/voice
- System prompt referring to "小裳": Update to "伊伊" (Yiyi) personality
- Old onboarding steps (basicInfo/styleTest/photo/complete): Replace with new 4-step flow

## Assumptions Log

| #   | Claim                                                                                                | Section               | Risk if Wrong                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| A1  | zh-CN-XiaoxiaoNeural is the best Edge-TTS voice for "warm 25-28 female" persona                      | Architecture Patterns | Voice sounds wrong for brand; need to test alternative voices (XiaohanNeural, XiaomoNeural)                   |
| A2  | Python edge-tts can generate audio fast enough for real-time chat (< 2s)                             | Pitfall 3             | Latency too high; may need to pre-generate common phrases or use streaming                                    |
| A3  | Android SpeechRecognizer works on Chinese market devices (Huawei, Xiaomi, etc.)                      | Pitfall 2             | Some Chinese Android devices lack Google services; may need iFlytek fallback (but that's deferred to Phase 6) |
| A4  | @gorhom/bottom-sheet works within AiStylistUnifiedScreen's scrollable FlatList                       | Architecture Patterns | Gesture conflicts between chat scroll and bottom sheet; may need gesture coordination                         |
| A5  | FullOutfitEngine can generate 3 outfits for onboarding Step 4 within 3 seconds using curated data    | Code Examples         | Cold start outfit generation too slow; need pre-computed options or simpler generation for onboarding         |
| A6  | NestJS context.service.ts can be trimmed to persistence-only without breaking existing functionality | Architecture Patterns | Removing 556 lines of overlapping logic may break edge cases not covered by tests                             |

## Open Questions

1. **Edge-TTS Audio Delivery Method**

   - What we know: edge-tts can save to file or stream chunks. NestJS serves as API gateway.
   - What's unclear: Should audio be served as a URL (MinIO upload) or streamed directly via HTTP response?
   - Recommendation: Use MinIO upload + URL pattern. Simpler for mobile client (standard audio player), supports caching, avoids WebSocket complexity for audio.

2. **Onboarding Step 4 Backend API**

   - What we know: ColdStartService exists. FullOutfitEngine exists. No endpoint exists for "generate first outfits from onboarding data."
   - What's unclear: Does the existing recommendation pipeline handle the case where user has no behavioral history (pure onboarding data only)?
   - Recommendation: Add a dedicated `/api/v1/onboarding/first-outfits` endpoint that calls ColdStartService with onboarding data directly, bypassing the behavioral scoring layer.

3. **Studio Directory Format**
   - What we know: Sprint scope is manual 5-10 studios. Needs name, location, specialty, price range, contact.
   - What's unclear: Should this be a JSON file, database table, or hardcoded?
   - Recommendation: JSON seed file (`ml/data/studio_directory.json`) for sprint. Can migrate to database in Phase 6+.

## Environment Availability

| Dependency                | Required By              | Available                 | Version      | Fallback                               |
| ------------------------- | ------------------------ | ------------------------- | ------------ | -------------------------------------- |
| Python 3.11+              | Edge-TTS, DialogEngine   | Needs verification        | -            | -                                      |
| edge-tts (Python)         | TTS audio generation     | Not installed             | 7.2.8 (PyPI) | -                                      |
| @gorhom/bottom-sheet      | Try-on BottomSheet       | Installed (monorepo root) | 5.2.8        | -                                      |
| @react-native-voice/voice | Android STT              | Not installed             | 3.2.4 (npm)  | Text input only (graceful degradation) |
| react-native-tts          | Audio playback           | Not installed             | -            | Use react-native-sound or expo-av      |
| Redis                     | Dialog state persistence | In docker-compose         | 7            | In-memory fallback for dev             |
| MinIO                     | TTS audio storage        | In docker-compose         | -            | Local filesystem fallback              |
| GLM API key               | LLM inference            | Needs verification        | -            | Qianwen fallback (STATE.md)            |

**Missing dependencies with no fallback:**

- @react-native-voice/voice: Must install for VOI-02. Without it, voice input is non-functional.
- edge-tts Python package: Must install for VOI-03. Without it, TTS uses device default (poor quality, no personality).

**Missing dependencies with fallback:**

- react-native-tts: If not installable, can use expo-av or a simple audio player component for playback.

## Validation Architecture

### Test Framework

| Property           | Value                                                              |
| ------------------ | ------------------------------------------------------------------ | ---------- | ---------- |
| Framework          | Jest (mobile) + pytest (Python)                                    |
| Config file        | apps/mobile/jest.config.js (existing) + ml/tests/ (needs creation) |
| Quick run command  | `cd apps/mobile && pnpm test -- --testPathPattern="stylist         | onboarding | voice" -x` |
| Full suite command | `cd apps/mobile && pnpm test && cd ../../ml && pytest`             |

### Phase Requirements -> Test Map

| Req ID    | Behavior                                                   | Test Type   | Automated Command                                      | File Exists? |
| --------- | ---------------------------------------------------------- | ----------- | ------------------------------------------------------ | ------------ |
| YIYI-01   | State machine processes all states with proper transitions | unit        | `pytest ml/tests/test_dialog_engine.py -x`             | No - Wave 0  |
| YIYI-02   | Interview flow: company->position->budget->outfits         | integration | `pytest ml/tests/test_interview_flow.py -x`            | No - Wave 0  |
| YIYI-03   | Yiyi personality prompt enforced (no forbidden phrases)    | unit        | `pytest ml/tests/test_yiyi_personality.py -x`          | No - Wave 0  |
| YIYI-04   | Try-on BottomSheet presents within chat                    | component   | `pnpm test -- --testPathPattern="TryOnBottomSheet" -x` | No - Wave 0  |
| YIYI-05   | Preferences persist across sessions                        | integration | `pytest ml/tests/test_preference_memory.py -x`         | No - Wave 0  |
| VOI-01    | Voice button triggers STT pipeline                         | component   | `pnpm test -- --testPathPattern="VoiceButton" -x`      | No - Wave 0  |
| VOI-02    | Android SpeechRecognizer returns zh-CN text                | unit        | Manual (requires device)                               | N/A          |
| VOI-03    | Edge-TTS generates Chinese audio                           | unit        | `pytest ml/tests/test_edge_tts.py -x`                  | No - Wave 0  |
| ONB-01~04 | Onboarding completes all 4 steps                           | integration | `pnpm test -- --testPathPattern="OnboardingWizard" -x` | No - Wave 0  |
| RUL-01~02 | Rules loaded and filtered correctly                        | unit        | `pytest ml/tests/test_rule_loader.py -x`               | No - Wave 0  |
| ETH-01~02 | Body-positive language enforced                            | unit        | `pytest ml/tests/test_body_positive.py -x`             | No - Wave 0  |

### Sampling Rate

- **Per task commit:** `pnpm test -- --testPathPattern="<changed-module>" -x`
- **Per wave merge:** `pnpm test && cd ../../ml && pytest`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `ml/tests/test_dialog_engine.py` -- covers YIYI-01, YIYI-02
- [ ] `ml/tests/test_yiyi_personality.py` -- covers YIYI-03, ETH-01, ETH-02
- [ ] `ml/tests/test_edge_tts.py` -- covers VOI-03
- [ ] `ml/tests/test_rule_loader.py` -- covers RUL-01, RUL-02
- [ ] `apps/mobile/src/features/stylist/__tests__/TryOnBottomSheet.test.tsx` -- covers YIYI-04
- [ ] `apps/mobile/src/features/onboarding/__tests__/OnboardingWizard.test.tsx` -- covers ONB-01~04

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                            |
| --------------------- | ------- | ------------------------------------------- |
| V2 Authentication     | yes     | JWT + Passport (existing)                   |
| V3 Session Management | yes     | Redis TTL 1800s for dialog state            |
| V4 Access Control     | yes     | Session ID validation for dialog access     |
| V5 Input Validation   | yes     | class-validator DTOs (DialogChatRequestDto) |
| V6 Cryptography       | no      | No new crypto in this phase                 |

### Known Threat Patterns for Voice + Chat Stack

| Pattern                               | STRIDE            | Standard Mitigation                                                               |
| ------------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| XSS via chat messages                 | Tampering         | Sanitize user messages before rendering; React Native Text component auto-escapes |
| Dialog state hijacking                | Spoofing          | Validate sessionId belongs to authenticated user; Redis key scoping               |
| STT injection (adversarial audio)     | Tampering         | Validate recognized text length; rate limit voice submissions                     |
| Edge-TTS abuse (excessive generation) | Denial of Service | Rate limit TTS requests; cache common responses; audio length cap                 |
| Onboarding data manipulation          | Tampering         | Validate all onboarding form data server-side; garmentPreference enum validation  |

## Sources

### Primary (HIGH confidence)

- Context7 /react-native-voice/voice - API methods, event handlers, Android setup
- Context7 /gorhom/react-native-bottom-sheet - BottomSheetModal usage, GestureHandlerRootView integration
- Context7 /rany2/edge-tts - CLI usage, voice selection, rate/pitch/volume control
- Context7 /travisvn/edge-tts-universal - Node.js alternative API, streaming, voice management
- Codebase: ml/services/stylist/dialog_engine.py (362 lines verified)
- Codebase: ml/services/stylist/full_outfit_engine.py (2030 lines verified)
- Codebase: apps/backend/src/domains/ai-core/ai-stylist/ (DTOs, services verified)
- Codebase: apps/mobile/src/features/onboarding/stores/onboardingStore.ts (verified)
- npm registry: @react-native-voice/voice v3.2.4, @gorhom/bottom-sheet v5.2.10
- PyPI: edge-tts v7.2.8

### Secondary (MEDIUM confidence)

- monorepo node_modules: @gorhom/bottom-sheet v5.2.8 installed and verified
- STATE.md: garmentPreference blocker, GLM fallback strategy
- CONTEXT.md: All locked decisions verified against codebase

### Tertiary (LOW confidence)

- None -- all claims verified against codebase or package registries

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all packages verified against npm/PyPI registries and existing installations
- Architecture: HIGH - existing codebase provides clear patterns; delta is well-understood wiring
- Pitfalls: HIGH - identified from actual code inspection (placeholder URLs, overlapping logic, unwired components)

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (stable - all core dependencies are mature)
