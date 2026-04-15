# AUDIT-THEME.md — 主题审计

**Date:** 2026-04-15

## Executive Summary

| Issue | Severity | Count |
|-------|----------|-------|
| Hardcoded hex colors | CRITICAL | 865 across 100 files |
| Hardcoded rgba colors | CRITICAL | 256 across 78 files |
| Hardcoded font sizes | CRITICAL | 772 across 100 files |
| Hardcoded spacing values | CRITICAL | 1,481 across 100 files |
| Two competing ThemeProviders | CRITICAL | 2 |
| Typography size conflict | HIGH | DesignTokens vs typography.ts |
| Missing dark mode tokens | HIGH | 6+ palettes |
| Six different "purple" values | HIGH | No semantic distinction |
| Missing feature color tokens | MEDIUM | 8+ feature domains |

## Critical Findings

### 1. Two Competing ThemeProviders
- **ThemeContext.tsx**: Uses DesignTokens/darkTokens (warm-toned neutral: #FAFAF8, #1A1A18)
- **ThemeSystem.tsx**: Defines own lightColors/darkColors (cool-toned zinc: #FAFAFA, #18181B)
- Screens importing from different providers get different colors

### 2. Hardcoded Color Scale
| Color | Occurrences | Should Map To |
|-------|-------------|---------------|
| #FFFFFF/#fff | ~80+ | DesignTokens.colors.neutral.white |
| #C67B5C | ~15+ | DesignTokens.colors.brand.terracotta |
| #6C5CE7 | ~15+ | No token exists (blogger purple) |
| #1A1A1A | ~10+ | DesignTokens.colors.neutral[900] |
| #888/#999/#666 | ~20+ | DesignTokens.colors.neutral[400-700] |
| #F0F0F0/#E0E0E0 | ~10+ | DesignTokens.colors.neutral[200-300] |

### 3. Typography Size Conflict
| Semantic Name | DesignTokens | typography.ts | Delta |
|---------------|-------------|-------------|-------|
| sm | 12 | 14 | +2 |
| base | 14 | 16 | +2 |

### 4. Missing Dark Mode Tokens
- WarmPrimaryColors: No dark variants
- PrimaryColors scale: No dark variants
- FashionColors: No dark variants
- ColorSeasons backgrounds: Same reference in light/dark (light bg on dark surface)
- Colors object in theme/index.ts: No dark mode variant
- theme.colors flat object: No dark mode variant

### 5. Six Different "Purple" Values
| Source | Value | Context |
|--------|-------|---------|
| theme.colors.purple | #9C27B0 | theme/index.ts |
| Colors.accent.500 | #8B5CF6 | theme/index.ts |
| ThemeSystem accent | #667EEA | ThemeSystem.tsx |
| GradientPresets.elegantPurple | #9C27B0, #673AB7 | colors.ts |
| Hardcoded in screens | #6C5CE7 | BloggerBadge etc. |
| FlowAnimations accent | #A855F7 | rgba(168,85,247) |

### 6. Missing Feature Color Tokens
- Blogger: purple, gold, purpleBg
- Payment: alipay blue, wechat green
- Order status: processing, shipped
- Notification types: 7+ colors
- Cart: discount, disabled, bg
- Home hero gradients
- Swipe card overlays

### 7. ThemeSystem.tsx Internal Hardcoding
74 hardcoded hex colors + 2 hardcoded rgba values in the theme system itself.

### 8. ColorSeasons Dark Mode Issue
`darkTokens.colors.colorSeasons` is the SAME object reference as light mode. Spring background #FFF5F0 will appear on dark surfaces.

## Recommendations

1. Unify ThemeProviders — deprecate ThemeSystem.tsx provider, migrate accent feature into ThemeContext
2. Create codemod for top 20 most-repeated hardcoded colors
3. Add missing font size tokens (13px, 15px, 17px, 22px)
4. Add dark mode variants for all extended palettes
5. Add feature-specific color tokens
6. Resolve typography.ts vs DesignTokens size conflict
7. Consolidate "purple" into single semantic tokens
