# Phase 8: 私人形象顾问对接 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 08-private-consultant
**Areas discussed:** 顾问匹配方式, 即时通讯架构, 预约与排期, 评价与信任体系

---

## 顾问匹配方式

| Option | Description | Selected |
|--------|-------------|----------|
| 智能匹配优先 | 用户提交需求后，系统基于画像+需求关键词自动推荐 3-5 个最合适的顾问，用户从中选择 | ✓ |
| 用户自主浏览 | 用户自主浏览顾问列表，按分类/评分/价格筛选 | |
| 混合模式 | 两种入口并行，覆盖不同场景 | |

**User's choice:** 智能匹配优先
**Notes:** 类似滴滴派单但用户有选择权

### 匹配维度

| Option | Description | Selected |
|--------|-------------|----------|
| 四维匹配 | 用户画像 + 需求关键词 + 顾问专长领域 + 地理位置 | ✓ |
| 三维匹配 | 需求关键词 + 顾问专长 + 评分，不考虑地理位置 | |
| 二维匹配 | 仅需求关键词 + 顾问专长 | |

**User's choice:** 四维匹配
**Notes:** 最全面，权重可配置

### 匹配结果展示

| Option | Description | Selected |
|--------|-------------|----------|
| 3-5 候选 + 匹配理由 | 每个显示匹配度百分比 + 匹配理由 | ✓ |
| 单推最优 | 只推荐 1 个最优顾问 | |
| 5-10 候选 | 更多选择但决策负担大 | |

**User's choice:** 3-5 候选 + 匹配理由

---

## 即时通讯架构

### WS 架构

| Option | Description | Selected |
|--------|-------------|----------|
| 新建 Chat Gateway | 新建 /ws/chat 命名空间，专门处理聊天消息实时推送 | ✓ |
| 复用 App Gateway | 复用 /ws/app Gateway，添加聊天事件类型 | |
| REST 轮询优先 | MVP 先用 REST 轮询，后续再加 WebSocket | |

**User's choice:** 新建 Chat Gateway
**Notes:** 与现有 /ws/app 和 /ws/ai 隔离，职责清晰

### 消息类型

| Option | Description | Selected |
|--------|-------------|----------|
| 四类消息 | 文字 + 图片 + 文件 + 系统消息 | ✓ |
| 文字 + 系统消息 | MVP 最小化 | |
| 文字 + 图片 + 系统 | 文件后续补充 | |

**User's choice:** 四类消息
**Notes:** 复用 Prisma MessageType 枚举和 ChatBubble 组件

### 方案文件分享

| Option | Description | Selected |
|--------|-------------|----------|
| 消息内嵌方案卡片 | 顾问创建方案文档，作为特殊消息类型发送，用户可保存到灵感衣橱 | ✓ |
| 方案独立页面 + 链接 | 方案作为独立页面，聊天中只发链接 | |

**User's choice:** 消息内嵌方案卡片

### 已读回执

| Option | Description | Selected |
|--------|-------------|----------|
| 已读回执 | 显示已读/未读状态，复用 Prisma isRead + readAt | ✓ |
| 仅已发送状态 | 只显示已发送，不显示对方是否已读 | |
| MVP 不做 | 后续补充 | |

**User's choice:** 已读回执

### 离线消息

| Option | Description | Selected |
|--------|-------------|----------|
| 上线拉取 + 实时推送 | 上线后 REST API 拉取未读消息，之后 WebSocket 实时推送 | ✓ |
| 纯实时 + 推送通知 | 离线消息通过推送通知补位 | |
| 纯拉取模式 | 每次打开都从服务器拉取 | |

**User's choice:** 上线拉取 + 实时推送

---

## 预约与排期

### 排期模式

| Option | Description | Selected |
|--------|-------------|----------|
| 时段模板 + 自动冲突检测 | 顾问设置每周可用时段模板，系统自动检测冲突，类似 Calendly | ✓ |
| 手动添加时段 | 顾问手动添加每个可用时段 | |
| 用户提议 + 顾问确认 | 用户提交期望时间，顾问确认或调整 | |

**User's choice:** 时段模板 + 自动冲突检测

### 日历视图

| Option | Description | Selected |
|--------|-------------|----------|
| 日历 + 时段列表 | 日历视图 + 点击日期显示当日可用时段列表 | ✓ |
| 纯时段列表 | 只显示可用时段列表 | |
| 日历 + 时间轴 | 日历视图 + 时间轴拖拽选择 | |

**User's choice:** 日历 + 时段列表

### 服务形式

| Option | Description | Selected |
|--------|-------------|----------|
| 线上为主 | MVP 以线上视频/语音咨询为主，线下见面为辅 | ✓ |
| 线上线下并重 | 需要地理位置匹配和线下场地管理 | |
| 纯线上 | 仅支持线上咨询 | |

**User's choice:** 线上为主

---

## 评价与信任体系

### 评价模型

| Option | Description | Selected |
|--------|-------------|----------|
| 多维评价 | 1-5 星 + 文字 + 标签 + before/after 图片 | ✓ |
| 简单评价 | 1-5 星 + 文字 | |
| 中等评价 | 1-5 星 + 文字 + 标签，无图片 | |

**User's choice:** 多维评价

### 排名逻辑

| Option | Description | Selected |
|--------|-------------|----------|
| 综合加权排名 | 评分 40% + 订单数 20% + 回复速度 20% + 匹配度 20% | ✓ |
| 纯评分排序 | 简单但新顾问难以曝光 | |
| 评分 + 活跃度 | 偏向活跃顾问 | |

**User's choice:** 综合加权排名

### 入驻审核

| Option | Description | Selected |
|--------|-------------|----------|
| 资质 + 作品集审核 | 提交个人信息 + 从业经验 + 作品集 + 资质证书 | ✓ |
| 简单审核 | 仅提交基本信息 | |
| 开放注册 + 评价筛选 | 任何人都可注册，通过评价自然筛选 | |

**User's choice:** 资质 + 作品集审核

### 案例展示

| Option | Description | Selected |
|--------|-------------|----------|
| 卡片式案例展示 | before/after 对比图 + 服务类型标签 + 客户评价摘要 + 价格参考 | ✓ |
| 列表式 | 信息密度低 | |
| 轮播图式 | 视觉冲击力强但信息量少 | |

**User's choice:** 卡片式案例展示

---

## Claude's Discretion

- 四维匹配算法的具体权重和评分公式
- Chat Gateway 的具体事件协议设计
- 顾问时段模板的 Prisma 模型设计
- 评价标签的具体列表
- 结算/提现的具体实现方案
- 顾问入驻审核的 Admin 后台界面

## Deferred Ideas

None — discussion stayed within phase scope
