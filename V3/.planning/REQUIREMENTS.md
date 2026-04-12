# Requirements: AiNeed V3

**Defined:** 2026-04-12
**Core Value:** AI 理解用户意图 + 画像 + 衣橱 -> 生成搭配方案 -> 可视化 -> 定制 -> 分享

## v1 Requirements

### 认证 (AUTH)

- [x] **AUTH-01**: 用户通过手机号+短信验证码注册/登录
- [x] **AUTH-02**: JWT Token 刷新机制
- [x] **AUTH-03**: 登出功能

### 用户管理 (USER)

- [x] **USER-01**: 用户资料查看和修改（昵称/头像/身高/体重等）
- [x] **USER-02**: 头像上传
- [x] **USER-03**: 风格偏好设置

### 服装目录 (CLOTH)

- [x] **CLOTH-01**: 服装列表（分页+过滤+排序）
- [x] **CLOTH-02**: 服装详情
- [x] **CLOTH-03**: 服装搜索（ES + Qdrant 向量搜索）
- [x] **CLOTH-04**: 个性化推荐
- [x] **CLOTH-05**: 首页 Feed

### AI 造型师 (AI)

- [x] **AI-01**: 创建/管理聊天会话
- [x] **AI-02**: 发送消息 + SSE 流式回复
- [x] **AI-03**: GLM-5 + DeepSeek 双 Provider
- [x] **AI-04**: 知识图谱（Neo4j）时尚规则支持
- [x] **AI-05**: 推荐引擎（内容+协同+热门）
- [x] **AI-06**: FashionCLIP + BGE-M3 向量嵌入

### Q 版形象 (AVATAR)

- [x] **AVATAR-01**: 形象模板管理（管理员）
- [x] **AVATAR-02**: 用户创建/编辑形象参数
- [x] **AVATAR-03**: 换装映射（clothing_map 颜色+类型）
- [x] **AVATAR-04**: 缩略图上传

### 搭配方案 (OUTFIT)

- [x] **OUTFIT-01**: 搭配方案 CRUD
- [x] **OUTFIT-02**: 搭配-服装关联管理
- [x] **OUTFIT-03**: 文生图搭配可视化（GLM-5 API）

### 衣橱与收藏 (WARD)

- [x] **WARD-01**: 用户衣橱管理（添加/删除/列表）
- [x] **WARD-02**: 衣橱统计
- [x] **WARD-03**: 收藏/取消收藏

### 服装定制 (CUSTOM)

- [x] **CUSTOM-01**: 产品模板管理
- [x] **CUSTOM-02**: 定制设计 CRUD
- [x] **CUSTOM-03**: 定制订单（EPROLO Mock）
- [x] **CUSTOM-04**: 设计市集（免费分享）
- [x] **CUSTOM-05**: AI 预审（pHash + FashionCLIP + IP 库）

### 高端定制 (BESPOKE)

- [x] **BESP-01**: 工作室入驻/管理
- [x] **BESP-02**: 定制订单提交/管理
- [x] **BESP-03**: 工作室-用户在线沟通
- [x] **BESP-04**: 报价/确认/支付流程
- [x] **BESP-05**: 定制评价

### 社区 (COMM)

- [x] **COMM-01**: 帖子发布/查看/删除
- [x] **COMM-02**: 评论/点赞/分享
- [x] **COMM-03**: 关注/粉丝系统
- [x] **COMM-04**: 私信系统
- [x] **COMM-05**: 通知系统

### 体型分析 (BODY)

- [x] **BODY-01**: 上传照片分析体型
- [x] **BODY-02**: 体型档案管理

### 基础设施 (INFRA)

- [x] **INFRA-01**: 文件上传（MinIO）
- [x] **INFRA-02**: 健康检查端点
- [x] **INFRA-03**: WebSocket 网关
- [x] **INFRA-04**: API 限流
- [x] **INFRA-05**: Docker Compose 开发/预发/生产配置
- [x] **INFRA-06**: GitHub Actions CI/CD

### 质量保证 (QUAL)

- [ ] **QUAL-01**: 后端测试覆盖率达到 80%+
- [ ] **QUAL-02**: 5 个 0% 覆盖率模块完成测试
- [ ] **QUAL-03**: 12 个低覆盖率模块提升到 80%+
- [ ] **QUAL-04**: 6 条 E2E 关键流程测试
- [ ] **QUAL-05**: 安全审计无高危漏洞
- [ ] **QUAL-06**: API P95 响应时间 < 500ms

### 部署 (DEPLOY)

- [ ] **DEPLOY-01**: 全服务 Docker 启动验证
- [ ] **DEPLOY-02**: 移动端构建导出
- [ ] **DEPLOY-03**: CI/CD 管线全绿

## v2 Requirements

### 高级功能 (ADV)

- **ADV-01**: 真实 VTO 虚拟试衣（阿里云百炼 OutfitAnyone）
- **ADV-02**: 搭配兼容性 GNN 训练（Polyvore 数据集）
- **ADV-03**: FashionCLIP LoRA 微调
- **ADV-04**: 淘宝/京东 CPS 电商导购对接
- **ADV-05**: iOS App Store 上架
- **ADV-06**: 序列推荐模型（SASRec）
- **ADV-07**: 文生视频搭配展示（Kling API）

## Out of Scope

| Feature | Reason |
|---------|--------|
| Spine 2D / Blender | 已替换为 react-native-skia 动态绘制 |
| MediaPipe Face Mesh | 已移除，Q 版形象不需要 |
| 自部署 AnyDressing | 已替换为 GLM-5 文生图 API |
| HICUSTOM POD | 已替换为 EPROLO |
| 首饰定制 | MVP 延后，只做服装+包+手机壳+帽子 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01~03 | Phase 2 | Complete |
| USER-01~03 | Phase 2 | Complete |
| CLOTH-01~05 | Phase 2 | Complete |
| AI-01~06 | Phase 3 | Complete |
| AVATAR-01~04 | Phase 2.5 | Complete |
| OUTFIT-01~03 | Phase 3,5 | Complete |
| WARD-01~03 | Phase 2 | Complete |
| CUSTOM-01~05 | Phase 4.5,5 | Complete |
| BESP-01~05 | Phase 5 | Complete |
| COMM-01~05 | Phase 5 | Complete |
| BODY-01~02 | Phase 5 | Complete |
| INFRA-01~06 | Phase 1,7 | Complete |
| QUAL-01~06 | Phase 6 | Pending |
| DEPLOY-01~03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 46 total
- Complete: 37
- Pending: 9
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after GSD initialization*
