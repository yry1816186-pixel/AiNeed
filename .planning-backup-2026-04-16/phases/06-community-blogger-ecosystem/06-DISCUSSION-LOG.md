# Phase 6: 社区 & 博主生态 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 06-community-blogger-ecosystem
**Areas discussed:** 博主等级与权益, 博主商品上架流程, 内容审核与热门机制, 灵感衣橱导入与数据面板, 发帖流程细节, 收藏与关注信息流, 互动通知机制, 评论回复结构

---

## 博主等级与权益

| Option | Description | Selected |
|--------|-------------|----------|
| 纯粉丝数自动升级 | 基于粉丝数自动升级，无需申请 | |
| 粉丝数 + 申请认证 | 粉丝数达标后申请，平台审核 | |
| 综合评分自动升级 | 粉丝数 + 内容质量分综合评估 | ✓ |

**User's choice:** 综合评分自动升级

| Option | Description | Selected |
|--------|-------------|----------|
| 两档：博主 + 大V | 博主可上架商品+数据面板；大V额外推荐位+优先审核 | ✓ |
| 四档：渐进式 | 新手→优质创作者→博主→大V | |
| 无等级差异 | 不设等级，博主只是标签 | |

**User's choice:** 两档：博主 + 大V

| Option | Description | Selected |
|--------|-------------|----------|
| 四维度加权 | 粉丝数40%+互动率30%+内容数量20%+收藏率10% | ✓ |
| 双维度简化 | 粉丝数60%+互动率40% | |
| Claude 决定 | 自行决定维度和权重 | |

**User's choice:** 四维度加权

| Option | Description | Selected |
|--------|-------------|----------|
| 低门槛 | 博主：综合分≥60且粉丝≥500；大V：综合分≥80且粉丝≥5000 | ✓ |
| 高门槛 | 博主：综合分≥70且粉丝≥1000；大V：综合分≥90且粉丝≥10000 | |

**User's choice:** 低门槛

| Option | Description | Selected |
|--------|-------------|----------|
| 基础+进阶 | 博主：上架商品+数据面板+标识；大V：额外推荐位+优先审核+专属客服 | ✓ |
| 统一权益 | 博主和大V权益相同 | |

**User's choice:** 基础+进阶

| Option | Description | Selected |
|--------|-------------|----------|
| 定期重算+缓冲期 | 每月重算评分，不达标7天缓冲期后降级 | ✓ |
| 只升不降 | 不支持降级 | |

**User's choice:** 定期重算+缓冲期

---

## 博主商品上架流程

| Option | Description | Selected |
|--------|-------------|----------|
| 纯数字方案 | 博主上架穿搭搭配方案，轻量无库存 | |
| 数字方案 + 关联实体 | 可上架数字方案，也可关联平台实体商品 | ✓ |
| 仅关联实体商品 | 只能关联平台已有商品 | |

**User's choice:** 数字方案 + 关联实体

| Option | Description | Selected |
|--------|-------------|----------|
| 先审后上 | 提交后平台审核通过才上架 | |
| 先上后审 | 提交后立即上架，平台事后抽审 | ✓ |
| 免审核 | 直接上架无需审核 | |

**User's choice:** 先上后审

| Option | Description | Selected |
|--------|-------------|----------|
| 博主自由定价 | 数字方案1-99元，关联实体取原价 | ✓ |
| 平台指导价 | 平台建议价格区间 | |
| 数字方案免费 | 仅通过实体商品佣金变现 | |

**User's choice:** 博主自由定价

| Option | Description | Selected |
|--------|-------------|----------|
| 社区内闭环 | 复用Phase 5支付和订单系统 | ✓ |
| 跳转电商模块 | 跳转到电商模块购买 | |

**User's choice:** 社区内闭环

| Option | Description | Selected |
|--------|-------------|----------|
| 融入内容场景 | 博主主页"TA的方案"tab + 帖子详情"购买此方案"按钮 | ✓ |
| 独立商品页 | 单独的博主商品浏览页 | |

**User's choice:** 融入内容场景

---

## 内容审核与热门机制

| Option | Description | Selected |
|--------|-------------|----------|
| 关键词前置+抽样后审 | 发帖时关键词过滤，命中拦截；未命中直接发布，事后抽样 | ✓ |
| 全量前置审核 | 所有帖子发帖前AI审核 | |
| 纯后审 | 直接发布，事后抽审 | |

**User's choice:** 关键词前置+抽样后审

| Option | Description | Selected |
|--------|-------------|----------|
| 互动加权+时间衰减 | 点赞×3+评论×2+收藏×5+分享×4，乘以时间衰减因子 | ✓ |
| 纯点赞数 | 按点赞数排序 | |
| Claude 决定 | 自行决定算法 | |

**User's choice:** 互动加权+时间衰减

| Option | Description | Selected |
|--------|-------------|----------|
| 帖子排行+标签趋势 | 热门帖子排行 + 上升最快的标签/风格趋势 | ✓ |
| 仅帖子排行 | 只展示热门帖子排行 | |
| Claude 决定 | 自行决定展示形式 | |

**User's choice:** 帖子排行+标签趋势

| Option | Description | Selected |
|--------|-------------|----------|
| 确认 CC-40 流程 | 累积3次举报后隐藏内容+AI初审+人工复核 | ✓ |
| 调整细节 | 想调整举报流程 | |

**User's choice:** 确认 CC-40 流程

---

## 灵感衣橱导入与数据面板

| Option | Description | Selected |
|--------|-------------|----------|
| 整方案导入 | 一键导入整个搭配方案 | |
| 可选单品导入 | 导入时用户可选择整个方案或勾选单品 | ✓ |
| 仅单品导入 | 只能导入单个单品 | |

**User's choice:** 可选单品导入

| Option | Description | Selected |
|--------|-------------|----------|
| 核心指标+趋势图 | 浏览量趋势+点赞/收藏/评论+粉丝增长+转化率，7天/30天切换 | ✓ |
| 仅汇总数字 | 总浏览量/总点赞/总粉丝 | |
| Claude 决定 | 自行决定指标 | |

**User's choice:** 核心指标+趋势图

| Option | Description | Selected |
|--------|-------------|----------|
| 全员基础+博主增强 | 所有用户看基础数据，博主额外看转化率和粉丝增长 | ✓ |
| 仅博主可见 | 只有博主和大V才能看数据面板 | |

**User's choice:** 全员基础+博主增强

| Option | Description | Selected |
|--------|-------------|----------|
| 全来源 | 社区帖子+AI造型师方案+虚拟试衣效果图 | ✓ |
| 仅社区帖子 | 只能从社区帖子导入 | |

**User's choice:** 全来源

---

## 发帖流程细节

| Option | Description | Selected |
|--------|-------------|----------|
| 本地草稿 | AsyncStorage存储，退出自动保存 | ✓ |
| 服务端草稿 | 服务端存储，跨设备同步 | |
| Claude 决定 | 自行决定 | |

**User's choice:** 本地草稿

| Option | Description | Selected |
|--------|-------------|----------|
| 关联平台商品 | 从平台商品库搜索选择单品 | ✓ |
| 图片标记+手填信息 | 在图片上标记位置+手填单品信息 | |
| 两者结合 | 两种方式都支持 | |

**User's choice:** 关联平台商品

---

## 收藏与关注信息流

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 PostBookmark 模型 | userId+postId，与PostLike分离 | ✓ |
| 复用 Favorite 模型 | 统一管理但查询复杂 | |

**User's choice:** 新增 PostBookmark 模型

| Option | Description | Selected |
|--------|-------------|----------|
| 纯时间倒序 | 关注用户的帖子按时间倒序 | ✓ |
| 混合推荐 | 关注用户帖子+基于画像推荐混合 | |

**User's choice:** 纯时间倒序

| Option | Description | Selected |
|--------|-------------|----------|
| 收藏即归档 | 收藏时弹出选择灵感衣橱分类 | ✓ |
| 收藏与衣橱分离 | 收藏和导入衣橱是独立操作 | |

**User's choice:** 收藏即归档

| Option | Description | Selected |
|--------|-------------|----------|
| 仅帖子 | 关注tab只展示帖子 | |
| 帖子+其他动态 | 帖子+点赞/试衣等动态 | ✓ |

**User's choice:** 帖子+其他动态

| Option | Description | Selected |
|--------|-------------|----------|
| 无限制 | 不设关注上限 | ✓ |
| 上限 2000 | 防止垃圾关注 | |

**User's choice:** 无限制

| Option | Description | Selected |
|--------|-------------|----------|
| 静默取关 | 对方不知晓 | ✓ |
| 通知取关 | 通知对方 | |

**User's choice:** 静默取关

---

## 互动通知机制

| Option | Description | Selected |
|--------|-------------|----------|
| 5类核心通知 | 点赞/评论/收藏/关注/回复@你 | ✓ |
| 仅评论和回复 | 减少打扰 | |
| Claude 决定 | 自行决定通知类型 | |

**User's choice:** 5类核心通知

| Option | Description | Selected |
|--------|-------------|----------|
| App内通知列表 | 类似微信"发现"tab红点 | |
| App内+系统推送 | App内通知+APNs/FCM推送 | ✓ |

**User's choice:** App内+系统推送

| Option | Description | Selected |
|--------|-------------|----------|
| 智能合并 | 同帖多赞合并为"小明等5人赞了你的帖子" | ✓ |
| 逐条通知 | 每个互动单独通知 | |

**User's choice:** 智能合并

---

## 评论回复结构

| Option | Description | Selected |
|--------|-------------|----------|
| 一级回复 | 只支持对顶级评论的回复 | ✓ |
| 无限嵌套 | 支持回复的回复 | |
| Claude 决定 | 自行决定 | |

**User's choice:** 一级回复

| Option | Description | Selected |
|--------|-------------|----------|
| 折叠展示 | 顶级评论平铺，回复折叠在下方 | ✓ |
| 缩进平铺 | 所有评论平铺，缩进区分层级 | |

**User's choice:** 折叠展示

---

## Claude's Discretion

- 综合评分的具体计算公式和归一化方法
- 博主标识的 UI 设计（badge/icon）
- 数据面板的具体图表类型和布局
- 热门趋势的更新频率
- 关键词过滤的词库来源和维护
- 系统推送的具体实现（APNs/FCM 集成）
- 通知合并的时间窗口和策略

## Deferred Ideas

None — discussion stayed within phase scope
