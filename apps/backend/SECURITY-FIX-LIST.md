# 寻裳 安全加固修复清单

> 审计时间: 2026-04-15 | 审计范围: apps/backend/src/common/ + src/config/ + .env* + src/modules/auth/
> 修复状态: ✅ 全部完成

## 审计总结

| 类别 | 修复前 | 修复后 | 状态 |
|------|--------|--------|------|
| .env 变量完整性 | ❌ 缺失 11+ 变量 | ✅ 全部补全 (含注释) | ✅ |
| JWT 配置 | ✅ 达标 | ✅ 描述修正 | ✅ |
| 密码哈希 (scrypt) | ⚠️ 调用参数误导 | ✅ 移除误导参数 | ✅ |
| Rate Limiting | ⚠️ 缺少分级配置 | ✅ upload 10/min | ✅ |
| CORS | ✅ 白名单模式 | ✅ WS 生产环境空回退 | ✅ |
| Helmet | ⚠️ 仅默认配置 | ✅ CSP+CORP+COOP+COEP | ✅ |
| PII 加密 | ⚠️ 字段列表不完整 | ✅ 补全 wechatOpenId/birthDate | ✅ |
| 输入验证 | ✅ 全局管道已启用 | — | ✅ |
| 文件上传 | ✅ 基本安全 | — | ✅ |
| SQL 注入 | ✅ 全部参数化 | — | ✅ |
| 错误信息泄露 | ✅ 生产环境脱敏 | — | ✅ |

---

## FIX-001: .env.example 缺失变量 [HIGH] ✅ 已修复

补全了以下变量 (含中文注释):
`FRONTEND_URL`, `BACKEND_URL`, `POSTGRES_PASSWORD`, `PII_ENCRYPTION_ENABLED`, `SMS_PROVIDER`, `AI_STYLIST_API_KEY`, `VIRTUAL_TRYON_URL`, `QDRANT_COLLECTION_CLOTHING`, `CB_*` (5个), `FIREBASE_SERVICE_ACCOUNT_PATH/JSON`, `APNS_KEY_ID/TEAM_ID/KEY_PATH/BUNDLE_ID`, `OPENWEATHER_API_KEY`, `TRYON_AUTO_ENHANCE`

## FIX-002: bcrypt 调用参数误导 [MEDIUM] ✅ 已修复

移除了 `bcrypt.hash()` 的 `_rounds` 参数，更新了 8 个调用点:
- auth.service.ts (6处)
- merchant.service.ts (1处)
- users.service.ts (1处)

## FIX-003: Rate Limiting 分级配置 [MEDIUM] ✅ 已修复

为缺少限流的 upload 端点添加 `@Throttle({ default: { limit: 10, ttl: 60000 } })`:
- profile.controller.ts: body-analysis/upload, color-analysis/upload
- users.controller.ts: me/avatar/upload

## FIX-004: Helmet 安全头 [MEDIUM] ✅ 已修复

从 `helmet()` 升级为显式配置:
- Content-Security-Policy (CSP)
- Cross-Origin-Resource-Policy: same-site
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp
- Referrer-Policy: strict-origin-when-cross-origin

## FIX-005: PII 加密字段补全 [HIGH] ✅ 已修复

两处 PII_FIELDS 同步更新:
- common/encryption/pii-encryption.service.ts: User 增加 wechatOpenId, wechatUnionId, birthDate
- modules/security/encryption/pii-encryption.service.ts: User 增加 email, wechatOpenId, wechatUnionId, birthDate

## FIX-006: JWT Secret 长度描述 [LOW] ✅ 已修复

.env.example 占位符从 `MIN_128_CHARS` 修正为 `MIN_64_HEX_CHARS`，与 env.validation.ts 的 ≥64 字符校验一致。

## FIX-007: WebSocket CORS 硬编码回退 [LOW] ✅ 已修复

5 个 WebSocket Gateway 统一修改:
- 生产环境: `[]` (空数组，拒绝所有跨域)
- 开发环境: `['http://localhost:3000']` (仅本地)

涉及文件: chat.gateway.ts, ws.gateway.ts, ai.gateway.ts, app.gateway.ts, notification.gateway.ts

---

## 修改文件清单

| 文件 | 修改内容 |
|------|----------|
| `.env.example` | 补全 18 个缺失变量 + 注释 |
| `src/common/security/bcrypt.ts` | 移除 `_rounds` 参数 |
| `src/modules/auth/auth.service.ts` | 6 处 bcrypt.hash 调用去参数 |
| `src/modules/merchant/merchant.service.ts` | 1 处 bcrypt.hash 调用去参数 |
| `src/modules/users/users.service.ts` | 1 处 bcrypt.hash 调用去参数 |
| `src/main.ts` | Helmet 显式安全头配置 |
| `src/common/encryption/pii-encryption.service.ts` | PII_FIELDS 补全 |
| `src/modules/security/encryption/pii-encryption.service.ts` | PII_FIELDS 补全 |
| `src/modules/profile/profile.controller.ts` | 2 处 upload 端点添加 @Throttle |
| `src/modules/users/users.controller.ts` | 1 处 upload 端点添加 @Throttle |
| `src/modules/chat/chat.gateway.ts` | CORS 生产环境空回退 |
| `src/modules/ws/ws.gateway.ts` | CORS 生产环境空回退 |
| `src/modules/ws/gateways/ai.gateway.ts` | CORS 生产环境空回退 |
| `src/modules/ws/gateways/app.gateway.ts` | CORS 生产环境空回退 |
| `src/common/gateway/notification.gateway.ts` | CORS 生产环境空回退 |

## 验证结果

- ✅ `bcrypt.hash(value, 10)` 残留: 0 处
- ✅ WS CORS 硬编码回退: 0 处 (全部改为生产环境空数组)
- ✅ Helmet: 显式 CSP + CORP + COOP + COEP
- ✅ PII_FIELDS: 两处同步包含 wechatOpenId/wechatUnionId/birthDate
- ✅ process.env 变量: 全部在 .env.example 有定义
- ✅ TypeScript 编译: 无新增错误

## 无需修复项 (已达标)

- ✅ JWT access 15min / refresh 7d / rotation 已实现
- ✅ Token blacklist + jti 追踪已实现
- ✅ CORS 白名单模式 (非 *)
- ✅ 全局 ValidationPipe (whitelist + forbidNonWhitelisted)
- ✅ XSS 防护管道
- ✅ 文件上传 MIME 白名单 + magic bytes 校验
- ✅ SQL 全部参数化 (Prisma tagged template)
- ✅ 生产环境错误信息脱敏
- ✅ CSRF 保护 (double-submit cookie)
- ✅ AES-256-GCM 加密 + PBKDF2 密钥派生
