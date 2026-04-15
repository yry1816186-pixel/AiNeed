# Phase 1: 用户画像 & 风格测试 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 01-user-profile-style-test
**Areas discussed:** 注册流程, 照片上传, 风格测试, 引导链路, 项目路线图重构, 跨切面架构决策

---

## 路线图重构

| Option | Description | Selected |
|--------|-------------|----------|
| 8 Phase 方案 | 社区从v2提前到Phase6，新增定制+扫码和私人顾问 | ✓ |
| 7 Phase 方案 | 合并定制/扫码/私人顾问为一个Phase | |
| 6 Phase 方案 | 社区提前，定制/扫码/私人顾问仍放v2 | |

**User's choice:** 8 Phase 方案
**Notes:** 用户认为社区功能后端已完整实现，应提前到MVP

---

## 注册方式

| Option | Description | Selected |
|--------|-------------|----------|
| 手机号+验证码 | 国内标准，需阿里云/腾讯云短信 | ✓ |
| 微信一键登录 | 最低摩擦力，需微信开放平台认证 | ✓ |
| 邮箱注册 | 传统方式，国内用户不常用 | |

**User's choice:** 手机号+验证码 + 微信一键登录
**Notes:** 两种都支持

---

## 引导策略

| Option | Description | Selected |
|--------|-------------|----------|
| 强制引导 | 必须完成画像和风格测试才能进入主页 | ✓ |
| 可跳过引导 | 引导可跳过，首页提示补全 | |
| 完全自愿 | 直接进入主页，用内容引导 | |

**User's choice:** 强制引导
**Notes:** 后来结合最短链路选择，最终为：基本信息必填，照片/风格测试可选但首页提示

---

## 拍照引导

| Option | Description | Selected |
|--------|-------------|----------|
| 实时参考线引导 | 人体轮廓参考线+姿势提示 | ✓ |
| 示例照片对比 | 展示标准参考照片模仿 | |
| 简单文字提示 | 文字要求，无微交互 | |

**User's choice:** 实时参考线引导

---

## 照片存储

| Option | Description | Selected |
|--------|-------------|----------|
| 用完即删 | 分析后删除原图 | |
| 保留30天 | 加密保留30天后删除 | |
| 永久保留（用户可删） | 加密永久保留，用于后续试衣 | ✓ |

**User's choice:** 永久保留（用户可删）
**Notes:** 考虑到虚拟试衣需要原始照片

---

## 风格测试形式

| Option | Description | Selected |
|--------|-------------|----------|
| 图片选择式 | 4-6张图片点选，类似Stitch Fix | ✓ |
| 滑动对比式 | Tinder式左右滑动 | |
| 文字选择题 | 传统选择题 | |
| 混合式 | 图片+文字混合 | |

**User's choice:** 图片选择式
**Notes:** 用户强调"不要问太多影响使用感受"，控制在5-8题

---

## 问卷维度

| Option | Description | Selected |
|--------|-------------|----------|
| 场合偏好 | 工作/约会/运动等 | ✓ |
| 色彩偏好（隐性推导） | 从图片选择推导 | ✓ |
| 风格关键词 | 简约/街头/复古等 | ✓ |
| 价格区间 | 预算范围 | ✓ |

**User's choice:** 全部4个维度
**Notes:** 但控制总题数在5-8题

---

## 引导链路

| Option | Description | Selected |
|--------|-------------|----------|
| 完整链路 | 注册→基本信息→照片→风格测试→画像结果→首页 | |
| 最短链路 | 基本信息→跳过照片/测试→首页提示补全 | ✓ |
| 自助选择 | 用户自选步骤 | |

**User's choice:** 最短链路
**Notes:** 与"强制引导"结合：基本信息必填，其他可跳过

---

## 画像结果展示

| Option | Description | Selected |
|--------|-------------|----------|
| 可视化报告+分享 | 风格标签+色彩调色板+推荐示例+分享海报 | ✓ |
| 简洁卡片式 | 关键信息一目了然 | |
| 文字报告 | 文字为主详细分析 | |

**User's choice:** 可视化报告+分享

---

## Phase 2 讨论汇总

| Area | Decision |
|------|----------|
| 方案展示 | 整体效果图+单品卡片列表 |
| 单品替换 | 弹出同类商品列表（按画像过滤） |
| 输入方式 | MVP：文字+场景快捷按钮 |
| 推荐理由 | 可折叠理由卡片 |
| 对话历史 | 按日归档 |

---

## Phase 3 讨论汇总

| Area | Decision |
|------|----------|
| 生成API | Doubao-Seedream（主）+ GLM（备） |
| 质量保证 | 用户判断+每日3次免费重试 |

---

## Phase 4 讨论汇总

| Area | Decision |
|------|----------|
| 信息流 | 小红书式双列瀑布流 |
| 算法 | 渐进式（规则→AI→协同过滤） |
| 冷启动 | 基于画像的通用推荐 |

---

## Phase 5 讨论汇总

| Area | Decision |
|------|----------|
| 商家体系 | 平台自营+合作商家（审核制） |
| 图片搜索 | GLM视觉理解+属性匹配 |

---

## Phase 6 讨论汇总

| Area | Decision |
|------|----------|
| 社区定位 | 穿搭内容社区 |
| 博主体系 | 自然分化 |
| 博主商品 | 支持上架销售，平台抽成 |
| 发帖形式 | 小红书式（9图+标签） |
| 灵感衣橱 | 自定义分类+拖拽排序 |

---

## Phase 7 讨论汇总

| Area | Decision |
|------|----------|
| 定制编辑器 | 2D模板拖拽编辑 |
| 品牌扫码 | 合作品牌专属二维码 |
| 定制流程 | 设计→报价→确认→制作→配送 |

---

## Phase 8 讨论汇总

| Area | Decision |
|------|----------|
| 商业模式 | 平台撮合 |
| 功能范围 | 匹配+通讯+支付+评价（全选） |

---

## Supplementary Deep-Dive: 跨切面架构决策 (2026-04-13)

### 数据模型策略

| Option | Description | Selected |
|--------|-------------|----------|
| 按 Phase 逐步加模型 | 每个 Phase 开始前加对应模型 | |
| 一次性补齐所有 Phase 模型 | 所有新模型一次加到 schema | ✓ |
| P0+P1 一起加，其余后补 | Phase 1-4 模型一次加，5-8 后续 | |

**User's choice:** 一次性补齐
**Notes:** 前期集中但后续不阻塞

### 订阅/会员体系

| Option | Description | Selected |
|--------|-------------|----------|
| MVP 全免费，后续再加会员 | Phase 1-4 免费使用 | ✓ |
| 免费+基础限制，付费解锁 | 免费用户有限制，付费解锁 | |
| 完全免费+邀请制内测 | 邀请码控制用户量 | |

**User's choice:** MVP 全免费
**Notes:** 后续付费档位设计为两档：免费 + Pro（29-49元/月）

### AI 成本与配额

| Option | Description | Selected |
|--------|-------------|----------|
| 用户维度限制 | 每用户每日 AI N次、试衣 M次 | ✓ |
| 全局预算熔断 | 平台总预算超限后降级 | |
| 弹性无硬限制 | 不限制，监控成本 | |

**User's choice:** 用户维度限制 + 全局预算熔断

### AI 次数限制

| Option | Description | Selected |
|--------|-------------|----------|
| 保守：AI 10次 + 试衣 3次 | 平衡体验与成本 | ✓ |
| 宽松：AI 20次 + 试衣 5次 | 用户更自由，成本高 | |
| 严格：AI 5次 + 试衣 2次 | 最低成本 | |

**User's choice:** 保守：AI 10次 + 试衣 3次

### API 版本化

| Option | Description | Selected |
|--------|-------------|----------|
| URL Path /api/v1/ | 标准做法，NestJS 生态最标准 | ✓ |
| Header 版本化 | URL 更干净，多版本复杂 | |
| MVP 不版本化 | 先不版本化，后续再加 | |

**User's choice:** URL Path /api/v1/（Claude 选定最优方案）

### API 响应格式

| Option | Description | Selected |
|--------|-------------|----------|
| 标准信封式 | success + data + error + meta | |
| 简化式 | 成功返 data，失败返 error | |
| JSON:API 规范式 | 遵循 JSON:API 标准 | ✓ |

**User's choice:** JSON:API 规范式

### 分页策略

| Option | Description | Selected |
|--------|-------------|----------|
| Offset 分页 | 传统，支持跳页 | |
| Cursor 分页 | 游标式，适合无限滚动 | ✓ |
| 混合策略 | 信息流 Cursor，管理后台 Offset | |

**User's choice:** Cursor 分页

### 空状态设计

| Option | Description | Selected |
|--------|-------------|----------|
| 引导式空状态 | 图标 + 文案 + 行动按钮 | ✓ |
| 简单文字提示 | 无行动按钮 | |
| 插画式空状态 | 动画/插画 + 文案 | |

**User's choice:** 引导式空状态

### 加载状态

| Option | Description | Selected |
|--------|-------------|----------|
| 骨架屏 | 模拟内容结构，感知更快 | ✓ |
| Spinner 加载中 | 简单但感知等待长 | |
| 混合策略 | 列表骨架屏，详情 spinner | |

**User's choice:** 骨架屏

### 深色模式

| Option | Description | Selected |
|--------|-------------|----------|
| MVP 只做浅色模式 | 减少50%样式工作量 | ✓ |
| MVP 就支持深色模式 | 双份颜色定义 | |
| 跟随系统设置 | 不单独做深色设计稿 | |

**User's choice:** MVP 只做浅色模式

### 网络异常

| Option | Description | Selected |
|--------|-------------|----------|
| 简单网络错误提示 | "网络不给力" + 重试按钮 | ✓ |
| 缓存优先 + 过期提示 | 展示过期数据 + 后台重试 | |
| 完整离线缓存 | AsyncStorage 缓存关键数据 | |

**User's choice:** 简单网络错误提示

### 图片加载策略

| Option | Description | Selected |
|--------|-------------|----------|
| 渐进式加载 | 缩略图→高清图，需后端多尺寸 | ✓ |
| 统一中等质量 | 简单但大图模糊 | |
| BlurHash 占位 + 渐入 | 体验最佳但开发量大 | |

**User's choice:** 渐进式加载

### 长列表优化

| Option | Description | Selected |
|--------|-------------|----------|
| FlashList | Shopify 出品，快10倍 | ✓ |
| FlatList | 内置，性能一般 | |
| RecyclerListView | 最成熟但包大 | |

**User's choice:** FlashList

### 无障碍设计

| Option | Description | Selected |
|--------|-------------|----------|
| 基本合规 | accessibilityLabel，满足上架要求 | ✓ |
| 完整无障碍支持 | 屏幕阅读器、高对比度、大字体 | |
| 暂不考虑 | 后续补 | |

**User's choice:** 基本合规

### 错误重试

| Option | Description | Selected |
|--------|-------------|----------|
| 统一重试机制 | 每个操作有重试按钮，自动重试1-2次 | ✓ |
| 关键操作重试 | 仅支付/上传 | |
| 全局自动重试 | 最多3次，可能重复请求 | |

**User's choice:** 统一重试机制

### PII 加密范围

| Option | Description | Selected |
|--------|-------------|----------|
| 选择性字段加密 | 手机号、姓名、身份证号 | ✓ |
| 全量 PII 加密 | 所有个人信息，查询性能差 | |
| 最小加密集 | 仅照片和支付信息 | |

**User's choice:** 选择性字段加密

### 密钥管理

| Option | Description | Selected |
|--------|-------------|----------|
| 环境变量 (.env) | 简单但安全性一般 | |
| 云 KMS 服务 | 安全但增加依赖 | |
| 自建 Vault | 最灵活但运维成本高 | ✓ |

**User's choice:** 自建 Vault

### 移动端安全

| Option | Description | Selected |
|--------|-------------|----------|
| 证书锁定 SSL Pinning | 防中间人攻击 | ✓ |
| 越狱/Root 检测 | 检测越狱设备 | ✓ |
| 安全存储敏感数据 | expo-secure-store | ✓ |
| 防篡改检测 | 防破解 | ✓ |

**User's choice:** 全部4项（多选）

### AI 内容审核

| Option | Description | Selected |
|--------|-------------|----------|
| 关键词过滤 + 抽样人工 | 低成本高覆盖 | ✓ |
| 实时 GLM 安全审核 | 实时但增加延迟和成本 | |
| 举报触发审核 | 成本最低但风险高 | |

**User's choice:** 关键词过滤 + 抽样人工

### 测试覆盖率

| Option | Description | Selected |
|--------|-------------|----------|
| 目标 80% 覆盖率 | 行业标准 | |
| 关键流程优先，50%+ | 快速迭代 | |
| TDD 严格模式，90%+ | 质量最高但开发慢 | ✓ |

**User's choice:** TDD 严格模式，90%+

### E2E 框架

| Option | Description | Selected |
|--------|-------------|----------|
| Detox | React Native 专用，生态成熟 | ✓ |
| Maestro | 新一代，轻量 | |
| MVP 只做后端测试 | 无移动端 E2E | |
| Playwright / Appium | 通用方案 | |

**User's choice:** Detox

### AI Mock 策略

| Option | Description | Selected |
|--------|-------------|----------|
| 录制/回放 | 录真实响应存 fixture，测试时回放 | ✓ |
| 静态 Fixture | 手动写 mock JSON | |
| 本地小模型替代 | Ollama，CI 复杂 | |

**User's choice:** 录制/回放

### 负载测试

| Option | Description | Selected |
|--------|-------------|----------|
| MVP 目标 1000 并发 | 用 k6 或 Artillery | ✓ |
| 先 500 并发 | 先跑通再优化 | |
| 暂不压测 | 上线后根据监控优化 | |

**User's choice:** MVP 目标 1000 并发

### Admin 后台方案

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 Admin Web | React + Ant Design | ✓ |
| Prisma Studio + pgAdmin | 零开发量但功能有限 | |
| App 内嵌管理页 | 不额外开发 Web | |
| 低代码平台生成 | Appsmith/Refine | |

**User's choice:** 独立 Admin Web（React + Ant Design）
**Notes:** MVP 功能：用户管理 + 风格测试题库管理 + 商家与商品管理 + 内容与社区管理

### 埋点事件范围

| Option | Description | Selected |
|--------|-------------|----------|
| 核心漏斗 | 10-15 个事件 | |
| 全量埋点 | 50+ 事件 | ✓ |
| 暂不埋点 | 先跑通功能 | |

**User's choice:** 全量埋点

### Feature Flag

| Option | Description | Selected |
|--------|-------------|----------|
| Feature Flag 系统 | Unleash 或自建，支持灰度和 A/B | ✓ |
| 数据库配置表 | SystemConfig 存 flag | |
| 不做灰度，直接发版 | git branch 控制 | |

**User's choice:** Feature Flag 系统

### 监控告警

| Option | Description | Selected |
|--------|-------------|----------|
| 基础告警 | Grafana + Prometheus 关键阈值 | |
| 完整可观测性 | Grafana + Prometheus + Loki + AlertManager | ✓ |
| 商业 APM 服务 | Datadog / 阿里云 ARMS | |

**User's choice:** 完整可观测性

### 商家佣金

| Option | Description | Selected |
|--------|-------------|----------|
| 固定比例 10-15% | 简单直接 | |
| 按类目区分比例 | 灵活但复杂 | |
| 阶梯式（按销量） | 鼓励商家做大 | ✓ |

**User's choice:** 阶梯式（<5万抽5%，5-20万抽10%，>20万抽15%）

### 定制定价

| Option | Description | Selected |
|--------|-------------|----------|
| 成本 + 固定加价率 | 基础成本 + 人工费 + 平台服务费20% | ✓ |
| 固定价格表 | 按衣服类型固定价 | |
| 人工报价 | 手动填写 | |

**User's choice:** 成本 + 固定加价率

### 顾问抽成

| Option | Description | Selected |
|--------|-------------|----------|
| 平台抽 15-20% | 行业标准 | ✓ |
| 低抽成 10% | 吸引顾问入驻 | |
| MVP 免抽成 | 早期不抽成 | |

**User's choice:** 平台抽 15-20%

### 顾问付款

| Option | Description | Selected |
|--------|-------------|----------|
| 30% 定金 + 70% 尾款 | 平衡双方风险 | ✓ |
| 50/50 分割 | 更平衡但用户风险高 | |
| 一次性付清 | 用户友好但顾问风险大 | |

**User's choice:** 30% 定金 + 70% 尾款

### AI 宕机处理

| Option | Description | Selected |
|--------|-------------|----------|
| 降级提示 + 静态参考 | "AI正在休息" + 预设参考 | ✓ |
| 简单提示稍后重试 | 不做替代展示 | |
| 智能降级 | 缓存 + 热门方案 | |

**User's choice:** 降级提示 + 静态参考

### 支付对账

| Option | Description | Selected |
|--------|-------------|----------|
| 对账任务 + 主动查询 | 每小时对账 + Redis 锁 | ✓ |
| 依赖回调通知 | 可能漏单 | |
| 超时自动关单 | 简单可靠 | |

**User's choice:** 对账任务 + 主动查询

### 风格测试中断

| Option | Description | Selected |
|--------|-------------|----------|
| 自动保存进度 | 每题保存，重新进入继续 | ✓ |
| 退出重新开始 | 简单但影响完成率 | |
| 全完成才保存 | 进度不保存 | |

**User's choice:** 自动保存进度

### 举报处理

| Option | Description | Selected |
|--------|-------------|----------|
| 先隐藏再审核 | 举报即隐藏，24h内处理 | |
| 累积举报触发 | 3次举报后隐藏 + 审核 | ✓ |
| 纯人工处理 | 不可规模化 | |

**User's choice:** 累积举报触发（3次）

### 季节性推荐

| Option | Description | Selected |
|--------|-------------|----------|
| 天气驱动 + 季节标签 | 实时天气调整推荐权重 | ✓ |
| 手动季节配置 | 每月手动配置 | |
| 历史数据推导 | 需要数据积累 | |

**User's choice:** 天气驱动 + 季节标签

### 趋势衰减

| Option | Description | Selected |
|--------|-------------|----------|
| 时间衰减函数 7/30 天 | 7天最高，30天衰减 | ✓ |
| 不处理时间衰减 | 可能推过时内容 | |
| 人工标记趋势 | 需运营 | |

**User's choice:** 时间衰减函数（7天最高，30天衰减）

### 退款策略

| Option | Description | Selected |
|--------|-------------|----------|
| 未发货可退，已发货不退 | 简单明确 | |
| 7天无理由退货 | 标准电商但复杂 | |
| 仅质量问题可退 | 需图片证据 | ✓ |

**User's choice:** 仅质量问题可退

### 商家违规处罚

| Option | Description | Selected |
|--------|-------------|----------|
| 三级处罚机制 | 1次警告，2次下架7天，3次封店 | ✓ |
| 违规即封店 | 严格但可能误伤 | |
| 人工逐个处理 | 灵活但效率低 | |

**User's choice:** 三级处罚机制

### 顾问取消规则

| Option | Description | Selected |
|--------|-------------|----------|
| 24h 规则 + 扣款补偿 | 提前24h免费，24h内扣定金20% | ✓ |
| 随时取消 + 全额退款 | 顾问无约束 | |
| 顾问不可取消 | 保证服务但限制大 | |

**User's choice:** 24h 规则 + 扣款补偿

### AI 限流提示

| Option | Description | Selected |
|--------|-------------|----------|
| 倒计时 + 引导升级 | "今日额度已用完" + 倒计时 + Pro引导 | ✓ |
| 简单提示明天再来 | 不引导付费 | |
| 超出按次付费 | 灵活但 MVP 复杂 | |

**User's choice:** 倒计时 + 引导升级

### CI/CD

| Option | Description | Selected |
|--------|-------------|----------|
| 完善现有 GitHub Actions | PR 自动测试 + merge 自动部署 | ✓ |
| 自建 CI/CD | Jenkins/GitLab CI | |
| 手动部署 | 效率低 | |

**User's choice:** 完善现有 GitHub Actions

### 部署环境

| Option | Description | Selected |
|--------|-------------|----------|
| 三环境 | dev → staging → production | ✓ |
| 两环境 | dev + production | |
| 本地 + 生产 | 最快但风险大 | |

**User's choice:** 三环境分离

### 日志标准

| Option | Description | Selected |
|--------|-------------|----------|
| 结构化 JSON 日志 | Winston/Pino，timestamp+level+service+traceId | ✓ |
| 简单文本日志 | 难以搜索 | |
| ELK 全家桶 | 完整但复杂 | |

**User's choice:** 结构化 JSON 日志

### DB 备份

| Option | Description | Selected |
|--------|-------------|----------|
| 云厂商自动备份 | 每日全量 + 每小时 WAL，保留30天 | ✓ |
| 自建备份脚本 | 需维护 | |
| 暂不备份 | 风险高 | |

**User's choice:** 云厂商自动备份

---

## Claude's Discretion

- 手机验证码服务商选择
- 参考线引导的具体UI实现方式
- 风格测试图片素材来源和分类
- 可视化报告的UI布局和图表类型
- 分享海报模板设计
- Feature Flag 系统具体选型（Unleash vs 自建）
- Vault 部署和配置细节
- Detox 配置和测试场景设计
- FlashList 瀑布流组件封装
- 渐进式图片加载的后端多尺寸生成策略
- JSON:API 规范的 NestJS 序列化方案
- 全量埋点的具体事件分类和命名规范
- Admin 后台的路由和权限设计
- 录制/回放 AI mock 的 fixture 管理策略

## Deferred Ideas

None — all discussed items fit within the 8-phase roadmap
