# Phase 1: 用户画像 & 风格测试 - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

新用户注册后完成个人画像建立和风格测试，AI 系统获得精准的用户理解基础。包含：双通道注册、强制基本信息收集、照片上传与体型分析、图片选择式风格测试、可视化画像报告、隐私保护。

**不包含：** AI 造型师对话（Phase 2）、虚拟试衣生成（Phase 3）、推荐信息流（Phase 4）、社区功能（Phase 6）

</domain>

<decisions>
## Implementation Decisions

### 注册与引导
- **D-01:** 双通道注册 — 手机号+验证码（阿里云/腾讯云短信）+ 微信一键登录（微信开放平台）
- **D-02:** 强制基本信息 — 注册后必须填写性别和年龄段，确保 AI 推荐有最低数据基础
- **D-03:** 最短链路引导 — 基本信息（必填）→ 照片上传（可选）→ 风格测试（可选）→ 进入首页；照片和风格测试可跳过但首页持续提示补全

### 照片上传与分析
- **D-04:** 实时参考线引导 — 上传照片时显示人体轮廓参考线 + 姿势提示（"请稍向左"/"请站直"），类似小米证件照引导
- **D-05:** 照片质量检测 — 自动检测清晰度/光线/构图，不合格提示重新上传或自动增强
- **D-06:** 照片加密永久存储 — AES-256-GCM 加密存储在 MinIO，永久保留（用于后续虚拟试衣），用户可手动删除
- **D-07:** 隐私承诺展示 — 上传页面明确标注"仅用于体型分析和试衣效果生成"

### 风格测试
- **D-08:** 图片选择式问卷 — 每题展示 4-6 张穿搭图片，用户点选喜欢的。5-8 题总量，控制完成时间
- **D-09:** 四维度覆盖 — 场合偏好 + 色彩偏好（隐性推导）+ 风格关键词 + 价格区间
- **D-10:** 色彩隐性推导 — 不直接问色彩偏好，从图片选择行为中推导

### 画像展示
- **D-11:** 可视化报告 — 体型分类 + 身体比例可视化 + 肤色分析 + 色彩季型（四型+暖冷×浅深细分）+ 个性化穿搭建议摘要
- **D-12:** 分享海报 — 画像结果支持生成可分享的海报图片，增强仪式感和社交传播

### 数据架构
- **D-13:** 伴随式画像构建 — 用户行为数据（浏览/收藏/试衣/购买/AI对话）持续优化画像
- **D-14:** 画像数据同步 — UserProfile/StyleProfile 变更后自动通知 AI 造型师和推荐引擎

### Claude's Discretion
- 手机验证码具体服务商选择（阿里云 vs 腾讯云短信）
- 参考线引导的具体 UI 实现（Canvas overlay vs 原生组件）
- 图片选择式问卷的图片素材来源和分类
- 可视化报告的具体 UI 布局和图表类型
- 分享海报的模板设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 数据模型
- `apps/backend/prisma/schema.prisma` — UserProfile, UserPhoto, StyleProfile, UserBehavior 模型定义

### 后端模块
- `apps/backend/src/modules/auth/` — 已实现的双通道认证（JWT + refresh token）
- `apps/backend/src/modules/profile/` — 已实现的体型分析（5种体型 + BMI/腰臀比 + 色彩季型）
- `apps/backend/src/modules/photos/` — 已实现的照片上传（EXIF stripping + 加密存储 + AI 分析）
- `apps/backend/src/modules/style-profiles/` — 已实现的风格档案（行为学习 + 关键词/调色板）
- `apps/backend/src/modules/privacy/` — 已实现的隐私合规（GDPR/PIPL + 数据导出/删除）

### ML 服务
- `ml/services/body_analyzer.py` — MediaPipe 33关键点 + 体型分类 + 色彩季型匹配
- `ml/services/intelligent_stylist_service.py` — GLM API 调用封装

### 移动端
- `apps/mobile/src/screens/OnboardingScreen.tsx` — 已有的新用户引导页
- `apps/mobile/src/screens/ProfileScreen.tsx` — 已有的个人资料页
- `apps/mobile/src/screens/RegisterScreen.tsx` — 已有的注册页
- `apps/mobile/src/screens/LoginScreen.tsx` — 已有的登录页

### 项目文档
- `.planning/REQUIREMENTS.md` — 完整需求列表（PROF-01 ~ PROF-13）
- `.planning/PROJECT.md` — 项目架构决策和技术栈

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Auth 模块**: 完整的 JWT 认证（access + refresh token rotation + bcrypt），可直接扩展微信登录
- **Profile 模块**: 完整的体型分析引擎（5种体型分类 + BMI + 腰臀比 + 色彩季型分析指导），无需重写
- **Photos 模块**: 完整的安全上传管道（EXIF stripping + 恶意软件扫描 + AES 加密 + MinIO 存储 + 异步 AI 分析 + 重试），可直接复用
- **Style-Profiles 模块**: 行为学习驱动的风格档案（关键词/调色板/置信度评分），已实现
- **Privacy 模块**: GDPR/PIPL 合规（同意记录/数据导出/删除请求/审计日志），可直接使用
- **OnboardingScreen**: 已有的引导页，可扩展为多步骤引导流程
- **body_analyzer.py**: MediaPipe 33关键点提取 + 体型比例计算 + 体型分类 + 适配建议

### Established Patterns
- **Zustand + TanStack Query**: 移动端状态管理（auth store 已有）
- **NestJS Guards/Interceptors**: 后端认证/限流/日志模式
- **Redis 缓存**: 带 typed key builder 的缓存基础设施
- **BullMQ 队列**: 异步任务处理（body analysis, photo processing）

### Integration Points
- Auth 模块 → 扩展微信 OAuth2.0 登录
- Profile 模块 → 新增实时参考线引导的前端交互
- Photos 模块 → 新增质量检测前置校验
- Style-Profiles 模块 → 新增图片选择式风格测试入口
- OnboardingScreen → 重构为多步骤引导流程（基本信息 → 照片 → 风格测试）

</code_context>

<specifics>
## Specific Ideas

- 拍照引导参考小米证件照的实时参考线体验
- 风格测试参考 Stitch Fix 和 WEAR 的图片选择式问卷
- 色彩季型四型系统（春夏秋冬）+ 暖冷×浅深细分维度
- 画像可视化报告支持生成分享海报，类似"你的时尚人格测试报告"
- 首页"完善画像解锁个性化推荐"的提示机制，引导用户补全数据

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---
*Phase: 01-user-profile-style-test*
*Context gathered: 2026-04-13*
