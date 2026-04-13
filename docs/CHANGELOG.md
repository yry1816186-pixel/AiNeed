# xuno 变更日志

本项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 计划中

- AR 虚拟试衣功能
- 多语言国际化支持
- 小程序版本开发
- 开放 API 平台

---

## [2.0.0] - 2024-03-12

### 新增 (Added)

#### AI 造型师模块

- 基于 GLM-5 的智能对话服务
- 会话状态机管理
- 槽位填充系统
- 多轮对话上下文支持

#### 身体档案模块

- 照片上传与分析功能
- 体型自动识别（H/A/Y/X/O 五种类型）
- 肤色分析（六档肤色）
- 色彩季型诊断（春夏秋冬）
- 脸型识别

#### 推荐系统

- 多策略融合推荐算法
- 规则匹配推荐
- 协同过滤推荐
- FashionCLIP 向量相似检索
- 序列推荐（SASRec）

#### 虚拟试衣

- IDM-VTON 扩散模型集成
- 异步任务队列处理
- 试衣结果存储与管理
- WebSocket 进度推送

#### 社区功能

- 穿搭笔记发布
- 用户关注系统
- 点赞与评论
- 商品标签关联

#### 购物系统

- 购物车管理
- 订单创建与管理
- 支付宝/微信支付集成
- 物流追踪

#### 用户系统

- 邮箱/手机号注册登录
- JWT 双 Token 认证
- 用户档案管理
- 收藏功能
- 收货地址管理

### 优化 (Changed)

- 优化数据库查询性能
- 优化推荐算法准确率 (+36.5%)
- 优化图片上传处理流程
- 优化移动端 UI 响应速度

### 修复 (Fixed)

- 修复 Token 过期后自动刷新问题
- 修复图片上传偶发失败问题
- 修复推荐结果重复问题
- 修复支付回调验签问题

---

## [1.5.0] - 2024-02-15

### 新增 (Added)

- MinIO 对象存储集成
- Qdrant 向量数据库集成
- 基础推荐功能
- 用户行为追踪系统

### 优化 (Changed)

- 重构后端模块化架构
- 优化 API 响应格式
- 改进错误处理机制

### 修复 (Fixed)

- 修复数据库连接池泄漏
- 修复并发请求竞争条件

---

## [1.0.0] - 2024-01-01

### 新增 (Added)

- 项目初始化
- Monorepo 架构搭建
- 基础用户认证系统
- PostgreSQL 数据库设计
- Redis 缓存集成
- NestJS 后端框架搭建
- Next.js 前端框架搭建
- React Native 移动端框架搭建
- Docker 容器化部署支持

---

## 版本说明

### 版本号格式

- **主版本号 (MAJOR)**: 不兼容的 API 变更
- **次版本号 (MINOR)**: 向下兼容的功能新增
- **修订号 (PATCH)**: 向下兼容的问题修复

### 变更类型

| 类型 | 说明 |
|------|------|
| Added | 新增功能 |
| Changed | 功能变更 |
| Deprecated | 即将废弃的功能 |
| Removed | 已移除的功能 |
| Fixed | 问题修复 |
| Security | 安全相关修复 |

---

## 发布计划

### v2.1.0 (计划)

- [ ] 完善虚拟试衣效果
- [ ] 优化推荐算法
- [ ] 新增会员订阅体系
- [ ] 新增商家入驻功能

### v2.2.0 (计划)

- [ ] 社区功能增强
- [ ] 直播试衣功能
- [ ] AI 风格迁移

### v3.0.0 (远期)

- [ ] AR 试衣功能
- [ ] 自研推荐模型
- [ ] 国际化支持

---

## 贡献指南

### 提交规范

使用 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat(auth): 添加 OAuth 登录 |
| fix | Bug 修复 | fix(api): 修复 Token 验证问题 |
| docs | 文档更新 | docs: 更新 README |
| style | 代码格式 | style: 格式化代码 |
| refactor | 代码重构 | refactor: 重构推荐服务 |
| test | 测试相关 | test: 添加单元测试 |
| chore | 构建/工具 | chore: 更新依赖版本 |

#### Scope 范围

| 范围 | 说明 |
|------|------|
| auth | 认证模块 |
| ai | AI 服务 |
| api | API 接口 |
| ui | 用户界面 |
| db | 数据库 |
| deploy | 部署相关 |

### 提交示例

```bash
# 新功能
git commit -m "feat(ai-stylist): 添加多轮对话支持"

# Bug 修复
git commit -m "fix(auth): 修复 Token 刷新逻辑"

# 文档更新
git commit -m "docs(api): 更新 Swagger 文档"

# 重构
git commit -m "refactor(recommendation): 优化推荐算法性能"
```

---

## 贡献者

感谢所有为本项目做出贡献的开发者！

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](../LICENSE) 文件。

---

*最后更新: 2024-03-12*
