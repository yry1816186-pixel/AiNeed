# Phase 10: 品质审计修复 — Requirements

**Defined:** 2026-04-15
**Source:** 六重视角全维度设计审计报告（设计师/艺术家/前端工程师/人体工程学家/算法大师/真实用户）

---

## P0 — 阻断性修复（1 周内）

### QA-01: VipGuard 真实用户状态接入
- `VipGuard` 组件中 `isVip = false` 硬编码导致所有 VIP 功能不可用
- 接入 `useAuthStore` 或 `useUserStore` 获取真实 VIP 状态
- VIP 功能包括：CustomDesign、CustomEditor、Booking、Chat

### QA-02: PaymentScreen 全量中文化
- 支付页面全英文界面（"Payment", "Order Summary", "Pay Now" 等）
- 所有用户可见字符串替换为中文（"支付", "订单摘要", "立即支付"）
- 支付方式名称本地化："Alipay" → "支付宝", "WeChat Pay" → "微信支付"

### QA-03: 安全区域硬编码修复
- 4 个 consultant 屏幕 `paddingTop: 56` 硬编码
- ChatScreen.tsx:209, BookingScreen.tsx:188, AdvisorProfileScreen.tsx:160, AdvisorListScreen.tsx:201
- 改为 `useSafeAreaInsets()` 动态计算

### QA-04: 天气坐标硬编码修复
- HomeScreen.tsx 中 `fetchWeather(39.9042, 116.4074)` 硬编码北京坐标
- 接入设备定位 API，非北京用户获得当地天气穿搭建议

### QA-05: 聊天消息持久化
- AiStylistChatScreen 消息用 `useState` 管理，离开页面丢失
- 迁移到 Zustand store + AsyncStorage 持久化

---

## P1 — 体验修复（2-3 周内）

### QA-06: 双主题系统统一
- 三套色彩体系并存：DesignTokens (Terracotta), Legacy (NightBlue), Accent (Purple)
- 21 个文件同时导入两套系统
- 统一到 Terracotta 品牌色 token 体系，废弃 NightBlue 主题
- 间距冲突修复：spacing.md (12 vs 16), spacing.lg (16 vs 24)

### QA-07: 双导航架构合并
- App.tsx 6-tab flat stack vs src/navigation/ 5-tab nested stack
- 两套类型定义、两套深链系统
- 选定 5-tab 版本（业务更合理），删除 App.tsx 旧版导航
- 统一深链到 navigationService.ts

### QA-08: ClothingDetailScreen 硬编码色值迁移
- 29 个硬编码 hex 值，零主题引用
- 全部迁移到 DesignTokens 或 theme tokens

### QA-09: Reduced Motion 支持
- 创建 `useReducedMotion` hook
- 所有动画组件接入 AccessibilityInfo 检测
- 减弱动画：duration → 0，spring → instant，入场动画 → fade-only

### QA-10: 深色模式对比度修复
- neutral.400 (#8A8A85) 在 neutral.500 (#73736D) 背景上仅 1.47:1
- 提升到 WCAG AA 4.5:1 标准
- 文字色至少使用 neutral.300 (#D4D4D0) 以上

### QA-11: SharedElement 转场连接
- 安装 react-navigation-shared-element
- 连接产品卡片 → 详情页的共享元素过渡
- 连接社区帖子 → 详情页的图片过渡

### QA-12: 路由守卫接入
- 26 条 GUARDED_ROUTES 规则已定义但未连接到导航
- AuthGuard、ProfileGuard、VipGuard 接入 MainStackNavigator

---

## P2 — 品质提升（4-8 周内）

### QA-13: 动画弹簧参数语义分层
- 8 种弹簧配置未绑定到交互语义
- 建立映射：snappy → 轻操作, gentle → 中操作, bouncy → 重操作/庆祝, stiff → 错误
- 按钮/页面/弹窗/卡片各自使用对应弹簧

### QA-14: 瀑布流高度优化
- CommunityScreen 卡片高度 `160 + (idx % 4) * 30` 伪随机
- 改为基于图片宽高比的真实高度计算
- 使用 FlashList masonry 模式

### QA-15: AI 思考态视觉升级
- AiStylistChatScreen ActivityIndicator → 渐进式视觉叙事
- Terracotta 渐变线条流动 → 服装轮廓渐显 → 完整穿搭淡入

### QA-16: CommunityScreen 巨石拆分
- 735 行文件内联 BloggerBadge、PostMasonryCard、CreatePostModal
- 提取为独立组件，加 React.memo 优化
- PostMasonryCard 入场动画改为 IntersectionObserver 式

### QA-17: 推荐卡片信息增强
- SwipeCard 增加评分、推荐理由、色彩和谐度可视化
- 增加 CIEDE2000 色彩距离弧形指示器

### QA-18: 四季色彩可视化重构
- ColorAnalysisScreen 31 个硬编码色值改为使用 colorSeasons token
- 建立 SeasonPalette 组件，HSL 色轮定位 + CIEDE2000 距离弧

### QA-19: Accent 系统定位调整
- 6 色切换不应覆盖品牌主色 Terracotta
- Accent 降为辅助强调色（标签、徽章、次要 CTA）
- 品牌色始终为 Terracotta

### QA-20: 组件库重复消除
- ui/index.tsx 内联重写了 Button/Card/Badge/Tag 等
- 统一从 primitives/ 导出，删除内联重复实现
- 建立清晰分层：primitives/ → ui/（组合组件） → features/（业务组件）

---

## Priority Summary

| Priority | Count | Focus |
|----------|-------|-------|
| P0 | 5 | 阻断性 bug 修复，功能不可用 |
| P1 | 7 | 架构冲突、无障碍合规、视觉一致性 |
| P2 | 8 | 审美品质、交互提升、组件治理 |

## Cross-Cutting Concerns

- **所有修改必须保持向后兼容**：逐步迁移，不破坏现有功能
- **Terracotta 作为唯一品牌色**：所有修改以 Terracotta (#C67B5C) 为视觉锚点
- **WCAG AA 标准**：所有颜色修改必须满足 4.5:1 对比度
- **reduced-motion-first**：新动画必须包含减弱动画路径