# AiNeed 安全审计报告

**审计日期**: 2026-04-13
**审计范围**: C:\AiNeed 全代码库 (后端/移动端/AI服务)
**审计标准**: OWASP Top 10 2021 / CWE / NIST SP 800-53
**审计人**: 安全审计官

---

## 执行摘要

| 严重级别 | 数量 |
|---------|------|
| CRITICAL | 4 |
| HIGH | 8 |
| MEDIUM | 9 |
| LOW | 6 |
| **合计** | **27** |

**总体评估**: 项目具备基础安全框架（Helmet、CORS、CSRF、XSS管道、PII加密），但存在若干关键安全缺陷需要立即修复。最严重的问题包括：PII加密失败时回退明文、Code-RAG端点完全无认证、多个Controller端点缺少DTO验证、以及移动端安全存储降级为明文。

---

## CRITICAL 级别发现

### C-01: PII加密失败时回退返回明文

- **严重级别**: CRITICAL
- **漏洞类型**: CWE-311 (缺失敏感信息加密) / OWASP A02:2021 Cryptographic Failures
- **涉及文件**: [pii-encryption.service.ts:54-57](file:///c:/AiNeed/apps/backend/src/modules/security/encryption/pii-encryption.service.ts#L54-L57)
- **具体描述**: `encryptField()` 方法在加密失败时 catch 异常后返回原始明文（`return plaintext`），而非抛出错误。同样 `decryptField()` 在解密失败时返回密文原文。这意味着如果加密服务出现任何故障（如密钥损坏、数据库连接问题），PII数据将以明文形式存入数据库，完全绕过加密保护。
- **修复建议**: 加密失败时应抛出异常而非返回明文。对于解密失败，应记录安全事件并返回 null 或抛出异常，绝不返回原始密文或明文。

```typescript
// 当前（危险）:
} catch (error) {
  this.logger.error(`encryptField failed: ...`);
  return plaintext;  // 泄露明文！
}

// 建议:
} catch (error) {
  this.logger.error(`encryptField failed: ...`);
  throw new InternalServerErrorException('PII encryption failed - data not stored');
}
```

---

### C-02: Code-RAG 端点完全无认证且暴露源代码

- **严重级别**: CRITICAL
- **漏洞类型**: CWE-306 (缺失关键功能认证) / OWASP A01:2021 Broken Access Control
- **涉及文件**: [code-rag.controller.ts:20-118](file:///c:/AiNeed/apps/backend/src/modules/code-rag/code-rag.controller.ts#L20-L118)
- **具体描述**: Code-RAG 控制器的所有6个端点均标记为 `@Public()`，无需任何认证即可访问。这些端点暴露了完整的源代码索引、语义搜索、文件上下文和项目架构信息。攻击者可以：
  1. 通过 `/code-rag/search` 搜索任意代码片段，可能发现硬编码密钥或漏洞
  2. 通过 `/code-rag/file-context` 获取特定文件的完整代码
  3. 通过 `/code-rag/context-for-ai` 获取项目完整技术栈和架构信息
  4. 通过 `/code-rag/summary` 获取代码库概览
- **修复建议**: 移除所有 `@Public()` 装饰器，添加 `@UseGuards(JwtAuthGuard)` 和管理员角色守卫。Code-RAG 功能应仅限内部开发使用，不应暴露在公共 API 中。

---

### C-03: Demo 控制器无认证暴露测试账号

- **严重级别**: CRITICAL
- **漏洞类型**: CWE-200 (信息暴露) / OWASP A01:2021 Broken Access Control
- **涉及文件**: [demo.controller.ts:1-50](file:///c:/AiNeed/apps/backend/src/modules/demo/demo.controller.ts#L1-L50)
- **具体描述**: Demo 控制器（`/api/v1/demo/*`）没有任何认证守卫，所有端点均为公开访问。`/api/v1/demo/users` 端点声称"密码已脱敏"，但仍然暴露了用户邮箱、昵称等 PII 信息。如果脱敏不彻底，可能导致测试账号被接管。此外，`/api/v1/demo` 端点暴露了完整的演示数据集。
- **修复建议**: 添加 `@UseGuards(JwtAuthGuard)` 和管理员角色守卫。在生产环境中应完全禁用 Demo 模块（通过 Feature Flag 或环境变量控制）。

---

### C-04: 移动端安全存储降级为明文 AsyncStorage

- **严重级别**: CRITICAL
- **漏洞类型**: CWE-311 (缺失敏感信息加密) / OWASP A02:2021 Cryptographic Failures
- **涉及文件**: [secure-storage.ts:89-97](file:///c:/AiNeed/apps/mobile/src/utils/security/secure-storage.ts#L89-L97)
- **具体描述**: 当 `expo-secure-store` 和 `react-native-encrypted-storage` 均不可用时，安全存储模块会降级到 AsyncStorage（明文存储）。虽然会打印警告，但敏感数据（AUTH_TOKEN、REFRESH_TOKEN、USER_CREDENTIALS、ENCRYPTION_KEY、BIOMETRIC_KEY）仍会以明文形式存储在设备上。攻击者可以通过 root/越狱设备或备份提取这些数据。
- **修复建议**: 当没有安全存储后端可用时，应拒绝存储敏感数据而非降级到明文。对于 AUTH_TOKEN 等关键数据，应抛出异常阻止存储。

```typescript
// 当前（危险）:
case 'async-storage': {
  logFallbackWarning('async-storage', key);
  await asyncStorage!.setItem(key, value);  // 明文存储！
  break;
}

// 建议:
case 'async-storage': {
  if (SECURE_KEYS.AUTH_TOKEN === key || SECURE_KEYS.REFRESH_TOKEN === key) {
    throw new Error('[SECURITY] Cannot store sensitive data in plaintext');
  }
  // ...非敏感数据可降级
}
```

---

## HIGH 级别发现

### H-01: 多个 Controller 端点使用内联对象类型而非 DTO 验证

- **严重级别**: HIGH
- **漏洞类型**: CWE-20 (输入验证不当) / OWASP A03:2021 Injection
- **涉及文件**:
  - [search.controller.ts:137](file:///c:/AiNeed/apps/backend/src/modules/search/search.controller.ts#L137) - `@Body() body: { imageUrl: string }`
  - [order.controller.ts:79](file:///c:/AiNeed/apps/backend/src/modules/order/order.controller.ts#L79) - `@Body() body: { paymentMethod: string }`
  - [customization.controller.ts:158](file:///c:/AiNeed/apps/backend/src/modules/customization/customization.controller.ts#L158) - `@Body() body: { quoteId: string }`
  - [cart.controller.ts:76](file:///c:/AiNeed/apps/backend/src/modules/cart/cart.controller.ts#L76) - `@Body() body: { quantity?: number; selected?: boolean }`
  - [cart.controller.ts:110](file:///c:/AiNeed/apps/backend/src/modules/cart/cart.controller.ts#L110) - `@Body() body: { selected: boolean }`
  - [ai.controller.ts:327](file:///c:/AiNeed/apps/backend/src/modules/ai/ai.controller.ts#L327) - `@Body() body: { limit?: number }`
  - [profile.controller.ts:266](file:///c:/AiNeed/apps/backend/src/modules/profile/profile.controller.ts#L266) - `@Body() body: { styles: string[] }`
  - [profile.controller.ts:296](file:///c:/AiNeed/apps/backend/src/modules/profile/profile.controller.ts#L296) - `@Body() body: { colors: string[] }`
  - [profile.controller.ts:326](file:///c:/AiNeed/apps/backend/src/modules/profile/profile.controller.ts#L326) - `@Body() body: { min: number | null; max: number | null }`
  - [users.controller.ts:144](file:///c:/AiNeed/apps/backend/src/modules/users/users.controller.ts#L144) - `@Body() body: { avatarUrl: string }`
- **具体描述**: 10个端点使用内联 TypeScript 类型（`{ imageUrl: string }`）而非 class-validator DTO 类。虽然全局 `ValidationPipe` 配置了 `whitelist: true` 和 `forbidNonWhitelisted: true`，但这些内联类型没有 `@IsString()`、`@IsUrl()` 等验证装饰器，NestJS 的 ValidationPipe 无法对其进行验证。攻击者可以提交任意结构的请求体，包括：
  - `imageUrl` 可以是任意字符串（包括 SSRF payload），而非合法 URL
  - `paymentMethod` 可以是任意字符串，可能导致业务逻辑绕过
  - `avatarUrl` 可以是任意字符串，可能用于 SSRF 或存储型 XSS
  - `quantity` 可以是负数或极大值
- **修复建议**: 为每个端点创建正式的 DTO 类，使用 class-validator 装饰器进行严格验证。

---

### H-02: SSRF 风险 - 图片搜索端点可被利用访问内网资源

- **严重级别**: HIGH
- **漏洞类型**: CWE-918 (服务器端请求伪造) / OWASP A10:2021 Server-Side Request Forgery
- **涉及文件**: [search.controller.ts:235-262](file:///c:/AiNeed/apps/backend/src/modules/search/search.controller.ts#L235-L262)
- **具体描述**: `/search/visual` 端点接受用户提供的 `imageUrl`，服务端会下载该 URL 的内容。虽然实现了 `ensurePublicHostname()` 进行 DNS 重绑定检查，但存在以下绕过风险：
  1. DNS 重绑定攻击：DNS 解析在检查时可能指向公网 IP，但实际请求时指向内网 IP
  2. 未检查所有 RFC 1918 地址范围（如 100.64.0.0/10 CGNAT、198.18.0.0/15 基准测试）
  3. IPv6 映射地址可能绕过检查
  4. 302 重定向虽禁用了 `maxRedirects: 0`，但未验证重定向目标
- **修复建议**: 使用 URL 白名单而非黑名单方式；在 DNS 解析后立即发起请求（减少 TOCTOU 窗口）；添加完整的 RFC 1918/RFC 4193 私有地址检查；考虑使用专门的 SSRF 防护库。

---

### H-03: Storage Proxy SSRF 风险

- **严重级别**: HIGH
- **漏洞类型**: CWE-918 (服务器端请求伪造) / OWASP A10:2021 Server-Side Request Forgery
- **涉及文件**: [storage.controller.ts:21-62](file:///c:/AiNeed/apps/backend/src/common/storage/storage.controller.ts#L21-L62)
- **具体描述**: `/storage/proxy` 端点接受用户提供的 URL，服务端代理请求该 URL 并返回内容。虽然 `assertAllowedStorageUrl()` 检查了主机名和端口，但：
  1. 仅检查主机名是否匹配 MinIO 配置，但 `localhost` 和 `127.0.0.1` 始终在允许列表中
  2. 路径检查 `/${expectedBucket}/` 可被 `/${expectedBucket}/../` 绕过（路径穿越）
  3. 无 DNS 重绑定防护
- **修复建议**: 移除 LOCAL_STORAGE_HOSTS 硬编码白名单；使用路径规范化后验证；考虑使用预签名 URL 而非代理模式。

---

### H-04: execSync 命令执行 - 潜在命令注入

- **严重级别**: HIGH
- **漏洞类型**: CWE-78 (OS 命令注入) / OWASP A03:2021 Injection
- **涉及文件**: [system-context.service.ts:143-156](file:///c:/AiNeed/apps/backend/src/modules/ai-stylist/system-context.service.ts#L143-L156)
- **具体描述**: `system-context.service.ts` 使用 `execSync()` 执行 git 命令。虽然当前命令是硬编码的（不存在直接注入），但：
  1. `cwd` 参数来自环境变量 `PROJECT_ROOT`，默认为 `C:\\AiNeed`
  2. 如果环境变量被篡改，可能导致在恶意目录执行命令
  3. `execSync` 本身是阻塞调用，可能导致 DoS
  4. 该功能在生产环境中不应存在
- **修复建议**: 在生产环境中禁用此功能；使用 `execFile` 替代 `execSync`（不允许 shell 解释）；验证 `PROJECT_ROOT` 路径的合法性。

---

### H-05: JWT 默认过期时间过长

- **严重级别**: HIGH
- **漏洞类型**: CWE-613 (会话过期不当) / OWASP A07:2021 Identification and Authentication Failures
- **涉及文件**:
  - [auth.module.ts:38-41](file:///c:/AiNeed/apps/backend/src/modules/auth/auth.module.ts#L38-L41) - 默认 `7d`
  - [env-validator.service.ts:18](file:///c:/AiNeed/apps/backend/src/common/config/env-validator.service.ts#L18) - 默认 `7d`
- **具体描述**: JWT_ACCESS_EXPIRES_IN 的默认值为 `7d`（7天），这对于 access token 来说过长。虽然 `auth.service.ts` 中的 `generateTokens()` 方法使用了 `JWT_ACCESS_EXPIRES_IN` 环境变量（默认 `15m`），但 `auth.module.ts` 中 JwtModule 的全局注册使用了 `JWT_EXPIRES_IN`（默认 `7d`）。这两个配置存在不一致，且部分代码可能使用全局注册的 `7d` 配置。
- **修复建议**: 统一 JWT 过期时间配置。Access token 应为 15 分钟，Refresh token 为 7 天。移除 `JWT_EXPIRES_IN` 配置项，统一使用 `JWT_ACCESS_EXPIRES_IN` 和 `JWT_REFRESH_EXPIRES_IN`。

---

### H-06: 密码重置 Token 未限制使用次数

- **严重级别**: HIGH
- **漏洞类型**: CWE-287 (认证不当) / OWASP A07:2021 Identification and Authentication Failures
- **涉及文件**: [auth.service.ts:303-328](file:///c:/AiNeed/apps/backend/src/modules/auth/auth.service.ts#L303-L328)
- **具体描述**: 密码重置流程中，`resetPassword()` 方法在验证 token 后删除 Redis 中的 key（`await this.redisService.del(resetKey)`），这是正确的。但存在竞态条件：如果攻击者在 token 被删除前并发发送多个重置请求，可能绕过单次使用限制。此外，token 使用 `randomUUID()` 生成，虽然熵足够，但没有额外的速率限制保护重置端点。
- **修复建议**: 使用 Redis 的原子操作（如 GETDEL 或 Lua 脚本）确保 token 只能使用一次；添加重置密码端点的速率限制（当前已有 `@Throttle({ default: { limit: 5, ttl: 60000 } })`，但可进一步收紧）。

---

### H-07: ML API Key 认证使用简单字符串比较

- **严重级别**: HIGH
- **漏洞类型**: CWE-208 (时序攻击) / OWASP A07:2021 Identification and Authentication Failures
- **涉及文件**: [auth.py:31](file:///c:/AiNeed/ml/api/middleware/auth.py#L31)
- **具体描述**: ML 服务的 API Key 认证使用 Python 的 `!=` 运算符进行字符串比较（`if api_key != settings.ML_API_KEY`），这容易受到时序攻击（timing attack）。攻击者可以通过测量比较时间逐字节猜测 API Key。
- **修复建议**: 使用 `hmac.compare_digest()` 进行常量时间比较。

```python
import hmac
if not hmac.compare_digest(api_key, settings.ML_API_KEY):
    # ... reject
```

---

### H-08: ML API Key 为空时完全跳过认证

- **严重级别**: HIGH
- **漏洞类型**: CWE-306 (缺失关键功能认证) / OWASP A01:2021 Broken Access Control
- **涉及文件**: [auth.py:26-27](file:///c:/AiNeed/ml/api/middleware/auth.py#L26-L27)
- **具体描述**: 当 `ML_API_KEY` 为空字符串时，中间件完全跳过认证（`if not settings.ML_API_KEY: return await call_next(request)`）。如果部署时忘记设置 ML_API_KEY，整个 ML 服务将无认证暴露。
- **修复建议**: 在生产环境中，如果 ML_API_KEY 未设置应拒绝启动或拒绝所有请求。添加启动检查确保生产环境必须设置 ML_API_KEY。

---

## MEDIUM 级别发现

### M-01: XSS 清理管道过于激进可能破坏合法数据

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-79 (跨站脚本) - 防护过度
- **涉及文件**: [xss-sanitization.pipe.ts:34-44](file:///c:/AiNeed/apps/backend/src/common/pipes/xss-sanitization.pipe.ts#L34-L44)
- **具体描述**: XSS 清理管道将 `<`, `>`, `"`, `'`, `/`, `\`, `` ` ``, `=` 全部替换为 HTML 实体。这意味着所有经过 `@Body()` 的输入都会被转换，包括合法的文本内容（如用户昵称中的特殊字符、商品描述中的标点符号）。虽然这提供了强 XSS 防护，但可能导致数据完整性问题。此外，`/` 和 `=` 的替换可能影响 URL 和 Base64 编码的数据。
- **修复建议**: 区分上下文（HTML、JavaScript、URL、CSS）进行针对性转义；仅对需要渲染为 HTML 的字段进行转义；对于 API 后端，应依赖前端框架的自动转义（React Native 本身对 XSS 有天然防护），而非在 API 层过度清理。

---

### M-02: Brands/Clothing 控制器缺少认证守卫

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-862 (缺失授权) / OWASP A01:2021 Broken Access Control
- **涉及文件**:
  - [brands.controller.ts:8](file:///c:/AiNeed/apps/backend/src/modules/brands/brands.controller.ts#L8) - 无 `@UseGuards`
  - [clothing.controller.ts:23](file:///c:/AiNeed/apps/backend/src/modules/clothing/clothing.controller.ts#L23) - 无 `@UseGuards`
  - [demo.controller.ts:6](file:///c:/AiNeed/apps/backend/src/modules/demo/demo.controller.ts#L6) - 无 `@UseGuards
- **具体描述**: Brands 和 Clothing 控制器没有类级别的 `@UseGuards(AuthGuard)` 装饰器。虽然这些是只读端点，商品列表可能是公开的，但缺乏认证意味着无法进行用户行为追踪和速率限制。如果未来添加写入端点，可能忘记添加守卫。
- **修复建议**: 评估业务需求，如果商品数据应为公开访问则保持现状但添加注释说明；否则添加 `@UseGuards(OptionalAuthGuard)` 以便追踪用户行为。

---

### M-03: Metrics 端点 IP 白名单可能被绕过

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-639 (通过用户可控输入绕过授权) / OWASP A01:2021 Broken Access Control
- **涉及文件**: [metrics.controller.ts:6-24](file:///c:/AiNeed/apps/backend/src/modules/metrics/metrics.controller.ts#L6-L24)
- **具体描述**: Metrics 端点使用 IP 白名单保护，但：
  1. 在反向代理（Nginx/Cloudflare）后面，`req.ip` 可能是代理 IP 而非客户端 IP
  2. `ALLOWED_PREFIXES` 使用简单的字符串前缀匹配，`172.` 前缀可能匹配不应允许的地址
  3. 未使用 `X-Forwarded-For` 头验证（也不应盲目信任）
  4. 如果应用未正确配置 `trust proxy`，IP 检查可能失效
- **修复建议**: 确保正确配置 NestJS 的 `app.set('trust proxy')` 设置；考虑使用 HTTP Basic Auth 或 JWT 作为额外保护层；在生产环境中将 Metrics 端点绑定到内部网络接口。

---

### M-04: bcrypt 轮数不一致

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-916 (使用弱哈希算法) / OWASP A02:2021 Cryptographic Failures
- **涉及文件**:
  - [auth.service.ts:268](file:///c:/AiNeed/apps/backend/src/modules/auth/auth.service.ts#L268) - `bcrypt.hash(token, 10)` (refresh token)
  - [auth.service.ts:314](file:///c:/AiNeed/apps/backend/src/modules/auth/auth.service.ts#L314) - `bcrypt.hash(newPassword, 10)` (password reset)
- **具体描述**: CLAUDE.md 声明使用 "bcrypt 12 轮"，但实际代码中使用的是 10 轮。虽然 10 轮在当前硬件下仍可接受，但与文档声明不符，且低于推荐值。
- **修复建议**: 统一使用 12 轮 bcrypt（与文档一致）；将轮数提取为配置常量。

---

### M-05: 加密密钥缓存未加密存储在内存中

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-316 (明文存储敏感信息在内存中) / OWASP A02:2021 Cryptographic Failures
- **涉及文件**: [user-key.service.ts:26](file:///c:/AiNeed/apps/backend/src/common/security/user-key.service.ts#L26)
- **具体描述**: `UserKeyService` 将解密后的 DEK（数据加密密钥）缓存在 `Map<string, CachedDek>` 中，缓存 TTL 为 1 小时，最大缓存 1000 个密钥。这些密钥以明文 Buffer 形式存储在内存中，如果服务器被入侵或内存被 dump，所有用户的加密密钥将泄露。
- **修复建议**: 减少缓存 TTL；考虑使用 Node.js 的 `crypto.createSecretKey` 和 KeyObject 进行密钥管理；在密钥不再使用时及时从内存中清除（`Buffer.fill(0)`）。

---

### M-06: Python 测试文件中硬编码 API Key

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-798 (硬编码凭证) / OWASP A07:2021 Identification and Authentication Failures
- **涉及文件**:
  - [conftest.py:12](file:///c:/AiNeed/ml/api/tests/conftest.py#L12) - `TEST_API_KEY = "test-api-key-12345678901234567890"`
  - [conftest.py:18-19](file:///c:/AiNeed/ml/api/tests/conftest.py#L18-L19) - `GLM_API_KEY`、`ZHIPU_API_KEY` 硬编码
- **具体描述**: 测试配置文件中硬编码了 API Key。虽然这些是测试用的 Key，但：
  1. 如果测试 Key 与生产 Key 格式相同，可能被误用于生产环境
  2. 硬编码的 Key 模式可能帮助攻击者猜测生产 Key 格式
  3. `os.environ["ML_API_KEY"] = TEST_API_KEY` 直接修改环境变量，可能影响并行测试
- **修复建议**: 使用 `pytest-env` 或 `.env.test` 文件管理测试环境变量；确保测试 Key 与生产 Key 格式有明显区别。

---

### M-07: os.system 命令注入风险

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-78 (OS 命令注入) / OWASP A03:2021 Injection
- **涉及文件**: [test_glm_api.py:61](file:///c:/AiNeed/ml/scripts/test_glm_api.py#L61)
- **具体描述**: 使用 `os.system(f"{sys.executable} -m pip install httpx -q")` 执行系统命令。虽然 `sys.executable` 通常是安全的，但 `os.system` 会通过 shell 解释命令，存在命令注入的理论风险。
- **修复建议**: 使用 `subprocess.run([sys.executable, "-m", "pip", "install", "httpx", "-q"])` 替代，避免 shell 解释。

---

### M-08: 密码重置邮件未实际发送

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-287 (认证不当) / 业务逻辑缺陷
- **涉及文件**: [auth.service.ts:280-301](file:///c:/AiNeed/apps/backend/src/modules/auth/auth.service.ts#L280-L301)
- **具体描述**: `sendPasswordResetEmail()` 方法生成了重置 Token 并存储在 Redis 中，构造了重置 URL，但仅打印日志（`this.logger.log("密码重置邮件已发送", { email, resetUrl })`），并未实际发送邮件。重置 URL 包含在日志中，可能被日志系统记录，导致 Token 泄露。用户无法收到重置邮件，但 Token 已生成且有效。
- **修复建议**: 集成邮件发送服务实际发送重置邮件；从日志中移除 `resetUrl`（仅记录 email）；确保重置 Token 在日志中不被完整记录。

---

### M-09: SMS 验证码使用 Math.random 生成

- **严重级别**: MEDIUM
- **漏洞类型**: CWE-338 (使用弱伪随机数生成器) / OWASP A02:2021 Cryptographic Failures
- **涉及文件**: [auth.service.ts:337](file:///c:/AiNeed/apps/backend/src/modules/auth/auth.service.ts#L337)
- **具体描述**: SMS 验证码使用 `Math.floor(100000 + Math.random() * 900000)` 生成。`Math.random()` 不是密码学安全的随机数生成器，其输出可预测。虽然 6 位验证码本身熵有限，但使用不安全的随机数生成器使其更容易被暴力破解。
- **修复建议**: 使用 `crypto.randomInt(100000, 1000000)` 替代 `Math.random()`。

---

## LOW 级别发现

### L-01: 根目录 .env.example 包含弱默认值

- **严重级别**: LOW
- **漏洞类型**: CWE-798 (硬编码凭证) / OWASP A07:2021 Identification and Authentication Failures
- **涉及文件**: [.env.example:2-13](file:///c:/AiNeed/.env.example#L2-L13)
- **具体描述**: 根目录的 `.env.example` 包含弱默认值如 `DATABASE_URL="postgresql://user:password@localhost:5432/stylemind"`、`JWT_SECRET="your_512_bit_secret_key_here"`、`AES_ENCRYPTION_KEY="your_aes_256_key_here"`。相比之下，`apps/backend/.env.example` 的默认值更安全（使用 `YOUR_...` 占位符）。
- **修复建议**: 统一所有 `.env.example` 文件，使用明确的占位符（如 `YOUR_STRONG_PASSWORD_HERE`）而非弱默认值。

---

### L-02: Seed 脚本中硬编码测试密码

- **严重级别**: LOW
- **漏洞类型**: CWE-798 (硬编码凭证) / OWASP A07:2021 Identification and Authentication Failures
- **涉及文件**:
  - [seed.ts:59-68](file:///c:/AiNeed/apps/backend/prisma/seed.ts#L59-L68)
  - [users.seed.ts:44-125](file:///c:/AiNeed/apps/backend/prisma/seeds/users.seed.ts#L44-L125)
- **具体描述**: 数据库种子脚本中硬编码了多个测试账号密码（`Test123456!`、`Demo123456!`、`Judge123456!`、`Admin123456!`）。如果生产环境误运行种子脚本，将创建可预测的管理员账号。
- **修复建议**: 种子脚本应检查 `NODE_ENV !== 'production'` 后才创建测试账号；密码应从环境变量读取。

---

### L-03: XSS Sanitization Pipe 对所有请求类型生效

- **严重级别**: LOW
- **漏洞类型**: 性能/设计问题
- **涉及文件**: [main.ts:73-83](file:///c:/AiNeed/apps/backend/src/main.ts#L73-L83)
- **具体描述**: `XssSanitizationPipe` 作为全局管道应用于所有请求，包括文件上传和二进制数据。虽然管道对非字符串类型做了跳过处理，但递归遍历所有对象属性仍有性能开销。
- **修复建议**: 仅对需要文本输入的端点应用 XSS 清理；或优化管道跳过已知二进制字段。

---

### L-04: Content-Type 未验证的代理响应

- **严重级别**: LOW
- **漏洞类型**: CWE-434 (危险类型文件上传) / OWASP A04:2021 Insecure Design
- **涉及文件**: [storage.controller.ts:49-61](file:///c:/AiNeed/apps/backend/src/common/storage/storage.controller.ts#L49-L61)
- **具体描述**: Storage 代理端点将上游响应的 Content-Type 直接传递给客户端，未进行验证或限制。如果 MinIO 中存储了恶意 HTML/SVG 文件，代理可能将其作为 `text/html` 或 `image/svg+xml` 返回，导致存储型 XSS。
- **修复建议**: 验证并限制允许的 Content-Type 白名单；对 HTML/SVG 等危险类型添加 `Content-Disposition: attachment` 头。

---

### L-05: ThrottlerModule 全局限制较宽松

- **严重级别**: LOW
- **漏洞类型**: CWE-770 (无限制资源分配) / OWASP A05:2021 Security Misconfiguration
- **涉及文件**: [app.module.ts:76-81](file:///c:/AiNeed/apps/backend/src/app.module.ts#L76-L81)
- **具体描述**: 全局速率限制为 100 请求/分钟/IP，这对于 API 来说相对宽松。虽然特定端点（如登录、注册）有更严格的限制，但大多数端点依赖全局限制。
- **修复建议**: 根据端点敏感度分级设置速率限制；考虑使用 Redis 支持的分布式速率限制。

---

### L-06: Swagger 文档在非生产环境暴露

- **严重级别**: LOW
- **漏洞类型**: CWE-200 (信息暴露) / OWASP A05:2021 Security Misconfiguration
- **涉及文件**: [main.ts:89-100](file:///c:/AiNeed/apps/backend/src/main.ts#L89-L100)
- **具体描述**: Swagger API 文档在非生产环境启用。如果开发/测试环境意外暴露在公网，攻击者可以获取完整的 API 结构信息。`persistAuthorization` 选项可能导致 Token 泄露。
- **修复建议**: 确保 Swagger 仅在本地开发环境启用；添加 IP 白名单限制文档访问。

---

## OWASP Top 10 (2021) 合规矩阵

| OWASP 类别 | 状态 | 相关发现 |
|-----------|------|---------|
| A01: Broken Access Control | 不合规 | C-02, C-03, H-08, M-02, M-03 |
| A02: Cryptographic Failures | 不合规 | C-01, C-04, H-07, M-04, M-05, M-09 |
| A03: Injection | 部分合规 | H-01, H-04, M-07 (Prisma 参数化查询已防止 SQL 注入) |
| A04: Insecure Design | 部分合规 | L-04, L-05 |
| A05: Security Misconfiguration | 部分合规 | L-05, L-06 (Helmet、CORS 已配置) |
| A06: Vulnerable Components | 未评估 | 需要运行 `npm audit` / `pip audit` |
| A07: Auth Failures | 部分合规 | H-05, H-06, H-07, M-06, M-08 |
| A08: Data Integrity Failures | 部分合规 | M-01 (XSS 管道可能破坏数据) |
| A09: Logging Failures | 部分合规 | M-08 (日志中泄露 reset URL) |
| A10: SSRF | 不合规 | H-02, H-03 |

---

## 安全亮点 (已做好的部分)

1. **Prisma 参数化查询**: 所有 `$queryRaw` 调用均使用模板字面量（tagged template），自动参数化，有效防止 SQL 注入
2. **Helmet 安全头**: 已配置，提供 X-Frame-Options、X-Content-Type-Options 等保护
3. **CORS 白名单**: 生产环境默认拒绝所有跨域请求，开发环境限制为 localhost
4. **CSRF 保护**: 实现了完整的 CSRF 模块（Cookie + Header 双重验证）
5. **XSS 防护管道**: 全局 XSS 清理管道对所有输入进行 HTML 实体编码
6. **AES-256-GCM 加密**: 实现正确，使用 PBKDF2 派生密钥、随机 IV、认证标签
7. **用户级加密密钥**: 实现了 DEK/KEK 分层密钥管理，支持密钥轮换
8. **JWT 密钥验证**: 生产环境强制要求 64+ 字符密钥，检测默认/占位符值
9. **环境变量验证**: 使用 Zod schema 验证环境变量，生产环境强制必要配置
10. **速率限制**: 关键端点（登录、注册、AI 调用）有细粒度速率限制
11. **文件上传限制**: Multer 配置了 10MB 大小限制和单文件限制
12. **SSRF 防护（部分）**: 图片搜索端点实现了 DNS 解析检查和私有地址过滤

---

## 修复优先级路线图

### 第一阶段 (立即修复 - 1-3天)
1. **C-01**: 修复 PII 加密失败回退逻辑
2. **C-02**: 移除 Code-RAG 的 `@Public()` 装饰器
3. **C-03**: 为 Demo 控制器添加认证守卫
4. **C-04**: 移动端安全存储降级时拒绝存储敏感数据

### 第二阶段 (短期修复 - 1周内)
1. **H-01**: 为所有内联 Body 类型创建正式 DTO
2. **H-02/H-03**: 加强 SSRF 防护
3. **H-05**: 统一 JWT 过期时间配置
4. **H-07/H-08**: 修复 ML API 认证问题

### 第三阶段 (中期修复 - 2周内)
1. **H-04**: 禁用生产环境的 execSync
2. **H-06**: 修复密码重置竞态条件
3. **M-04**: 统一 bcrypt 轮数
4. **M-08**: 实现邮件发送功能
5. **M-09**: 使用密码学安全随机数

### 第四阶段 (长期改进 - 1个月内)
1. **M-01**: 优化 XSS 清理策略
2. **M-05**: 加密密钥内存安全
3. **L-01 ~ L-06**: 低优先级修复

---

*本审计报告仅基于静态代码分析，未进行动态渗透测试。建议在修复后进行专业的渗透测试验证。*
