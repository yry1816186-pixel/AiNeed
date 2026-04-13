# Phase 4: 推荐引擎 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 04-recommendation-engine
**Areas discussed:** 信息流卡片设计, 推荐分类切换交互, 色彩评分与推荐理由展示, 推荐反馈与交互, 推荐算法策略, 专利创新点

---

## 信息流卡片设计

| Option | Description | Selected |
|--------|-------------|----------|
| 图片主导型 | 图片占满卡片宽度，底部叠加半透明渐变层显示信息 | ✓ |
| 图文均衡型 | 图片占60%，下半部分白色背景显示详细信息 | |
| 极简型 | 图片占上半部分，下半部分仅品牌+价格 | |

**User's choice:** 图片主导型
**Follow-up - 信息叠加方式:** 全部叠加在图片上（不增加卡片高度）
**Follow-up - 卡片信息:** 基础信息 + 风格标签 + 色彩评分 + 推荐理由摘要（全选）
**Notes:** 底部渐变层分两行：第一行品牌+价格，第二行风格标签+色彩评分图标；推荐理由摘要小字叠在角落

---

## 推荐分类切换交互

| Option | Description | Selected |
|--------|-------------|----------|
| 顶部固定 Tab | 首页顶部固定一行标签，点击切换 | ✓ |
| 横向滚动标签 | 标签横向可滚动，支持更多分类 | |
| 下拉切换 | 下拉刷新切换到下一个分类 | |

**User's choice:** 顶部固定 Tab

| Option | Description | Selected |
|--------|-------------|----------|
| 场合子标签 | 切换到"场合"Tab后出现横向滚动子标签 | ✓ |
| 自动推断场合 | 直接展示最常用场合的推荐 | |

**User's choice:** 场合子标签

---

## 色彩评分与推荐理由展示

| Option | Description | Selected |
|--------|-------------|----------|
| 色块 + 圆环分数 | 2-3个色块+小圆环进度条 | ✓ |
| 调色板图标 + 展开详情 | 调色板图标，点击展开完整分析 | |
| 纯数字分数 | 仅显示分数数字 | |

**User's choice:** 色块 + 圆环分数

| Option | Description | Selected |
|--------|-------------|----------|
| 内联 1 行摘要 | 卡片底部角落显示1行推荐理由 | ✓ |
| 可展开理由卡片 | "为什么推荐？"按钮，点击展开 | |
| 长按弹出浮层 | 长按卡片弹出推荐理由 | |

**User's choice:** 内联 1 行摘要

---

## 推荐反馈与交互

| Option | Description | Selected |
|--------|-------------|----------|
| 心形 + 不喜欢原因 | 卡片右上角心形图标，不喜欢弹原因选择 | |
| 左右滑动反馈 | 右滑喜欢，左滑不喜欢 | ✓ |
| 详情页内反馈 | 点击进入详情页后提供反馈 | |

**User's choice:** 左右滑动反馈

| Option | Description | Selected |
|--------|-------------|----------|
| 左滑直接不喜欢 | 左滑直接标记不喜欢，不弹原因 | ✓ |
| 左滑 + 原因弹窗 | 左滑后弹出半屏原因选择 | |
| 渐进式左滑 | 左滑显示按钮，继续滑动提交 | |

**User's choice:** 左滑直接不喜欢

| Option | Description | Selected |
|--------|-------------|----------|
| 下次刷新生效 | 后台更新偏好缓存，下次刷新时调整 | ✓ |
| 即时移除并替换 | 不喜欢后立即移除卡片并插入新推荐 | |

**User's choice:** 下次刷新生效

---

## 推荐算法策略

| Option | Description | Selected |
|--------|-------------|----------|
| 规则 + GLM AI 增强 | 激活已有4个服务 + GLM生成理由 | |
| 规则 + GLM + 简单协同过滤 | 额外实现简单协同过滤 | |
| 全面激活所有算法 | 协同过滤+知识图谱+学习排序+SASRec全部实现 | ✓ |

**User's choice:** 全面激活所有算法
**Notes:** 用户澄清"不用本地推理"仅指不在用户手机端推理，服务器端可运行ML模型

| Option | Description | Selected |
|--------|-------------|----------|
| GLM 仅生成理由 | 规则引擎生成候选集和评分，GLM生成理由文本 | ✓ |
| GLM 重排序 + 理由 | GLM对候选集重新排序并生成理由 | |
| GLM 主导推荐 | 完全由GLM生成推荐 | |

**User's choice:** GLM 仅生成理由

| Option | Description | Selected |
|--------|-------------|----------|
| 纯数据库实现 | 协同过滤用PostgreSQL，知识图谱用属性关系表 | |
| 专业工具链 | Neo4j图数据库 + Qdrant向量检索 | ✓ |

**User's choice:** 专业工具链（Neo4j + Qdrant）

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 ml/ 服务层 | SASRec部署在ml/ FastAPI服务层 | |
| 独立微服务 | SASRec创建独立Python微服务 | ✓ |

**User's choice:** 独立微服务

---

## 专利创新点

| Option | Description | Selected |
|--------|-------------|----------|
| 感知色彩和谐评分系统 | Delta E 2000 + 色彩季型融合评分 | ✓ |
| 渐进式多算法融合框架 | 数据成熟度驱动权重调整 | ✓ |
| 多维约束穿搭生成算法 | 体型+色彩+场合同时求解 | ✓ |
| 时尚知识图谱 + 图推理 | 体型-色彩-场合-风格-单品关系图谱 | ✓ |

**User's choice:** 全部纳入
**Notes:** 项目需要申请专利，这些创新点是区别于现有专利的核心差异化

---

## Claude's Discretion

- 卡片渐变层具体透明度和颜色值
- 圆环分数的具体尺寸和动画效果
- 左右滑动的触发距离和回弹动画
- Neo4j 图谱的初始数据导入策略
- Qdrant 向量索引的维度和距离度量选择

## Deferred Ideas

None — discussion stayed within phase scope
