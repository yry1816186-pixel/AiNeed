---
phase: 06
slug: community-blogger-ecosystem
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-14
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for frontend phases.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | React Native + React Paper |
| Preset | AiNeed 品牌色系 |
| Component library | React Paper (已集成) |
| Icon library | @expo/vector-icons (已集成) |
| Font | System default (iOS: San Francisco, Android: Roboto) |

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding |
| sm | 8px | Compact element spacing |
| md | 16px | Default element spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Page-level spacing |

Exceptions: none

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px | 400 | 1.5 |
| Label | 12px | 500 | 1.4 |
| Heading | 18px | 600 | 1.3 |
| Display | 24px | 700 | 1.2 |

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #FFFFFF | 背景、卡片表面 |
| Secondary (30%) | #F5F5F5 | 卡片背景、分割区域 |
| Accent (10%) | #6C5CE7 | 关注按钮、博主标识、活跃状态 |
| Destructive | #E74C3C | 举报、删除操作 |

Accent reserved for: 关注按钮、博主/大V badge、热门标签、活跃 tab 指示器

---

## Screen Inventory

### S-01: 社区首页 (CommunityScreen 扩展)
- **现有**: 分类切换(Hot/Latest/Following) + 双列瀑布流 + 下拉刷新
- **新增**:
  - 关注 tab 混合动态（帖子 + "XX 赞了某帖子" + "XX 试穿了某服装"）
  - 热门趋势卡片（"本周流行：法式风↑" "热门标签：OOTD"）
  - 博主/大V 头像旁 badge 标识

### S-02: 发帖页 (CreatePostScreen 新建)
- 最多 9 张图片上传（网格布局，+号添加）
- 文字描述输入框
- 风格标签选择（chip 多选）
- 单品标注（搜索平台商品库关联）
- 草稿自动保存提示

### S-03: 帖子详情页 (PostDetailScreen 扩展)
- 图片轮播
- 评论区：顶级评论平铺 + 回复折叠（默认2条，点击展开）
- 底部互动栏：点赞/评论/收藏/分享
- 博主帖子底部："购买此方案"按钮

### S-04: 收藏即归档底部 Sheet
- @gorhom/bottom-sheet 实现
- 展示灵感衣橱分类列表
- 选择后一步完成收藏+归档

### S-05: 博主主页 (BloggerProfileScreen 新建)
- 头像 + 博主/大V badge + 粉丝数
- Tab 切换：帖子 | TA 的方案 | 关于
- "TA 的方案" tab 展示博主上架商品列表

### S-06: 博主商品详情 (BloggerProductScreen 新建)
- 方案图片 + 描述 + 价格
- "购买此方案"按钮 → 弹出方案详情+购买确认
- 关联实体商品展示

### S-07: 博主数据面板 (BloggerDashboardScreen 新建)
- 7天/30天切换 tab
- 核心指标卡片：浏览量/点赞/收藏/评论
- 博主额外：转化率 + 粉丝增长趋势图
- 趋势图（需安装图表库）

### S-08: 灵感衣橱 (WardrobeScreen 扩展)
- 分类列表 + 自定义分类创建
- 拖拽排序（gesture-handler + reanimated 自实现）
- 一键导入（从帖子/AI方案/试衣结果）
- 导入时可选单品

### S-09: 通知列表 (NotificationsScreen 扩展)
- 5 类通知：点赞/评论/收藏/关注/回复@你
- 智能合并："小明等 5 人赞了你的帖子"
- 后端集成（当前仅 AsyncStorage）

### S-10: 举报弹窗
- 选择举报原因
- 提交后提示"已收到举报"

---

## Interaction Patterns

### IP-01: 瀑布流无限滚动
- 使用 WaterfallFlashList 组件
- TanStack Query useInfiniteQuery
- 下拉刷新 + 自动加载更多

### IP-02: 收藏即归档
- 点击收藏图标 → 弹出 bottom-sheet 选择分类 → 确认
- 收藏成功：图标变实心 + toast 提示

### IP-03: 评论折叠展开
- 顶级评论平铺显示
- 回复默认折叠，显示"查看 N 条回复"
- 点击展开回复列表

### IP-04: 博主等级标识
- 博主：头像右下角小 badge（紫色圆点+V）
- 大V：头像右下角大 badge（金色盾牌图标）

### IP-05: 拖拽排序
- 长按分类卡片触发拖拽模式
- 拖拽过程中其他卡片自动让位（reanimated 动画）
- 松手完成排序，调用后端 API 更新

### IP-06: 热门趋势卡片
- 水平滚动标签列表
- 每个标签显示：名称 + 趋势方向箭头（↑↓→）
- 点击标签跳转搜索结果

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (发帖) | 发布穿搭 |
| Primary CTA (购买方案) | 购买此方案 |
| Primary CTA (关注) | 关注 |
| Empty state heading (社区) | 还没有穿搭内容 |
| Empty state body (社区) | 成为第一个分享穿搭的人吧 |
| Empty state heading (灵感衣橱) | 灵感衣橱空空如也 |
| Empty state body (灵感衣橱) | 从社区帖子或AI方案中一键导入 |
| Error state | 加载失败，点击重试 |
| Destructive confirmation (举报) | 举报: 确认举报此内容？ |
| Destructive confirmation (删除帖子) | 删除: 确认删除此帖子？此操作不可撤销 |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| React Paper | Card, Button, TextInput, Chip, FAB, BottomSheet | not required |
| @gorhom/bottom-sheet | BottomSheetModal | not required (已安装) |
| react-native-svg | 图表基础 | not required (已安装) |
| victory-native | 图表组件 | 需验证与 react-native-svg 15.8.0 兼容 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
