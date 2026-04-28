# XUNO Brand Guidelines

## 1. Brand Overview

**XUNO** is an AI-powered personal styling companion that helps users express their authentic style through wardrobe intelligence. Our visual identity is warm, confident, and fashion-forward — like an opinionated friend who always knows what works.

**Personality traits:** Warm, Confident, Fashionable, Approachable, Body-Positive

**Brand voice:** Direct but kind. Expert but not pretentious. Uses "你" not "您" — intimate, not formal.

---

## 2. Logo

### Variants

| Variant    | Use Case                                      | File                  | Min Size   |
| ---------- | --------------------------------------------- | --------------------- | ---------- |
| Horizontal | Headers, nav bars, email signatures           | `logo-horizontal.svg` | 120px wide |
| Square     | App icons, avatars, favicons, social profiles | `logo-square.svg`     | 48x48      |
| Monochrome | Watermarks, etching, dark backgrounds         | `logo-monochrome.svg` | 80px wide  |

### Design Language

The XUNO wordmark uses geometric letterforms with subtle textile curve references:

- **X**: Angular with a subtle fabric fold element
- **U**: Echoes a collar/neckline curve
- **N, O**: Clean geometric sans-serif forms

### Clear Space

Maintain minimum clear space equal to the height of the "X" character around all sides of the logo. Never crop, rotate, or distort the logo.

### Do's and Don'ts

- ✅ Use on brand-colored backgrounds
- ✅ Maintain aspect ratio
- ✅ Use monochrome version on photographic backgrounds
- ❌ Never apply drop shadows or gradients to the logo
- ❌ Never use the logo at sizes below the minimum
- ❌ Never stretch or skew the logo

---

## 3. Color Palette

### Primary Brand Color

| Name               | Hex       | RGB              | Usage                                                |
| ------------------ | --------- | ---------------- | ---------------------------------------------------- |
| **Terracotta Red** | `#C44536` | rgb(196, 69, 54) | Brand accent, CTAs, interactive primary (light mode) |

### Secondary Colors

| Name      | Hex       | Usage                               |
| --------- | --------- | ----------------------------------- |
| **Sage**  | `#8B9A7D` | Secondary interactive, nature tones |
| **Camel** | `#B5A08C` | Warm neutral accents                |
| **Slate** | `#7B8FA2` | Informational, link text            |

### Neutral Scale (Light Mode)

| Role              | Hex       | Usage                             |
| ----------------- | --------- | --------------------------------- |
| Surface Primary   | `#FFFFFF` | Main backgrounds                  |
| Surface Secondary | `#FAFAF8` | Card backgrounds, subtle sections |
| Surface Tertiary  | `#F5F5F3` | Inset areas, input fields         |
| Text Primary      | `#1A1A18` | Headlines, body copy              |
| Text Secondary    | `#52524D` | Supporting text                   |
| Text Tertiary     | `#686862` | Captions, metadata                |
| Text Brand        | `#8A4E32` | Brand-colored text elements       |

### Neutral Scale (Dark Mode)

| Role                | Hex       | Usage                                       |
| ------------------- | --------- | ------------------------------------------- |
| Surface Primary     | `#1A1A18` | Main backgrounds                            |
| Surface Secondary   | `#161412` | Card backgrounds                            |
| Surface Tertiary    | `#201E1C` | Inset areas                                 |
| Text Primary        | `#F5F2ED` | Headlines, body copy                        |
| Text Secondary      | `#B8B0A8` | Supporting text                             |
| Interactive Primary | `#FF9090` | CTAs, active states (coral, NOT terracotta) |

### Semantic Colors

| Status  | Primary   | Light Background |
| ------- | --------- | ---------------- |
| Success | `#5B8A72` | `#E8F3EE`        |
| Warning | `#D9A441` | `#FDF5E6`        |
| Error   | `#DC3545` | `#FDECEA`        |
| Info    | `#7B8FA2` | `#EEF1F4`        |

### Color Usage Rules

1. **Terracotta (#C44536)** is the brand accent — use sparingly for CTAs, key interactions, and brand moments
2. **Dark mode uses coral (#FF9090)** as interactive primary — terracotta fails contrast on dark surfaces
3. **Error uses cold red (#DC3545)** — never use brand terracotta for errors to avoid brand-negative association
4. **All text-on-background pairs pass WCAG AA 4.5:1** — see contrast validation tests

---

## 4. Typography Scale

### Font Families

| Role      | Font              | Fallback              |
| --------- | ----------------- | --------------------- |
| Primary   | System sans-serif | -apple-system, SF Pro |
| Monospace | System mono       | Menlo, Consolas       |

### Type Scale

| Token        | Size | Weight         | Line Height | Usage                      |
| ------------ | ---- | -------------- | ----------- | -------------------------- |
| `display-xl` | 36px | Bold (700)     | 1.15        | Hero headlines             |
| `display-lg` | 30px | Bold (700)     | 1.2         | Section headers            |
| `heading-lg` | 24px | SemiBold (600) | 1.3         | Card headers               |
| `heading-md` | 20px | SemiBold (600) | 1.35        | Sub-sections               |
| `heading-sm` | 18px | Medium (500)   | 1.4         | List headers               |
| `body-lg`    | 17px | Regular (400)  | 1.5         | Primary body text          |
| `body-md`    | 15px | Regular (400)  | 1.5         | Secondary body             |
| `body-sm`    | 13px | Regular (400)  | 1.45        | Tertiary text              |
| `caption`    | 12px | Medium (500)   | 1.35        | Labels, badges             |
| `overline`   | 11px | SemiBold (600) | 1.3         | Category labels (ALL CAPS) |

### Weight Usage

- **Bold (700):** Display headlines only
- **SemiBold (600):** Headings, CTAs, overlines
- **Medium (500):** Subheadings, captions, navigation
- **Regular (400):** Body text, descriptions

---

## 5. Spacing System

**Base unit: 4px**

| Token | Value | Usage                         |
| ----- | ----- | ----------------------------- |
| `xs`  | 4px   | Inline gaps, icon padding     |
| `sm`  | 8px   | Compact element spacing       |
| `md`  | 12px  | Standard element gaps         |
| `lg`  | 16px  | Section padding, card padding |
| `xl`  | 24px  | Section margins               |
| `2xl` | 32px  | Page margins                  |
| `3xl` | 48px  | Major section separators      |

### Component Spacing Defaults

- Card internal padding: `lg` (16px)
- Screen edge margins: `2xl` (32px)
- Stack gaps between items: `md` (12px)
- Form field gaps: `lg` (16px)

---

## 6. Icon Style

**Icon library:** Phosphor Icons (regular variant default)

**Customization:**

- Stroke weight: 1.5px (regular)
- Corner radius: Match system (rounded)
- Default size: 24x24
- Small variant: 20x20
- Large variant: 32x32
- Color: Inherit from parent text color
- Active state: Brand terracotta (#C44536)

**Consistency rules:**

- Always use the same variant within a screen
- Fill variant only for active/selected states
- Never mix icon styles (e.g., Phosphor with Material)

---

## 7. Illustration Style

**Direction:** Warm, fashion-forward, body-positive

**Guidelines:**

- Use warm terracotta/sage/camel tones — never cold blues or purples
- Depict diverse body types and skin tones
- Style: flat with subtle texture, organic shapes
- Avoid: stick figures, overly abstract, cold corporate
- Reference: cozy editorial fashion illustration

---

## 8. Decorative Patterns

**Brand motifs** for backgrounds, cards, and dividers:

1. **Fabric weave pattern** — Subtle overlapping curves suggesting textile weave
2. **Color bloom** — Terracotta radial gradient used in splash and hero sections
3. **Warm gradient bands** — Soft transitions between surface colors (never harsh lines)

**Usage:**

- Backgrounds: 3-6% opacity decorative elements
- Dividers: 1px lines in border.default color
- Card accents: Single terracotta accent line or dot

---

## 9. Photography Direction

**Style:** Natural light, warm tones, authentic moments

**Guidelines:**

- Prefer natural daylight or warm artificial lighting
- Skin tones should appear warm, never ashy or over-saturated
- Clothing shown on diverse models, real bodies
- Avoid: studio-white backgrounds, overly styled, cold blue tones
- Post-processing: warm color grade, slight film grain acceptable

---

## 10. Accessibility

### Contrast Requirements

All text-on-background color pairs must pass **WCAG AA 4.5:1** minimum contrast ratio:

- Light mode: validated across surface.primary, secondary, tertiary
- Dark mode: validated across dark surface.primary, secondary, tertiary
- Automated validation in `src/design-system/theme/__tests__/contrast.test.ts`

### Touch Targets

- Minimum tap target: 44x44px
- Recommended: 48x48px
- Spacing between interactive elements: minimum 8px

### Accessible Naming

- All interactive elements have accessibility labels
- Icons paired with text: label describes action, not icon
- Icons alone: `accessibilityLabel` describes purpose

### Color Independence

- Never use color alone to convey information
- Status indicators: pair color with icon or text
- Charts: use pattern fills + color

---

## Asset Reference

| Asset           | Location                                    |
| --------------- | ------------------------------------------- |
| Logo Horizontal | `assets/brand/logo-horizontal.svg`          |
| Logo Square     | `assets/brand/logo-square.svg`              |
| Logo Monochrome | `assets/brand/logo-monochrome.svg`          |
| Splash Light    | `assets/animations/splash-light.json`       |
| Splash Dark     | `assets/animations/splash-dark.json`        |
| Icon Generator  | `scripts/generate-app-icons.mjs`            |
| Color Resolver  | `src/design-system/theme/color-resolver.ts` |
| Theme Store     | `src/design-system/theme/themeStore.ts`     |
