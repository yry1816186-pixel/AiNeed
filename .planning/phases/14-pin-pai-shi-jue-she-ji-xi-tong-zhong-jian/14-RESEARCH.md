# Phase 14 Research: 品牌视觉 + 设计系统重建

**Researched:** 2026-04-28
**Phase Goal:** 建立完整的品牌视觉资产体系和三层 Design Token 系统，替换损坏的 ThemeManager，实现暗色模式独立设计

## 1. Standard Stack

### Token Build Pipeline: Style Dictionary

**Choice:** Style Dictionary (industry standard, 691 code examples, extensible)

- **Why not custom:** Style Dictionary provides YAML parser registration, reference resolution (`{colors.brand.primary}`), multi-platform output, and W3C Design Token Community Group format compatibility out of the box
- **Why not Theo:** Theo is Salesforce-internal, less maintained. Style Dictionary has broader ecosystem (Amazon, Adobe)
- **YAML → TS flow:** Register custom YAML parser → define tokens in 6 YAML files → configure TypeScript platform output → run `style-dictionary build`
- **Config:** `config.json` with `source: ['tokens/**/*.yaml']` and `platforms.ts` format output
- **Token references:** Use `{path.to.token}` syntax for cross-file references (e.g., semantic tokens referencing primitives)

### Theme Store: Zustand v5 + react-native-mmkv

**Already installed:** `zustand: ^5.0.5`

**Need to install:** `react-native-mmkv` (v3.x) — fast key-value storage with sync reads, no async bridge overhead

- **Why MMKV over AsyncStorage:** Sync reads (no flicker on startup), 30x faster, smaller bundle, built-in TypeScript types
- **Why not redux-persist:** Zustand is already in the project, persist middleware is built-in, MMKV integrates via `createJSONStorage(() => mmkvStorage)`
- **Store shape:**
  ```typescript
  interface ThemeStore {
    mode: "light" | "dark" | "system";
    resolvedMode: "light" | "dark"; // computed from system when mode='system'
    colors: ResolvedColorPalette; // full semantic color map for current mode
    setMode: (mode: ThemeMode) => void;
  }
  ```
- **Persistence:** `persist` middleware with MMKV storage, `partialize: (state) => ({ mode: state.mode })` — only persist mode preference, colors are derived
- **System listener:** `Appearance.addChangeListener` in store initializer, updates `resolvedMode` on system change

### Splash Animation: lottie-react-native

**Already installed:** `lottie-react-native: ^7.3.6`

- **Design constraints:** ≤1.5s duration, ≤500KB file size, brand terracotta red color reveal + logo text fade-in
- **Lottie file creation:** Use After Effects + Bodymovin or Figma → LottieFiles plugin. For code-gen approach, can use `lottie-api` to programmatically create simple animations
- **Integration:** Load in `expo-splash-screen` controlled fade-out, or custom `<SplashScreen>` component that auto-hides after animation completes
- **Dark mode variant:** Two Lottie files (light/dark) or dynamic color replacement via Lottie's `colorAssets` API

### WCAG AA Contrast Verification

- **Tool:** `color-blend` + custom contrast ratio calculator, or use `wcag-contrast` npm package
- **Verification approach:** Script that reads all semantic token pairs (text-on-background) and validates 4.5:1 ratio
- **Critical fix needed:** Current terracotta #C67B5C → 3.29:1 on white (FAILS). CONTEXT.md D-01 specifies terracottaDark #A86548 (4.56:1) for text, terracotta #C67B5C kept for large/non-text (3:1 AA Large passes)

## 2. Architecture Patterns

### Three-Layer Token Architecture

```
Layer 1: Primitive (raw values, no semantics)
  colors.red.500: "#C44536"
  spacing.4: 16

Layer 2: Semantic (functional meaning)
  colors.interactive.primary: "{colors.brand.terracotta.500}"
  spacing.component.cardPadding: "{spacing.4}"

Layer 3: Component (component-specific)
  colors.button.primary.background: "{colors.interactive.primary}"
  spacing.button.paddingHorizontal: "{spacing.component.cardPadding}"
```

**File structure:**

```
tokens/
  primitives/
    colors.yaml      # brand palette + neutral + extended
    spacing.yaml     # 4px grid scale (0-128)
    typography.yaml  # font families, sizes, weights, line heights
    radius.yaml      # border radius scale (none-full)
    shadows.yaml     # elevation levels
    motion.yaml      # duration, easing, spring configs
  semantics/
    colors.yaml      # surface/text/interactive/status mappings
    spacing.yaml     # component-level spacing defaults
    typography.yaml  # heading/body/caption/overline styles
    radius.yaml      # component-level radius defaults
    shadows.yaml     # semantic elevation (card/modal/dropdown)
    motion.yaml      # transition presets (fast/medium/slow, spring configs)
  components/
    button.yaml
    card.yaml
    input.yaml
    avatar.yaml
    badge.yaml
    bottom-sheet.yaml
    toast.yaml
```

### Dual-Mode Color Resolution

```typescript
// semantic/colors.yaml
surface:
  primary:
    light: "{primitives.colors.neutral.white}"
    dark: "{primitives.colors.neutral.900}"
text:
  primary:
    light: "{primitives.colors.neutral.900}"
    dark: "{primitives.colors.neutral.50}"
interactive:
  primary:
    light: "{primitives.colors.brand.terracotta.500}"
    dark: "{primitives.colors.brand.coral.400}"  # dark mode uses coral accent
```

**Style Dictionary transforms:**

- Register custom `color/light` and `color/dark` transform that extracts the correct mode value
- Generate two TS objects: `lightTokens` and `darkTokens`
- Store resolves to the correct set based on `resolvedMode`

### Legacy Token Bridge

```typescript
// design-system/theme/tokens/legacy-map.ts
export const legacyTokenMap = {
  "DesignTokens.colors.brand.terracotta": "tokens.colors.interactive.primary",
  "DesignTokens.colors.neutral.900": "tokens.colors.text.primary",
  "DesignTokens.spacing.xl": "tokens.spacing.8",
  // ... generated from diff of old vs new token names
} as const;

// Re-export old names for backward compatibility
export const DesignTokens = {
  colors: {
    brand: {
      terracotta: legacyTokenMap["DesignTokens.colors.brand.terracotta"],
      // ...
    },
  },
};
```

This ensures all existing imports (`import { DesignTokens } from '@/design-system/theme'`) continue to work while migration happens.

## 3. Don't Hand-Roll

1. **Token generation** — Use Style Dictionary, not custom YAML parser + TS template
2. **Theme persistence** — Use Zustand persist middleware + MMKV storage adapter, not manual AsyncStorage calls
3. **Color contrast validation** — Use `wcag-contrast` npm package, not manual luminance calculation
4. **Lottie animation** — Design in After Effects/Figma, export via Bodymovin. Don't try to create Lottie JSON by hand
5. **System appearance detection** — Use `Appearance` API from React Native, not custom native module

## 4. Common Pitfalls

1. **Style Dictionary YAML references across files** — Must include all files in `source` glob; cross-file references like `{primitives.colors.brand.500}` require files to be in the same source set
2. **MMKV initialization timing** — Must initialize MMKV instance before creating Zustand store. Initialize in app entry point (index.js or App.tsx) before React tree renders
3. **Lottie file size** — Complex After Effects animations can easily exceed 500KB. Use simple shape layers, minimize keyframes, avoid precomps
4. **Dark mode flash on startup** — MMKV sync reads prevent this, but the store must be created before the first render. Use Zustand's `skipHydration` + manual rehydration if needed
5. **Legacy import paths** — Both `@/design-system/theme` and `@/theme` are used across the codebase. The legacyTokenMap must handle both paths
6. **Color contrast in dark mode** — Don't just invert brightness. Warm dark grays (#1A1A18) need different text colors than cool dark grays (#1A1A2E). The coral accent in dark mode must also pass AA
7. **Style Dictionary TypeScript output format** — The built-in `javascript/es6` format exports plain objects. For TypeScript with proper types, need a custom format or use `typescript/es6-ds` from style-dictionary-utils
8. **React Native Appearance API** — `Appearance.getColorScheme()` returns the value at call time; `Appearance.addChangeListener` is the reactive API. Must clean up listener on unmount
9. **Zustand v5 breaking changes** — `create` no longer needs currying in v5; `create<T>()(...)` pattern still works but `create<T>(...)` is the new default

## 5. Validation Architecture

### Dimension: Token Coverage Verification

**Validation approach:** Script-based verification

1. **Primitive completeness:** Verify all 6 YAML files exist with required categories (Color/Typography/Spacing/Radius/Shadow/Motion)
2. **Semantic coverage:** Verify every semantic token has both `light` and `dark` variants
3. **Component token completeness:** Verify all 7 component types (button/card/input/avatar/badge/bottom-sheet/toast) have complete token sets
4. **Legacy bridge integrity:** Automated test that imports `DesignTokens` from old path and verifies all keys exist

### Dimension: Contrast Validation

**Validation approach:** Automated script

```typescript
// Run as part of token build pipeline
const contrastPairs = [
  { fg: "text.primary.light", bg: "surface.primary.light", minRatio: 4.5 },
  { fg: "text.secondary.light", bg: "surface.primary.light", minRatio: 4.5 },
  // ... all semantic text+surface pairs for both modes
];
```

### Dimension: Theme Store Verification

**Validation approach:** Unit tests

1. Mode toggle (light → dark → system → light)
2. System appearance change propagation when mode='system'
3. MMKV persistence survives store recreation
4. Resolved colors match expected palette for each mode

## 6. Security Considerations

- No trust boundaries in this phase — purely visual/design system work
- No user input handling, no API calls, no authentication changes
- Theme preference is local-only data (no PII, no network transmission)
- STRIDE assessment: Low-risk phase, all changes are client-side static assets and configuration

## 7. Key Decisions for Planner

1. **Style Dictionary vs custom YAML→TS:** Style Dictionary (recommended, industry standard)
2. **MMKV vs AsyncStorage:** MMKV (sync reads, faster, already recommended in CONTEXT.md)
3. **Lottie creation method:** Design tool export (not code-gen)
4. **Token file count:** 6 primitive + 6 semantic + 7 component = 19 YAML files
5. **Legacy bridge approach:** Re-export map from old import paths, not file-by-file migration
6. **Existing imports to preserve:** ~150 files import from `@/design-system/theme`, ~80 files import from `@/theme`

---

_Research complete. Ready for planning._
