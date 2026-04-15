# Phase 7: 定制服务 & 品牌合作 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 07-customization-brand-collaboration
**Areas discussed:** 2D 定制编辑器, 定制流程 & 报价, 品牌扫码导入, 品牌管理后台

---

## 2D 定制编辑器

| Option | Description | Selected |
|--------|-------------|----------|
| Fabric.js | 成熟的 Canvas 库，内置拖拽/旋转/缩放/图层管理，React Native 有 WebView 封装 | ✓ |
| 原生 Canvas + 手势 | 纯 Canvas API + Gesture Handler，更轻量但需自己实现 | |
| WebView + Web 编辑器 | WebView 内嵌 Web 版编辑器（Konva.js），功能丰富但有性能折中 | |

**User's choice:** Fabric.js
**Notes:** 成熟库，开发效率高

| Option | Description | Selected |
|--------|-------------|----------|
| 2-3 种基础款 | MVP 先做 T恤和帽子，模板制作简单 | |
| 5-6 种常见款 | T恤/帽子/鞋子/包包/手机壳，覆盖更多场景 | ✓ |
| 仅 T恤 | 快速验证流程，后续加更多类型 | |

**User's choice:** 5-6 种常见款

| Option | Description | Selected |
|--------|-------------|----------|
| GLM AI 生成 | 用 GLM 图生图 API 渲染逼真效果图 | ✓ |
| 纯模板叠加预览 | 在模板上叠加用户图案，不做 AI 渲染 | |
| 叠加预览 + AI 确认图 | 模板叠加即时预览，提交时 AI 生成高质量图 | |

**User's choice:** GLM AI 生成

| Option | Description | Selected |
|--------|-------------|----------|
| 基础操作 | 上传图案 + 拖拽定位 + 缩放 + 旋转 | |
| 基础 + 文字/颜色 | 基础操作 + 文字添加 + 颜色调整 + 图层管理 | |
| 完整编辑器 | 基础操作 + 文字 + 颜色 + 图层 + 滤镜 + 裁剪 | ✓ |

**User's choice:** 完整编辑器

| Option | Description | Selected |
|--------|-------------|----------|
| 全屏沉浸式 | 类似 Canva，底部工具栏，专注设计 | ✓ |
| 上下分屏式 | 上半部分预览区 + 下半部分工具区 | |

**User's choice:** 全屏沉浸式

| Option | Description | Selected |
|--------|-------------|----------|
| 平台预设 | 平台提供预设模板，用户在此基础上定制 | |
| 空白起始 | 用户从空白开始，完全自由设计 | |
| 预设 + 社区模板 | 平台预设 + 用户分享的社区模板 | ✓ |

**User's choice:** 预设 + 社区模板

---

## 定制流程 & 报价

| Option | Description | Selected |
|--------|-------------|----------|
| 人工报价 | 平台人工评估成本，1-2 个工作日回复 | |
| 自动报价 | 基于商品类型+图案复杂度+材质自动计算，即时返回 | ✓ |
| 自动 + 人工复核 | 自动基础报价，复杂定制人工复核 | |

**User's choice:** 自动报价

| Option | Description | Selected |
|--------|-------------|----------|
| 全款预付 | 确认报价后一次性付全款 | |
| 定金 + 尾款 | 先付定金，完成后付尾款 | ✓ |
| 50% 定金 + 尾款 | 先付 50%，确认效果后付尾款 | |

**User's choice:** 定金 + 尾款

| Option | Description | Selected |
|--------|-------------|----------|
| 专属包装 | AiNeed 专属包装盒 + 感谢卡 + 品牌贴纸 | ✓ |
| 普通包装 + 贴纸 | 普通快递包装 + AiNeed logo 贴纸 | |
| 标准包装 | 标准快递包装，无额外设计 | |

**User's choice:** 专属包装

| Option | Description | Selected |
|--------|-------------|----------|
| 全流程通知 | 每个状态变更都推送通知 | ✓ |
| 关键节点通知 | 只在报价、发货、送达时通知 | |

**User's choice:** 全流程通知

---

## 品牌扫码导入

| Option | Description | Selected |
|--------|-------------|----------|
| 商品 ID 编码 | 二维码内容为品牌商品 ID，扫码后 App 内打开商品详情 | |
| 完整数据编码 | 二维码包含品牌+商品+尺码+颜色等完整信息 | ✓ |
| URL 深度链接 | 二维码包含短链 URL，扫码后跳转 App 深度链接 | |

**User's choice:** 完整数据编码

| Option | Description | Selected |
|--------|-------------|----------|
| 衣橱页扫码 | 在衣橱页面添加扫码按钮 | |
| 首页通用扫码 | 首页顶部扫码图标 | |
| 双入口 | 衣橱页 + 首页都有扫码入口 | ✓ |

**User's choice:** 双入口

| Option | Description | Selected |
|--------|-------------|----------|
| 自动添加 + 确认 | 扫码后自动识别并添加，弹窗确认 | |
| 预览后手动添加 | 扫码后展示商品详情，用户手动点击添加 | ✓ |

**User's choice:** 预览后手动添加

| Option | Description | Selected |
|--------|-------------|----------|
| 服务端实时拉取 | 扫码后从服务器获取最新完整商品数据 | ✓ |
| 离线 + 在线补充 | 二维码内嵌部分数据，服务端补充详细数据 | |

**User's choice:** 服务端实时拉取

---

## 品牌管理后台

| Option | Description | Selected |
|--------|-------------|----------|
| 扩展现有 merchant | 在 merchant 模块上扩展品牌专属功能 | |
| 独立品牌后台模块 | 新建 brand-portal 模块，与 merchant 分离 | |
| 双模块协作 | merchant 管理通用功能，brand-portal 管理品牌合作专属功能 | ✓ |

**User's choice:** 双模块协作

| Option | Description | Selected |
|--------|-------------|----------|
| 核心三件套 | 商品数据管理 + 扫码统计 + 用户偏好分析 | ✓ |
| 核心 + 营销扩展 | 核心三件套 + 二维码生成管理 + 定制订单跟踪 + 品牌营销数据 | |
| 全功能后台 | 核心三件套 + 二维码管理 + 定制订单 + 营销 + 财务结算详情 | |

**User's choice:** 核心三件套

| Option | Description | Selected |
|--------|-------------|----------|
| App 内嵌 | App 内嵌品牌管理页面，切换角色即可 | |
| 独立 Web 后台 | 独立 Web 端管理后台 | ✓ |
| App + Web 双端 | App 内基础管理 + Web 端完整管理 | |

**User's choice:** 独立 Web 后台

---

## Claude's Discretion

- 编辑器内各工具的具体 UI 设计和交互细节
- 自动报价算法的具体参数和权重
- 定金/尾款的比例
- 专属包装的具体设计方案
- 社区模板的审核和展示机制

## Deferred Ideas

None — discussion stayed within phase scope
