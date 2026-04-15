# Phase 1: 清理与基础修复 - Research

**Gathered:** 2026-04-16
**Status:** Complete

## Current State (Verified Facts)

### Root Directory Clutter (~30+ files)

**ESLint 输出文件（6 个）：**
- `eslint-current.json`, `eslint-current2.json`, `eslint-current3.json`, `eslint-current5.json`, `eslint-current6.json`
- `eslint-output.json`, `eslint-output.txt`

**ESLint/TS 文本输出（5 个）：**
- `eslint-result2.txt`, `eslint-full.txt`, `eslint-stdout.txt`
- `tsc-output.txt`, `tsc-output2.txt`, `tsc_full.txt`

**临时文件（4 个）：**
- `tmp_err.txt`, `tmp_err2.txt`, `tmp_test2.txt`, `tmp_test_output.txt`

**测试输出（2 个）：**
- `jest-output.txt`, `mobile-test-output.txt`

**一次性脚本（1 个）：**
- `fix-unused-vars.js`

**内存管理脚本（3 个）：**
- `limit-node-memory.bat`, `optimize-memory-v2.bat`, `node-memory-watchdog.bat`

**非项目文件（1 个）：**
- `read_pdf.py`

**垃圾文件（1 个）：**
- `mobilesrcservicesapi -Name`（文件名含空格）

**参考文档（1 个，可能保留）：**
- `API-CONSISTENCY-FIX.md` — API 不一致报告，后续 Phase 可能需要参考

**缓存目录（1 个）：**
- `0/` — Node.js v24.14.0 缓存，含数百个哈希命名的子目录

**后端测试输出（2 个）：**
- `apps/backend/test-results.json`, `apps/backend/test-results2.json`

**关键发现：** `.gitignore` 未覆盖这些杂乱文件，需要添加模式防止未来重新产生。

### Demo 模块（待废弃）

- `apps/backend/src/modules/demo/demo.module.ts` — 导入 PrismaModule, AuthModule，导出 DemoService
- `apps/backend/src/modules/demo/demo.controller.ts` — @Controller('demo')，6 个 GET 端点提供离线 demo 数据
- `apps/backend/src/modules/demo/demo.service.ts` — 查询 User, ClothingItem, StyleRecommendation, AiStylistSession, Brand，含 1 处 `as any`
- **仅在 `app.module.ts` 中导入**（第 45 行 import，第 148 行注册），无外部消费者
- **废弃安全度：高** — 零外部依赖

### Code-RAG 模块（待废弃）

- `apps/backend/src/modules/code-rag/code-rag.module.ts` — 导入 HttpModule, ConfigModule, AuthModule，导出 CodeRagService
- `apps/backend/src/modules/code-rag/code-rag.controller.ts` — @Controller('code-rag')，5 个端点用于代码搜索/上下文
- `apps/backend/src/modules/code-rag/code-rag.service.ts` — 460 行，与 Qdrant 向量数据库交互，无 `as any`
- `apps/backend/src/modules/code-rag/dto/code-rag.dto.ts` — 2 个 DTO 含 class-validator 装饰器
- **仅在 `app.module.ts` 中导入**（第 39 行 import，第 147 行注册），无外部消费者
- **废弃安全度：高** — 零外部依赖

### TypeScript 错误

**imagePicker.ts：**
- `apps/mobile/src/utils/imagePicker.ts` — 使用 `react-native-image-picker` 库
- `apps/mobile/src/polyfills/expo-image-picker.ts` — Polyfill 包装
- **当前代码中未找到 `includeExif`** — 错误可能已在之前的版本中修复，或错误表现形式与文档不同
- 需要运行 `tsc --noEmit` 确认当前是否仍有错误

**user-key.service.ts：**
- `apps/backend/src/common/security/user-key.service.ts` — 265 行
- 使用 `user.encryptionKeySalt`（Prisma 中为 `String?` 可空类型）在 6 处
- TS 错误可能与 Prisma 可空类型处理有关：`String | null` vs `string | undefined`
- **关键依赖链：** UserKeyService → StorageService（26+ 导入）和 SecurityPIIEncryptionService
- SecurityModule 是 `@Global()`，提供 PII 加密、速率限制、内容过滤
- **修复风险：中高** — 必须确保修复不破坏加密管道

### ESLint 配置现状

**后端 `.eslintrc.json`：**
- 已包含 `recommended-requiring-type-checking`
- `@typescript-eslint/no-explicit-any: "warn"`
- 使用 `tsconfig.eslint.json`（扩展 `tsconfig.json`，含 `noEmit: true`）
- `@typescript-eslint@^8`

**移动端 `.eslintrc.json`：**
- **未包含** `recommended-requiring-type-checking`
- `@typescript-eslint/no-explicit-any: "warn"`
- 使用 `tsconfig.json`
- `@typescript-eslint@^7`

**关键问题：**
- 移动端需要添加 `recommended-requiring-type-checking`，但 `@typescript-eslint@^7` 可能不完全支持所有检查
- 改 `no-explicit-any` 从 `"warn"` 到 `"error"` 会立即暴露 ~310 处后端 any + ~29 处移动端 any
- 需要策略：先设为 error，再用 `// eslint-disable-next-line` 暂时豁免现有 any

### 命名规范不一致

**后端控制器引号风格：**
- 5 个控制器使用单引号：`@Controller('code-rag')`, `@Controller('demo')`, `@Controller('feature-flags')`, `@Controller('ai-safety')`, `@Controller('queue')`
- 其余使用双引号

**移动端 Store 命名：**
- 点号风格：`auth.store.ts`, `user.store.ts`, `app.store.ts`, `cart.store.ts`, `analysis.store.ts`, `heart-recommend.store.ts`
- 驼峰风格：`uiStore.ts`, `clothingStore.ts`, `photoStore.ts`

**API 端点不一致（记录在 API-CONSISTENCY-FIX.md）：**
- merchant vs merchants
- wardrobe-collections vs wardrobe/collections
- style-quiz vs quiz

### Any 类型统计

- 后端：~310 处 `any`，分布在 93 个文件
- 移动端：~29 处 `any`，分布在 12 个文件
- 移动端 `as never`：24 处，分布在 11 个 .tsx 文件（导航类型绕过）

### 缺失的工具链

- 根目录和后端 `package.json` 缺少 `typecheck` 脚本（仅移动端有 `"typecheck": "tsc --noEmit"`）
- 后端 `tsconfig.eslint.json` 已存在，但无对应的 typecheck 命令

## Validation Architecture

### Dimension 1: Input Validation
- ESLint `no-explicit-any: error` 阻止新增 any 类型
- `recommended-requiring-type-checking` 提供更严格的类型检查
- 命名规范通过 ESLint 规则或手动审查执行

### Dimension 2: Output Verification
- `tsc --noEmit` 验证无 TypeScript 编译错误
- ESLint 通过验证无新增 any
- 根目录文件列表验证无杂乱文件

### Dimension 3: Integration Points
- 废弃模块需从 AppModule 移除（不影响其他模块的导入）
- ESLint 配置变更需与 Phase 0 建立的根级配置协调
- user-key.service.ts 修复需保持与 StorageService 和 SecurityPIIEncryptionService 的兼容

### Dimension 4: Error Handling
- `no-explicit-any: error` 会立即产生大量 lint 错误，需要 `eslint-disable` 过渡策略
- `recommended-requiring-type-checking` 可能引入新的类型错误，需要逐步修复
- TypeScript 错误修复需确保不引入运行时行为变化

### Dimension 5: Performance
- `recommended-requiring-type-checking` 会增加 ESLint 运行时间（需要类型信息）
- 清理杂乱文件对构建性能无影响，但减少仓库体积

### Dimension 6: Security
- user-key.service.ts 处理加密密钥，修复必须不降低安全性
- 废弃模块移除减少攻击面（demo 端点、code-rag 端点不再暴露）
- .gitignore 更新防止敏感输出文件被提交

### Dimension 7: Edge Cases
- `0/` 目录可能被某些工具引用，删除前需确认
- `API-CONSISTENCY-FIX.md` 可能对后续 Phase 有参考价值
- `as never` 在移动端用于导航类型绕过，不应被 no-explicit-any 规则影响
- 内存管理 .bat 脚本可能仍在使用，需确认

### Dimension 8: Observability
- `tsc --noEmit` 输出可追踪 TS 错误修复进度
- ESLint 输出可追踪 any 类型数量变化
- git diff 可验证杂乱文件删除

## Decision Points for Planning

| Plan | Key Decision | Risk |
|------|-------------|------|
| 清理杂乱文件 | API-CONSISTENCY-FIX.md 是否保留？内存管理 .bat 是否仍在使用？`0/` 目录是否安全删除？ | Low |
| 废弃 demo 模块 | 仅移除 AppModule 注册 + @deprecated，还是完全删除文件？ | Low |
| 废弃 code-rag 模块 | 仅移除 AppModule 注册 + @deprecated，还是完全删除文件？ | Low |
| 修复 TS 错误 | imagePicker.ts 错误可能已修复，需先运行 tsc 确认；user-key.service.ts 需处理 Prisma 可空类型 | Medium-High |
| no-explicit-any: error | 立即设为 error + eslint-disable 过渡，还是先 warn 再逐步收紧？ | Medium |
| 移动端 recommended-requiring-type-checking | @typescript-eslint@^7 是否完全支持？升级到 ^8 是否可行？ | Medium |
| 统一命名规范 | Store 命名统一为点号还是驼峰？API 端点修复是否在本次 Phase 范围内？ | Low-Medium |

## Questions for PLAN Phase

1. **废弃策略**：demo 和 code-rag 模块是仅标记 @deprecated + 移除 AppModule 注册，还是完全删除源文件？完全删除更干净但不可逆。
2. **no-explicit-any 过渡策略**：设为 error 后，现有 ~339 处 any 需要逐个添加 `eslint-disable-next-line` 还是使用 `eslint-disable` 块？Phase 7 会修复这些 any。
3. **移动端 @typescript-eslint 版本**：是否需要从 ^7 升级到 ^8 以完全支持 `recommended-requiring-type-checking`？升级可能与 React Native 0.76.8 有兼容性问题。
4. **命名规范范围**：API 端点不一致（merchant vs merchants 等）是否在 Phase 1 修复？这涉及路由变更，可能影响前端调用。
5. **user-key.service.ts 修复方案**：Prisma 可空类型 `String | null` 的正确处理方式是什么？是否需要添加 null 检查或使用非空断言？
6. **.gitignore 更新**：需要添加哪些模式来防止杂乱文件重新产生？

## RESEARCH COMPLETE
