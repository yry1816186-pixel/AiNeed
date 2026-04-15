# Concerns

**Project:** 寻裳 (XunO)
**Last mapped:** 2026-04-16

## Critical Issues

### 1. Low Test Coverage

- **Backend**: ~15% coverage
- **Mobile**: ~5% coverage
- **Impact**: High risk of regressions, hard to refactor safely
- **Location**: Across all apps
- **Priority**: High

### 2. TypeScript `any` Types

- **Backend**: ~226 instances of `any`
- **Mobile**: ~105 instances of `any`
- **Impact**: Loss of type safety, runtime errors, poor IDE support
- **Location**: Throughout codebase
- **Priority**: Medium

### 3. Locked Dependencies

- `react-native-screens` 4.4.0 — cannot upgrade
- `react-native-reanimated` 3.16.7 — cannot upgrade
- `react-native-svg` 15.8.0 — cannot upgrade
- **Impact**: Security vulnerabilities, missing features, compatibility ceiling
- **Location**: `apps/mobile/package.json`
- **Priority**: Medium

### 4. Known TypeScript Errors

- `imagePicker.ts` — `includeExif` type mismatch
- `user-key.service.ts` — `encryptionKeySalt` type issue
- **Impact**: Build warnings, potential runtime errors
- **Priority**: Low

## Technical Debt

### 5. Over-Engineering in Recommendation Engine

- 20+ service files in `modules/recommendations/services/`
- Includes: GNN, transformer encoder, SASRec, collaborative filtering, knowledge graph, vector similarity, multimodal fusion, learning-to-rank
- **Impact**: Maintenance burden, unclear which algorithms are actually used
- **Location**: `apps/backend/src/modules/recommendations/`
- **Priority**: Medium

### 6. Root Directory Clutter

- Multiple ESLint output files: `eslint-current*.json`, `eslint-output.*`, `eslint-result*.txt`, `eslint-stdout.txt`
- Test outputs: `jest-output.txt`, `mobile-test-output.txt`, `tmp_*.txt`
- Build artifacts: `tsc-output.txt`, `tsc_full.txt`
- Fix scripts: `fix-unused-vars.js`, `optimize-memory-v2.bat`, `limit-node-memory.bat`
- Screenshots: `screenshot*.png` (6 files)
- Non-project files: `1.md`, `read_pdf.py`, `炳丰（南京）信息科技有限公司——营业执照.pdf`, `02 申请场地合同所需要材料.doc`
- **Impact**: Confusion, repo bloat, unprofessional appearance
- **Priority**: Low

### 7. Polyfill Pattern in Mobile

- 12+ polyfill files for Expo modules that aren't installed
- `expo-camera.tsx`, `expo-haptics.ts`, `expo-router.tsx`, `flash-list.tsx`, etc.
- **Impact**: Fragile, may mask missing dependencies
- **Location**: `apps/mobile/src/polyfills/`
- **Priority**: Low

### 8. Mixed Styling Approaches in Mobile

- React Native Paper (component library)
- Tailwind/NativeWind (utility classes)
- Custom theme tokens (`src/theme/tokens/`)
- Inline styles
- **Impact**: Inconsistent UI, hard to maintain design system
- **Priority**: Medium

## Security Concerns

### 9. Dev Credentials in Docker Compose

- Default passwords in `docker-compose.dev.yml`: `postgres`, `redis123`, `minioadmin123`
- **Impact**: Risk if deployed with defaults
- **Mitigation**: Comments warn about production override
- **Priority**: Low (dev only)

### 10. PII Encryption Key Management

- Per-user encryption keys stored in database (`encryptionKeySalt`, `encryptedDek`)
- `user-key.service.ts` has TypeScript errors
- **Impact**: Potential data access issues if key management breaks
- **Priority**: Medium

## Performance Concerns

### 11. N+1 Query Issues

- Fix scripts exist: `fix-n-plus-1.js`, `fix-n1.js`
- **Impact**: Database performance under load
- **Priority**: Medium

### 12. Memory Management

- Scripts: `limit-node-memory.bat`, `node-memory-watchdog.bat`, `optimize-memory-v2.bat`
- **Impact**: Backend may have memory leak issues
- **Priority**: Medium

## Architecture Concerns

### 13. Module Count (35+ Backend Modules)

- Very large number of feature modules
- Some may be underdeveloped or unused (demo, code-rag)
- **Impact**: Complexity, longer build times, maintenance burden
- **Priority**: Low

### 14. Dual Admin Panel

- `apps/admin/` exists but appears minimal
- Admin functionality also in `apps/backend/src/modules/admin/`
- **Impact**: Confusion about where admin features live
- **Priority**: Low

### 15. HarmonyOS App

- `apps/harmony/` exists but unclear status
- **Impact**: Maintenance overhead if not actively developed
- **Priority**: Low

## Fragile Areas

### 16. Try-On Service Provider Switching

- Multiple providers: GLM, Doubao Seedream, Local Preview
- Provider interface exists but switching may have edge cases
- **Location**: `apps/backend/src/modules/try-on/services/`
- **Priority**: Medium

### 17. Deep Link Handling

- Complex deep link queue/flush mechanism in `App.tsx`
- Race conditions possible with navigation readiness
- **Location**: `apps/mobile/App.tsx`, `apps/mobile/src/navigation/navigationService.ts`
- **Priority**: Medium

### 18. WebSocket State Synchronization

- Chat + notification gateway
- Client-side Socket.IO connection management
- **Location**: `apps/backend/src/common/gateway/`, `apps/mobile/src/services/websocket.ts`
- **Priority**: Medium
