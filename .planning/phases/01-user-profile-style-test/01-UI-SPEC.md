---
phase: 1
slug: user-profile-style-test
status: draft
shadcn_initialized: false
preset: not applicable (React Native)
created: 2026-04-14
---

# Phase 1 -- UI Design Contract

> Visual and interaction contract for AiNeed Phase 1: user profile and style test.
> Pre-populated from existing codebase theme tokens, CONTEXT.md decisions, and RESEARCH.md stack findings.
> This is a React Native (Expo) mobile app -- shadcn is not applicable.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | none (React Native -- NativeWind + StyleSheet) | RESEARCH.md |
| Preset | not applicable | N/A |
| Component library | react-native-paper 5.12 (supplementary) | package.json |
| Icon library | Ionicons via @expo/vector-icons polyfill | codebase convention |
| Font | iOS: PingFang SC / SF Pro Display; Android: Noto Sans SC / Roboto | theme/tokens/typography.ts |
| Styling | NativeWind (Tailwind CSS for RN) + StyleSheet.create() | tailwind.config.js + codebase |
| Animations | react-native-reanimated 3.16 + react-native-gesture-handler | codebase convention |
| State | Zustand 5 + TanStack Query 5 | codebase convention |

---

## Spacing Scale

Declared values from `theme/tokens/spacing.ts` (all multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs / 1 | 4px | Icon gaps, inline badge padding |
| sm / 2 | 8px | Compact element spacing, tag gaps |
| 3 | 12px | List item padding, inner card spacing |
| md / 4 | 16px | Default element spacing, input padding, card padding |
| 5 | 20px | Screen horizontal padding |
| lg / 6 | 24px | Section gaps, modal padding |
| xl / 8 | 32px | Layout gaps, major section breaks |
| 2xl / 12 | 48px | Page-level spacing, bottom spacers |
| 3xl / 16 | 64px | Major section breaks, avatar sizes |

### Layout Constants (from spacing.ts LayoutSpacing)

| Token | Value | Usage |
|-------|-------|-------|
| screenPadding | 20px | All screen horizontal padding |
| cardPadding | 16px | Card internal padding |
| sectionGap | 24px | Between sections on a screen |
| cardGap | 16px | Between cards in a list |
| gridGap | 12px | Grid item gaps (quiz image grid) |

### Border Radius (from spacing.ts BorderRadiusScale)

| Token | Value | Usage |
|-------|-------|-------|
| md | 6px | Input fields |
| lg | 8px | Secondary buttons |
| xl | 12px | Primary buttons, input groups, CTA buttons |
| 2xl | 16px | Large cards |
| 3xl | 20px | Summary cards, modals |
| full | 9999px | Age pills, avatars, color swatches |

Exceptions: Button min-height 52px (from LoginScreen/RegisterScreen convention), touch target 48px minimum for all interactive elements.

---

## Typography

From `theme/tokens/typography.ts`. This project uses a rich type scale; the Phase 1 screens use these specific combinations:

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Hero / Screen Title | 32px | 700 (bold) | 1.2 | Login "welcome back", onboarding step titles |
| H2 / Section Title | 24px | 600 (semibold) | 32px | Quiz question titles, profile section titles |
| H3 / Card Title | 20px | 600 (semibold) | 28px | Onboarding wizard step title, card headings |
| H4 / Subheading | 18px | 600 (semibold) | 26px | Profile report section titles |
| Body | 16px | 400 (regular) | 24px | Body text, input text, descriptions |
| Body Small | 14px | 400 (regular) | 20px | Secondary text, quiz subtitles, labels |
| Caption | 12px | 500 (medium) | 16px | Step counter, hints, metadata |
| Overline | 10px | 700 (bold) | 14px | Category labels, extreme small text |
| Button | 16px | 600 (semibold) | 24px | All CTA buttons, wide letter-spacing |
| Label | 14px | 500 (medium) | 20px | Form labels, wide letter-spacing |

Font weights in use: 400 (regular), 500 (medium), 600 (semibold), 700 (bold). No other weights for Phase 1.

---

## Color

From `theme/tokens/colors.ts` and `tailwind.config.js`. The design language uses a warm, earth-tone fashion palette.

### Primary Palette

| Role | Hex | Usage | Coverage |
|------|-----|-------|----------|
| Dominant (60%) | #FAFAF8 (neutral-50) | Screen backgrounds, scroll areas | Backgrounds |
| Secondary (30%) | #FFFFFF (neutral-white) | Cards, surfaces, modals, input backgrounds | Elevated surfaces |
| Accent (10%) | #C67B5C (terracotta / primary-500) | CTA buttons, selected states, progress bars, links, brand elements | CTAs + selections |
| Brand Gradient | #C67B5C to #B5A08C | Summary cards, hero sections | Decorative |

### Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| Success | #5B8A72 | Quality score "good", aligned indicators, complete checkmarks |
| Warning | #D9A441 | Quality score "acceptable", slight misalignment |
| Error / Destructive | #C44536 | Validation errors, quality score "poor", off-alignment |
| WeChat | #07C160 | WeChat login button background |
| Info | #7B8FA2 | Secondary information |

### Text Colors

| Role | Hex | Usage |
|------|-----|-------|
| Primary text | #1A1A18 (neutral-900) | Headlines, body text |
| Secondary text | #52524D (neutral-600) | Subtitles, descriptions |
| Tertiary text | #73736D (neutral-500) | Hints, metadata, step counters |
| Inverse text | #FFFFFF | On accent backgrounds, buttons |

### Reference Line Colors (Camera Overlay)

| Status | Hex | Meaning |
|--------|-----|---------|
| Aligned / Good | #4CAF50 | Body part correctly positioned |
| Slight off | #FFC107 | Minor adjustment needed |
| Off / Adjust | #F44336 | Major adjustment needed |

### Color Season Visualization

| Season | Gradient Direction | Representational Color |
|--------|-------------------|----------------------|
| Spring | Warm, light | Peach / coral tones |
| Summer | Cool, light | Muted lavender / dusty rose |
| Autumn | Warm, deep | Amber / burnt sienna |
| Winter | Cool, deep | Navy / deep teal |

Accent reserved for: CTA buttons (login, next step, submit quiz), selected state fills (gender cards, age pills, quiz image selections), progress bar fills, brand logo background, primary link text, share poster buttons. Never used for decorative backgrounds or large surface areas.

---

## Screen-by-Screen Visual Contracts

### 1. LoginScreen

**Layout:** SafeAreaView, vertical stack -- header (back button) + brand section (logo + name) + form + social buttons + register link.

| Element | Specification |
|---------|--------------|
| Brand logo | 72x72 rounded-xl, terracotta background, white shirt icon |
| Brand name | 22px bold, terracotta color, letter-spacing 1.2 |
| Screen title | 32px bold, neutral-900 |
| Subtitle | 16px regular, neutral-600, mt-8 mb-32 |
| Input group | Row, neutral-50 background, border-radius 12, px-16 py-14, icon + text input |
| Input text | 16px regular, neutral-900 |
| Placeholder | neutral-500 (tertiary) |
| Primary CTA | Terracotta background, white text 16px semibold, border-radius 12, min-height 52, brand shadow |
| Disabled state | primaryLight background, opacity reduction |
| Divider | Row with lines + "or" text, neutral-200 lines |
| WeChat button | #07C160 background, white icon + text 16px semibold, min-height 52 |
| Phone login button | Transparent bg, terracotta border, terracotta text |
| Register link | 14px, terracotta color, centered |

**Copywriting:**
- Title: "welcome back" / Subtitle: "log in to your account"
- CTA: "log in"
- WeChat: "WeChat one-click login"
- Phone: "phone number login"
- Register: "don't have an account? register now"
- Forgot: "forgot password?"

### 2. PhoneLoginScreen

**Layout:** Same visual structure as LoginScreen, but with phone number input + SMS code + countdown timer.

| Element | Specification |
|---------|--------------|
| Phone input | Same input-group style, phone icon, numeric keyboard |
| Code input | Same input-group style, 6-digit, numeric keyboard |
| Send code button | Terracotta text, countdown timer "resend (60s)" |
| CTA | Same primary button, "login" |
| WeChat fallback | Same WeChat button from LoginScreen |

**Copywriting:**
- Title: "phone number login" / Subtitle: "log in or register with your phone number"
- CTA: "log in / register"
- Send code: "send verification code" / "resend ({n}s)"
- Phone placeholder: "please enter your phone number"
- Code placeholder: "verification code"
- Error: "please enter a valid phone number" / "please enter the verification code"
- Network error: "network connection failed, please check and retry"

### 3. OnboardingWizard

**Layout:** SafeAreaView -- progress bar (top) + step title + content area (flex: 1) + footer bar (back / skip / next).

| Element | Specification |
|---------|--------------|
| Progress track | 3px height, neutral-200, full width, rounded-full |
| Progress fill | Terracotta, animated width with spring (damping 15, stiffness 120) |
| Step counter | 12px medium, neutral-500, min-width 36 |
| Step title | 20px semibold, neutral-900 |
| Step transitions | SlideInRight / SlideOutLeft via reanimated |
| Back button | Row, arrow-back icon 20px + "previous step" 14px medium, neutral-600 |
| Skip button | 14px medium, neutral-500 text |
| Next button | Terracotta bg, row, "next step" 16px semibold white + arrow-forward 18px, border-radius xl, min-height 52, brand shadow |
| Disabled next | opacity 0.4 |
| Footer padding | px-20, py-16, pb-24 (safe area) |

**Copywriting:**
- Steps: "basic information" / "upload photo" / "style test" / "setup complete"
- Next: "next step" (non-last) or implied complete
- Back: "previous step"
- Skip: "skip"

### 4. BasicInfoStep (Onboarding Step 1)

**Layout:** Step header + scrollable form -- gender cards + age pills + height/weight inputs.

| Element | Specification |
|---------|--------------|
| Step title | 26px bold, neutral-900, letter-spacing -0.5, line-height 34 |
| Step subtitle | 15px regular, neutral-600, mt-8, line-height 22 |
| Section label | 13px medium, neutral-600 + red asterisk (required) or "optional" tag |
| Gender cards | Row, flex-1 each, neutral-50 bg, border-radius xl, py-16, centered icon 24px + label 14px medium |
| Gender selected | Terracotta bg, white icon + text |
| Age pills | Horizontal scroll, neutral-50 bg, rounded-full, px-20 py-12, 14px medium |
| Age selected | Terracotta bg, white text |
| Height/weight input | Row, flex-1 each, neutral-50 bg, border-radius lg, px-12, height 48, border neutral-200, unit suffix 14px neutral-500 |
| Error text | 12px, error color, mt-8 |

**Copywriting:**
- Title: "basic information"
- Subtitle: "help us understand your basics for more precise recommendations"
- Gender options: "male" / "female" / "other"
- Age ranges: "18-24" / "25-30" / "31-40" / "41-50" / "50+"
- Height/weight: "height / weight" label, "optional" tag
- Height placeholder: "170" + "cm" unit
- Weight placeholder: "65" + "kg" unit
- Validation: "please select gender" / "please select age range"

### 5. PhotoStep (Onboarding Step 2)

**Layout:** Full screen camera view with SVG reference line overlay + privacy promise + quality feedback modal.

| Element | Specification |
|---------|--------------|
| Camera view | Full screen, camera feed |
| Reference overlay | SVG body outline (dashed polygon), shoulder line, waist line, center line -- colors: green (aligned), yellow (slight), red (off) |
| Pose text hint | White text with dark overlay strip, bottom of camera view |
| Privacy promise | Icon + text strip, "this photo is only used for body analysis and try-on effects generation" |
| Quality feedback modal | Centered card, dark overlay, white card bg, score circle (100x100, 4px border, color by score), issue list with severity icons |
| Quality score colors | Green (#4CAF50) >70, Yellow (#FFC107) 40-70, Red (#F44336) <40 |
| Retake button | neutral-600 bg, white text, camera icon, height 48, border-radius 12 |
| Continue button | Terracotta bg, white text, height 48, border-radius 12 |
| Gallery option | Bottom-left floating button, images icon |

**Copywriting:**
- Pose hints: "please face the camera directly" / "please stand up straight" / "please move slightly to the left" / "please move slightly to the right"
- Privacy: "this photo is only used for body analysis and try-on effects generation"
- Quality good: "photo quality is good"
- Quality issues title: "the following issues were found"
- Quality issues: "blurry" / "too dark" / "too bright" / "background cluttered" / "body obscured"
- Retake: "retake"
- Continue: "continue" (good) / "continue anyway" (issues)
- Loading: "analyzing photo quality..."

### 6. StyleTestStep / StyleQuizScreen

**Layout:** Full screen, progress bar top + question title + 2-column image grid + bottom bar with prev/next buttons.

| Element | Specification |
|---------|--------------|
| Background | neutral-50 |
| Quiz progress | Custom QuizProgress component, current step / total steps |
| Question title | h3 style (24px semibold, neutral-900) |
| Question subtitle | body style (16px regular, neutral-500) |
| Image grid | 2 columns, row wrap, mx-(-8), each item 50% width px-8 mb-16 |
| Image card | QuizImageCard, selectable, border highlight on selected |
| Selected state | Terracotta border or ring |
| Bottom bar | Row, white bg, border-top neutral-200, shadow md, safe area bottom padding |
| Previous button | Flex-1, neutral-100 bg, neutral-700 text, height 48, border-radius lg |
| Next button | Flex-1, primary-500 bg, white text, height 48, border-radius lg, ml-12 |
| Disabled buttons | opacity 0.4 |
| Last question CTA | "view results" instead of "next question" |
| Loading | centered ActivityIndicator + "loading style test..." |
| Error | centered error text + retry button |

**Copywriting:**
- Loading: "loading style test..."
- Error: "{error message}" + "retry" button
- Previous: "previous step"
- Next: "next question" / "view results" (last)
- Question format: title + optional subtitle describing the choice dimension

### 7. QuizResultScreen

**Layout:** Scrollable report -- confetti header + style tags + color palette + occasion preferences + confidence score + action buttons.

| Element | Specification |
|---------|--------------|
| Background | theme.colors.background (neutral-50) |
| Header confetti | 12 colored dots, absolute positioned, 60-70% opacity |
| Title | 28px bold, neutral-900, centered, "your style profile" |
| Subtitle | 14px regular, neutral-600, centered |
| Section titles | 16px semibold, neutral-900 |
| Style tags | Row wrap, gap 8, each tag px-16 py-8, rounded-2xl, rotating colors (terracotta, sage, accent, rose, sky, emerald), white text 14px medium |
| Color palette | Row wrap, gap 12, each swatch 40x40 circle + hex label 10px neutral-500 |
| Occasion items | Row, gap 12, py-8 px-12, white bg, border, border-radius lg, icon 20px primary + text 15px |
| Confidence circle | 120x120, 8px border ring, neutral-200 track, primary fill |
| Confidence value | 32px bold, primary color |
| Confidence unit | 16px semibold, primary |
| Confidence label | 13px, neutral-600 |
| Primary button | Terracotta bg, py-16, border-radius xl, "view full profile" 16px semibold white |
| Outlined button | Row centered, py-16, border-radius xl, 1.5px terracotta border, share icon + "share" 16px semibold terracotta |
| Retake button | py-12, centered, "retake test" 14px neutral-500 underline |
| Animations | FadeInUp with staggered delays (0, 100, 200, 300, 400, 500ms) |

**Copywriting:**
- Title: "your style profile"
- Subtitle: "based on your selections, AI has generated your exclusive style analysis"
- Sections: "style tags" / "color preferences" / "occasion preferences" / "match degree"
- Confidence label: "style match confidence"
- CTA: "view full profile"
- Share: "share"
- Retake: "retake test"
- Share message: "I completed the style test on AiNeed! My style tags: {tags joined}"

### 8. ProfileReportScreen

**Layout:** Header + scrollable content -- summary card (gradient) + body type card + color season card + style tags card + share poster preview + bottom share bar.

| Element | Specification |
|---------|--------------|
| Header | Row, back chevron + "style profile report" 18px bold + spacer, white bg, bottom hairline border, xs shadow |
| Summary card | LinearGradient coralRose (#FF6B6B to #FF8E8E), border-radius 24, p-24, lg shadow |
| Avatar | 64x64 circle, white 30% bg, initial 24px bold white, 2px white 50% border |
| User name | 20px bold, white |
| Personality line | 14px medium, white 90% opacity |
| Completion bar | 6px height track (white 30%), white fill, border-radius 3 |
| Completion text | 12px medium, white 85% |
| Collapsible cards | BodyTypeCard, ColorSeasonCard, StyleTagsCard with toggle |
| Share poster | SharePosterPreview component |
| Bottom bar | Fixed, white bg, hairline top border, md shadow, px-20, py-16 |
| Share button | LinearGradient oceanDeep (#167FFB to #33AAFF), row, icon + text, border-radius xl |
| Empty state | Centered, color-wand icon 64px neutral-300, title, subtitle, gradient CTA button |
| Loading | Centered spinner + "generating your style profile..." |

**Copywriting:**
- Screen title: "style profile report"
- Loading: "generating your style profile..."
- Empty title: "profile not yet complete"
- Empty subtitle: "complete your body shape and color information to unlock your exclusive style profile report"
- Empty CTA: "go to complete profile"
- Share CTA: "share my style profile"
- Completion: "profile completion degree {n}%"

### 9. SharePosterPreview

**Layout:** Card component within ProfileReportScreen showing a poster preview with user info + style results.

| Element | Specification |
|---------|--------------|
| Poster card | White bg, border-radius 2xl, shadow, brand-themed border or gradient accent |
| User info | Avatar + nickname + personality line |
| Body type badge | Pill/tag with body type name |
| Color season badge | Pill/tag with color season name + representative color swatch |
| Style tags | Small tag chips |
| QR code / watermark | AiNeed branding in footer area of poster |

---

## Copywriting Contract

All UI copy is in Simplified Chinese. The tone is warm, encouraging, and fashion-forward -- targeting young Chinese fashion-conscious users (18-35).

| Element | Copy (Chinese) | Context |
|---------|----------------|---------|
| Primary CTA (login) | "login" | LoginScreen |
| Primary CTA (register) | "register" | RegisterScreen |
| Primary CTA (onboarding) | "next step" | OnboardingWizard footer |
| Primary CTA (quiz) | "next question" / "view results" | StyleQuizScreen |
| Primary CTA (profile) | "view full profile" | QuizResultScreen |
| Primary CTA (share) | "share my style profile" | ProfileReportScreen |
| Skip option | "skip" | Photo step, Style test step |
| Empty state (profile) | "profile not yet complete" + "complete your body shape and color information to unlock your exclusive style profile report" + "go to complete profile" | ProfileReportScreen empty |
| Empty state (quiz) | "{error message}" + "retry" button | StyleQuizScreen error |
| Error (network) | "network connection failed, please check and retry" | All screens |
| Error (validation) | "please select {field}" | BasicInfoStep |
| Error (quality) | "the following issues were found" + issue list | PhotoQualityFeedback |
| Loading (quiz) | "loading style test..." | StyleQuizScreen |
| Loading (profile) | "generating your style profile..." | ProfileReportScreen |
| Loading (analysis) | "analyzing photo quality..." | PhotoStep |
| Destructive (delete photo) | "confirm delete" + "are you sure you want to delete this photo? This action cannot be undone." | ProfileScreen photo management |
| Privacy promise | "this photo is only used for body analysis and try-on effects generation" | PhotoStep |

---

## Interaction Patterns

### Onboarding Flow

```
LoginScreen --> PhoneLoginScreen (or WeChat direct)
    --> OnboardingWizard
        --> Step 1: BasicInfoStep (REQUIRED -- gender + age range)
        --> Step 2: PhotoStep (OPTIONAL -- camera/gallery + quality check)
        --> Step 3: StyleTestStep (OPTIONAL -- 5-8 image selection questions)
        --> Step 4: CompleteStep (transition to MainTabs)
```

### Quiz Answer Flow

1. Question loads with FadeInUp animation
2. User taps an image card -- immediate visual selection feedback (border highlight)
3. Selection auto-saved to backend (D-15) with response duration tracking
4. "Next question" button becomes active
5. On last question, CTA changes to "view results"
6. Results submitted, navigate to QuizResultScreen

### Photo Capture Flow

1. Camera opens with SVG reference line overlay
2. User positions body within outline -- lines change color (red/yellow/green)
3. User captures or selects from gallery
4. Quality analysis runs -- score displayed in modal
5. If acceptable: "continue" to next step
6. If issues: user can "retake" or "continue anyway"

### Progress Persistence

- Onboarding step persisted in onboardingStore
- Quiz progress auto-saved per question (backend + Redis cache)
- Resume from last position on app reopen

### Animation Conventions

| Context | Animation | Duration |
|---------|-----------|----------|
| Step transition | SlideInRight / SlideOutLeft | 350ms / 250ms |
| Card entrance | FadeInUp | 500-600ms, spring |
| Progress bar | Spring animation | damping 15, stiffness 120 |
| Reference lines | Opacity fade in | 500ms |
| Quality feedback | Spring slide + opacity | friction 8, tension 50 |
| Quiz result sections | Staggered FadeInUp | 600ms, delays 0-500ms |

---

## Component Inventory

### Existing Components (Reuse)

| Component | Location | Phase 1 Usage |
|-----------|----------|---------------|
| OnboardingWizard | screens/onboarding/ | Main wizard shell |
| BasicInfoStep | screens/onboarding/steps/ | Step 1 -- gender + age |
| PhotoStep | screens/onboarding/steps/ | Step 2 -- photo upload |
| StyleTestStep | screens/onboarding/steps/ | Step 3 -- quiz entry |
| CompleteStep | screens/onboarding/steps/ | Step 4 -- completion |
| StyleQuizScreen | screens/style-quiz/ | Full quiz UI |
| QuizResultScreen | screens/style-quiz/ | Results display |
| QuizProgress | screens/style-quiz/components/ | Progress indicator |
| QuizImageCard | screens/style-quiz/components/ | Selectable image card |
| ProfileReportScreen | screens/profile/ | Full report |
| BodyTypeCard | screens/profile/components/ | Body analysis section |
| ColorSeasonCard | screens/profile/components/ | Color season section |
| StyleTagsCard | screens/profile/components/ | Style preferences section |
| SharePosterPreview | screens/profile/components/ | Poster preview |
| ReferenceLineOverlay | screens/photo/components/ | Camera SVG overlay |
| PhotoQualityFeedback | screens/photo/components/ | Quality score modal |
| LoginScreen | screens/ | Email + WeChat login |
| RegisterScreen | screens/ | Registration form |
| PhoneLoginScreen | screens/ | Phone + SMS login |
| EmptyState | components/emptyList/ | Guided empty states |
| ImageWithPlaceholder | components/common/ | Progressive image loading |
| BodySilhouette | components/charts/ | Body proportion SVG |
| ColorPalette | components/charts/ | Color swatch display |
| ProfileCompletionBanner | screens/home/components/ | Homepage profile prompt |
| ErrorBoundary | components/ErrorBoundary/ | Error handling wrapper |

### New Components Needed

| Component | Purpose | Priority |
|-----------|---------|----------|
| WechatLoginButton | Standalone WeChat auth button | High |
| SmsCodeInput | Phone verification code input with countdown | High |
| PoseGuideText | Animated pose instruction text overlay | Medium |
| ColorSeasonWheel | Season type visualization (spring/summer/autumn/winter) | Medium |
| BodyProportionChart | Visual body proportion diagram | Medium |
| SharePosterCanvas | Canvas-based poster generation trigger | Medium |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | not applicable | React Native project -- no shadcn |
| npm packages | react-native-paper, react-native-svg, react-native-reanimated, react-native-body-highlighter (new), expo-auth-session (new) | All verified in npm registry, reviewed source |

No third-party shadcn registries. New npm packages listed in RESEARCH.md Standard Stack section. All versions verified against npm registry on 2026-04-13.

---

## Cross-Cutting UX Rules (from CONTEXT.md CC-11 through CC-18)

| Rule | Implementation |
|------|----------------|
| CC-11 Guided empty states | Every empty state has icon + description + action button |
| CC-12 Skeleton loading | List screens use skeleton placeholders (not spinners) |
| CC-13 Light mode only | All colors from light theme tokens. Dark tokens exist in design-tokens.ts but NOT used in Phase 1 |
| CC-14 Network errors | "network is not working" + retry button, no offline cache |
| CC-15 Progressive image loading | Thumbnail first, then full resolution (ImageWithPlaceholder component) |
| CC-16 FlashList | Shopify FlashList for any list views (not FlatList) |
| CC-17 Accessibility | accessibilityLabel on all interactive elements, accessibilityRole="button" |
| CC-18 Unified retry | Every network-dependent action has a retry button |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
