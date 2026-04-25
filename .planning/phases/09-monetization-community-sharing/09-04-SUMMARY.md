---
phase: 09-monetization-community-sharing
plan: 04
status: done
commit: "166066e4"
---

# 09-04: Share Card Components + QR Encoder + Capture Hook

## What Was Done

### Task 1: QR Encoder + Hooks + Layout + QR Code Component (TDD)

**QR Encoder** (`utils/qr-encoder.ts`):

- `encodeMiniProgramPath()` generates mini-program paths from `ShareQRParams`
- Path format: `pages/share/index?r={first8chars}&t={o|t|r}[&c={first8chars}]`
- Guarantees path length under 128 characters
- 6 unit tests, all passing (TDD: RED then GREEN)

**useShareCapture** (`hooks/useShareCapture.ts`):

- `viewRef` for attaching to the capture target View
- `captureAndShare(title, message)` uses `react-native-view-shot` + `react-native-share`
- `saveToAlbum()` for saving to device album
- Cancel errors silently caught; other errors show Alert
- Uses `require()` pattern with try/catch for native module safety

**useSharePrivacy** (`hooks/useSharePrivacy.ts`):

- Manages try-on share privacy confirmation state
- `requestConfirmation()` / `confirm()` / `cancel()` flow
- `hasConfirmed` flag gates the share action

**ShareCardLayout** (`components/ShareCardLayout.tsx`):

- Common wrapper with content area + brand footer
- Brand footer: `#2D3436` charcoal background, "寻裳 XUNO" + "让 AI 帮你搭"
- QR code rendered in footer via ShareQRCode component
- Aspect ratio 3:4 (Xiaohongshu-optimized)
- Root View `collapsable={false}` for Android view-shot

**ShareQRCode** (`components/ShareQRCode.tsx`):

- Uses `react-native-qrcode-svg` with fallback placeholder
- Colors: `#2D3436` on `#FAFAF8`

### Task 2: Three Share Card Types

**OutfitShareCard** (`components/OutfitShareCard.tsx`):

- 2x2 grid layout for top/bottom/shoes/accessory items
- Scene tag with camel accent background
- Total price centered below grid
- Wraps ShareCardLayout with outfit-type QR path

**TryOnShareCard** (`components/TryOnShareCard.tsx`):

- Try-on image with 3:4 aspect ratio
- AI review section with "伊伊说" label
- Privacy gate via `useSharePrivacy` hook
- Modal with confirmation text: "分享图仅展示试衣效果，不会暴露真实照片"
- "分享试衣效果" button triggers privacy confirmation before sharing

**ReportShareCard** (`components/ReportShareCard.tsx`):

- Style type badge with terracotta accent
- Color palette circles (up to 6, 40px diameter, 8px spacing)
- Summary text (3 lines max)
- Wraps ShareCardLayout with report-type QR path

## Verification Results

- QR encoder tests: 6/6 passed
- TypeScript: 0 new errors in sharing module (10 pre-existing in StyleEvolutionChart.tsx)
- All 3 card components use ShareCardLayout with brand footer
- All root Views have `collapsable={false}`
- QR paths encode under 128 characters

## Files Created

```
apps/mobile/src/features/sharing/
  index.ts
  utils/
    qr-encoder.ts
    __tests__/
      qr-encoder.test.ts
  hooks/
    useShareCapture.ts
    useSharePrivacy.ts
  components/
    ShareCardLayout.tsx
    ShareQRCode.tsx
    OutfitShareCard.tsx
    TryOnShareCard.tsx
    ReportShareCard.tsx
```

## Dependencies Added

- `react-native-qrcode-svg` ^6.3.21
- `react-native-view-shot` ^4.0.3
- `expo-router` ^55.0.13 (devDep, needed for jest.setup.js)
- `expo-secure-store` ^55.0.13 (devDep, needed for jest.setup.js)
