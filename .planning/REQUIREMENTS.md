# Requirements: 寻裳 XUNO v2.0 — 前端全面重构与商业化品质升级

**Defined:** 2026-04-27
**Core Value:** 用户打开 App 即获伊伊主动推送的当日穿搭方案——零步决策，语音一步触达。体验壁垒替代技术壁垒。

## v2.0 Requirements

Requirements for commercial-quality frontend restructuring. Each maps to roadmap phases starting from Phase 13.

### AUDIT — 全流程深度审计

- [ ] **AUDIT-01**: User can view a complete screenshot inventory of every screen in the current app (auto-captured via Playwright/browser automation), documenting baseline visual state
- [ ] **AUDIT-02**: Developer has a gap analysis document comparing current UI against 3 benchmark apps (小红书, 得物, NET-A-PORTER) with specific UI/UX pattern differences per page
- [ ] **AUDIT-03**: Developer has an audit report of component library consistency (spacing scale, border radius, font sizes, color usage, animation patterns) identifying all inconsistencies
- [ ] **AUDIT-04**: Developer has performance baseline measurements (first screen load time, TTI, list scroll FPS on mid-range Android, image load timing) documented with specific numbers
- [ ] **AUDIT-05**: Developer has WCAG 2.1 AA accessibility audit results for all interactive elements, listing every missing accessibilityLabel, touch target, and contrast violation

### BRAND — 品牌视觉资产定义

- [ ] **BRAND-01**: User sees a designed logo (warm camel palette, fashion-forward, recognizable at 32px) with horizontal, square, and monochrome variants
- [ ] **BRAND-02**: User sees a designed app icon (iOS + Android adaptive icon) that is distinctive on home screen and conveys AI fashion identity
- [ ] **BRAND-03**: User sees a splash/launch screen animation (Lottie, ≤1.5s duration, brand color reveal + logo) that plays on every cold start
- [ ] **BRAND-04**: Developer has a complete brand guideline document defining: color palette with usage rules, typography scale (header/body/caption), spacing system (4px grid), icon style (Phosphor customizations), and illustration style
- [ ] **BRAND-05**: User sees consistent visual patterns (decorative motifs, background textures, card treatments) applied across the app as a cohesive visual language
- [ ] **BRAND-06**: Developer has an icon set covering all app functions (tabs, actions, categories, states) with consistent visual weight and stroke style matching brand identity

### DSTK — 设计系统 Token 体系

- [ ] **DSTK-01**: Developer has a three-layer Design Token system (primitive → semantic → component) covering Color, Typography, Spacing, Radius, Shadow, and Motion categories
- [ ] **DSTK-02**: All new and existing components use Design Token references exclusively — zero hardcoded color/spacing/font-size values anywhere in the codebase
- [ ] **DSTK-03**: Existing DesignTokens are EXTENDED (not replaced) — all existing token references continue to work while new semantic/component tokens layer on top
- [ ] **DSTK-04**: Broken ThemeManager.ts (using Web APIs) is replaced with Zustand theme store + MMKV persistence + React Native Appearance API
- [ ] **DSTK-05**: User can toggle between light and dark mode, with dark mode using an independently designed palette (not brightness inversion) — warm dark grays with adjusted camel accent ensuring WCAG AA 4.5:1 contrast
- [ ] **DSTK-06**: Theme preference persists across app restarts and syncs with system appearance setting

### COMP — 原子组件库

- [ ] **COMP-01**: User interacts with a Button component supporting: primary/secondary/ghost/text variants, loading state, icon slot, disabled state, consistent touch target (≥44px), accessibilityLabel
- [ ] **COMP-02**: User interacts with an Input component supporting: text/search/number types, label, placeholder, error state, icon slot, clear button, focus animation
- [ ] **COMP-03**: User sees Card components with: elevation variants (flat/subtle/raised), image cover mode, header/body/footer slots, press animation (scale 0.98), consistent border radius from tokens
- [ ] **COMP-04**: User sees Avatar components with: size variants (xs/s/m/l/xl), border variants (none/brand/status), online indicator dot, fallback initials
- [ ] **COMP-05**: User sees Badge components with: color variants, size variants, dot mode, count overflow (99+)
- [ ] **COMP-06**: User sees Skeleton loading components with: shimmer animation using Reanimated (no extra deps), text/circle/rect/row variants, dark mode support
- [ ] **COMP-07**: User interacts with BottomSheet component with: multiple snap points, drag handle, backdrop, smooth open/close animation via Reanimated
- [ ] **COMP-08**: User sees Toast notification component with: success/error/warning/info variants, auto-dismiss, queue management, slide-in animation

### TODAY — 首页重构

- [ ] **TODAY-01**: User sees an immersive Today page with visual hierarchy matching 小红书's discover feed quality — hero scene card, recommendation cards with visual impact, and clear information hierarchy
- [ ] **TODAY-02**: User sees scene/weather card with animated weather icons, temperature display, occasion context, and AI-generated daily summary — feels like a premium weather+style briefing
- [ ] **TODAY-03**: User sees Yiyi recommendation cards with large outfit images, outfit name, occasion tags, confidence indicator, and try-on action — each card has visual weight comparable to 小红书 note cards
- [ ] **TODAY-04**: User can scroll through recommendations via a horizontal carousel with snap pagination, peek preview of next card, and haptic feedback on snap
- [ ] **TODAY-05**: User sees voice button prominently positioned with press-to-speak visual feedback (pulse animation, waveform display), meeting the "one-step voice" core interaction

### CHAT — AI 对话页重构

- [ ] **CHAT-01**: User sees chat bubbles with premium visual quality matching ChatGPT/豆包 — distinct Yiyi vs user bubble styles, smooth rounded corners, proper text wrapping, timestamp display
- [ ] **CHAT-02**: User sees AI responses with typewriter streaming effect (text appears character by character), maintaining scroll position and allowing user to scroll up during generation
- [ ] **CHAT-03**: User sees embedded outfit/product cards within chat flow — cards show item image, name, price, and action buttons (try-on, save, view) without leaving conversation
- [ ] **CHAT-04**: User sees quick reply chips below AI messages — horizontally scrollable, styled as rounded pills, providing 3-5 contextual response suggestions
- [ ] **CHAT-05**: User interacts with voice button in chat input bar — press-hold to record, visual waveform during recording, auto-send on release, TTS auto-play for AI voice responses
- [ ] **CHAT-06**: User sees conversation loading states — skeleton bubbles matching message shape, typing indicator (3-dot bounce animation), and graceful error state for failed messages

### DISC — 发现页重构

- [ ] **DISC-01**: User sees a masonry/waterfall grid layout (2-column, staggered heights) matching Pinterest/得物 quality — FashionSigLIP-powered visual inspiration feed
- [ ] **DISC-02**: User can scroll the masonry grid smoothly at 60fps with FlashList MasonryFlashList — items recycle efficiently, images lazy-load with blurhash placeholders
- [ ] **DISC-03**: User can filter content by category tabs (场景/风格/季节/品牌) with smooth tab transition animation and filter persistence
- [ ] **DISC-04**: User sees each grid card with: image (aspect-ratio preserved), title overlay, like count, bookmark button, and subtle shadow — card design matches 得物 product card quality
- [ ] **DISC-05**: User can pull-to-refresh with a custom branded animation (not default spinner) — animated Yiyi logo or fashion-related illustration during refresh

### WARD — 衣橱页重构

- [ ] **WARD-01**: User sees wardrobe organized by category tabs (全部/上装/下装/外套/鞋履/配饰) with item count badges and smooth tab switching
- [ ] **WARD-02**: User can long-press to enter selection mode, then drag-reorder items within category — drag animation follows finger with opacity change and shadow lift
- [ ] **WARD-03**: User sees outfit combinations displayed as flat-lay compositions (items arranged visually, not as list) — matching Whering/Stylebook quality
- [ ] **WARD-04**: User sees each garment card with: image, name, category tag, season tags, and wear count — card design is clean and scannable
- [ ] **WARD-05**: User can add items via camera (with background removal preview) or gallery upload, with AI auto-tagging progress indicator

### PROF — 个人页重构

- [ ] **PROF-01**: User sees their Style DNA visualized as a radar chart with 6 dimensions (色彩偏好/风格表达/场景适配/价位区间/品牌偏好/搭配复杂度) — chart has smooth animation on load
- [ ] **PROF-02**: User sees their style color palette extracted from wardrobe/favorites — displayed as a color wheel or gradient strip with dominant color labels
- [ ] **PROF-03**: User sees outfit calendar in 7-day view with outfit thumbnails on past dates, weather icons, and occasion labels — calendar cells are tappable to view details
- [ ] **PROF-04**: User sees style evolution timeline showing how their preferences changed over time — visual representation of style journey with milestone markers
- [ ] **PROF-05**: User sees profile stats (total outfits, items worn most, style match score) with clean metric cards and subtle count-up animation

### ONBD — Onboarding 重构

- [ ] **ONBD-01**: User experiences smooth animated transitions between onboarding steps — slide + fade animation, progress indicator updates with spring animation
- [ ] **ONBD-02**: User sees scene selection cards with attractive visual design — each card shows scenario illustration, icon, and title; cards have selected state with brand-color border animation
- [ ] **ONBD-03**: User sees style expression step with visual style samples (not text-only) — each style shown with representative outfit image and description
- [ ] **ONBD-04**: User experiences "let Yiyi dress you" reveal moment with anticipation-building animation — outfit cards appear one by one with stagger animation, brand glow effect
- [ ] **ONBD-05**: User can skip onboarding steps without blocking — skip button visible on every step, data gracefully handles partial input

### TECH — 技术升级

- [ ] **TECH-01**: Developer replaces FlatList with FlashList v2 in all list views — verified 60fps scroll on mid-range Android (Snapdragon 680 or equivalent)
- [ ] **TECH-02**: User sees images loaded via expo-image with: blurhash placeholder, progressive loading (low-res → full-res), memory and disk caching, CDN URL parameter support for size optimization
- [ ] **TECH-03**: User can use core features offline — cached recommendations (50 items), wardrobe data, and calendar visible without network, with offline banner when disconnected
- [ ] **TECH-04**: User sees page transition animations via Reanimated 3 shared element transitions — card to detail hero animation is smooth (no flash or layout jump)
- [ ] **TECH-05**: Developer has Reanimated 3 animation preset system — standardized easing curves, durations, spring configs in a central presets file, no ad-hoc animation values

### ANIM — 微交互与动效

- [ ] **ANIM-01**: User sees like/favorite animation — heart icon scales up with overshoot spring, particle burst effect, color fill animation (completed within 400ms)
- [ ] **ANIM-02**: User sees custom pull-to-refresh animation — branded loading indicator (not default spinner), smooth transition to refresh state, completion animation
- [ ] **ANIM-03**: User sees shared element page transitions — item image smoothly morphs from card to detail page header, no flash or layout shift
- [ ] **ANIM-04**: User sees skeleton shimmer effect on all loading states — wave animation using Reanimated, matches component shape (text lines, image rectangles, avatar circles)
- [ ] **ANIM-05**: User sees AI recommendation progressive reveal — outfit items appear one by one with stagger delay, background subtle glow pulse, confidence bar animates in
- [ ] **ANIM-06**: Total Lottie animation count ≤ 5, total animation asset size ≤ 1MB — splash screen + 4 micro-interactions, all optimized for performance

## v3 Requirements (Deferred)

### Future Visual Enhancements

- **3D garment preview**: Interactive 3D model rotation for wardrobe items — requires 3D asset pipeline
- **AR mirror try-on**: Real-time camera-based virtual try-on — requires AR framework
- **Haptic feedback system**: Contextual haptic patterns for all interactions — requires native module
- **Parallax scrolling**: Depth-based parallax on Today page hero section — requires scroll gesture analysis

### Future Performance

- **Bundle splitting**: Dynamic imports for heavy screens to reduce initial load
- **WebSocket streaming**: Replace SSE with WebSocket for real-time chat streaming
- **On-device ML inference**: MediaPipe + CIELAB for offline style matching

## Out of Scope

| Feature                         | Reason                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Expo Router migration           | react-native-screens 4.4.0 blocks migration — deferred to SDK upgrade cycle                     |
| Moti animation library          | Use Reanimated 3 directly to avoid dual animation system — Moti is thin wrapper over Reanimated |
| react-native-fast-image         | Abandonware since 2022 — expo-image is the replacement                                          |
| Storybook integration           | Nice-to-have for visual regression — can add post-v2.0                                          |
| React Native version upgrade    | Locked at 0.76.8 per project constraints — upgrade is separate milestone                        |
| Backend API changes             | 385 endpoints frozen — frontend restructuring only                                              |
| New navigation structure        | 4-tab navigation stays — only visual/interaction quality upgrade                                |
| Micro-transaction/credit system | Anti-pattern for decision-first app — 3-tier membership model already built                     |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement                         | Phase | Status |
| ----------------------------------- | ----- | ------ |
| (Populated during roadmap creation) |       |        |

**Coverage:**

- v2.0 requirements: 52 total
- Mapped to phases: 0
- Unmapped: 52 ⚠️

---

_Requirements defined: 2026-04-27_
_Last updated: 2026-04-27 after v2.0 milestone requirements definition_
