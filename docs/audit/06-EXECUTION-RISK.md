# 寻裳 XUNO -- 48h Sprint 执行风险与工程可行性审计

> **审计日期**: 2026-04-23
> **审计性质**: 残酷真相，零容忍。48 小时倒计时已开始。
> **基准文档**: XUNO_FINAL_PLAN.md / XUNO_EXECUTION_MASTER.md / XUNO_FUSION_PLAN.md / ROADMAP.md / STATE.md / PROJECT.md
> **实测数据来源**: tsc --noEmit / package.json / requirements.txt / 代码扫描

---

## 审计总评

| 维度                       | 得分 | 一句话                                                  |
| -------------------------- | ---- | ------------------------------------------------------- |
| 48h Sprint 成功率          | 4/10 | Phase 3-4 严重低估工作量                                |
| 3 Agent 并行接口分歧       | 5/10 | 接口契约在 Phase 1 冻结，但代码实际状态与文档不一致     |
| 移动端 138 个 TS 错误      | 6/10 | 54 个是模块找不到，不是真正的类型错误，但修复路径不简单 |
| React Native 0.76.8 兼容性 | 3/10 | STT 实现严重依赖 Expo polyfill，在纯 RN 环境中不可运行  |
| Windows 7x24 可靠性        | 4/10 | 没有 UPS，没有实测验证，99.8% 是理论值                  |
| AutoDL GPU 训练流程        | 6/10 | RTX 4090 足够但环境准备和数据工程被严重低估             |
| Phase 间依赖链             | 4/10 | 有 3 条隐藏串行依赖，48h 严格并行不可行                 |
| 备选方案(3 Phase 版)       | 7/10 | Phase 1+2+3 组合能产出可用 Demo                         |

**综合判断**: 48h 完成全部 5 Phase 的概率为 15-25%。完成 3 Phase (可用 Demo) 的概率为 55-65%。核心卡点在 Phase 3 导航重构和 Phase 4 语音按钮。

---

## 维度 1: 48h Sprint 成功率

**评分: 4/10** -- Phase 1 和 2 可控，Phase 3-5 是生死线

### 逐 Phase 分析

#### Phase 1 (H0-8): 消灭 TS 错误 -- 成功率 70%

实测数据（2026-04-23 刚跑的 tsc）:

```
总错误: 138 个（不是文档声称的 137，多了 1 个）
分布在 30+ 个文件中
```

错误类型分布:

| 错误码                | 数量 | 本质                                                  | 修复难度                               |
| --------------------- | ---- | ----------------------------------------------------- | -------------------------------------- |
| TS2307 (找不到模块)   | 54   | 导入路径指向不存在的文件/polyfill                     | 中 -- 需要判断是路径错了还是文件不存在 |
| TS2304 (找不到变量)   | 33   | `partStyles`/`Colors`/`s`/`styles` 引用了未定义的东西 | 低 -- 主要是重命名/重构遗留            |
| TS7053 (索引类型错误) | 12   | 用数字 0 索引颜色对象（没有 0 键）                    | 低 -- 改用正确的颜色键名               |
| TS2552 (拼写错误)     | 9    | `Colors` vs `colors` 大小写                           | 极低                                   |
| TS2305 (导出不匹配)   | 8    | `flatColors`/`useAuthStore` 等导出不存在              | 中 -- 可能需要新建导出或改引用         |
| TS7006 (隐式 any)     | 5    | 缺类型注解                                            | 低                                     |
| TS2300 (重复标识符)   | 4    | 同一文件 import 两次 `colors`                         | 极低                                   |
| TS2345 (类型不匹配)   | 1    | id vs clothingId                                      | 极低                                   |

**关键发现**: 54 个 "找不到模块" 错误中，至少涉及以下缺失的模块/polyfill:

- `../theme` (5 处，design-system primitives 内部)
- `../../polyfills/flash-list` (2 处)
- `../../polyfills/expo-vector-icons` (1 处)
- `../../polyfills/expo-linear-gradient` (1 处)
- `../../polyfills/expo-file-system` (speech 依赖)
- `../../../design-system/theme` (多处)
- `../../services/api/community.api` (2 处)
- `../../services/api/tryon.api` (1 处)
- `../../services/api/commerce.api` (1 处)
- `../../design-system/ui/AnimatedHeartButton` (1 处)
- `../../design-system/ui/Skeleton` (1 处)
- `../../design-system/ui/Rating` (1 处)

**最可能的卡点**: polyfill 模块不存在（flash-list, expo-vector-icons 等）意味着这些 feature 目录下的文件曾经是为 Expo 环境写的，后来迁移到了纯 RN 但 polyfill 没补上。8 小时修 138 个错误需要平均 3.5 分钟/个，对于模块缺失类错误，3.5 分钟可能不够 -- 你需要先理解这个 polyfill 应该导出什么。

**缓解方案**: 不要逐文件修复。按错误类型批量处理: 先处理 TS2552/TS2300 (13 分钟搞定全部 13 个)，再处理 TS7053 (30 分钟搞定全部 12 个)，最后处理 TS2307 (需要判断哪些 polyfill 该创建哪些该改路径)。

#### Phase 2 (H8-16): 管道接通 + 性别降级 -- 成功率 50%

后端 0 个 TS 错误（实测确认），这是一个亮点。

但这个 Phase 的核心工作量不是修错，而是重构:

1. **Orchestrator 改为唯一入口** -- 需要检查所有 controller 是否绕过了 Orchestrator。后端有 20+ 个 controller 文件，每个都可能直接调 service。
2. **ColdStartService 重构** -- 当前按 gender 分桶，改为 bodyType + styleExpression。涉及后端 `identity/onboarding/onboarding.service.ts` 和推荐域的多个 service。
3. **性别字段降级级联** -- 后端 15 个文件引用 gender，移动端 15 个文件引用 gender。总计 30 个文件需要逐一检查。FUSION_PLAN 列出了 6 个核心文件，但实测发现远不止这些。

**最可能的卡点**: ColdStartService 重构。这不是改个字段名的事情 -- 它影响推荐管道的评分权重，需要同时理解规则引擎 + 向量检索 + SASRec 三路如何消费 ColdStart 的输出。一个 Agent 在 8 小时内既要修 DTO 又要重构推荐逻辑，容易出 bug。

#### Phase 3 (H16-28): 导航重构 + 核心页面 -- 成功率 35%

这是真正的生死线。12 小时要做的事情:

1. **5 Tab 变 4 Tab** -- RootNavigator.tsx 改结构
2. **新建 TodayStackNavigator + DiscoverStackNavigator**
3. **Today Screen 全新实现** -- 场景卡、伊伊推荐、用户保存、语音按钮
4. **Discover Screen 全新实现** -- 推荐流 + 策展空间
5. **穿搭日历简化版**

实测数据: 导航层有 12 个文件，feature 层有 15 个 feature 目录 (home, wardrobe, tryon, stylist, community 等)，每个 feature 有自己的 screens 和 navigation。从 5 Tab 重构到 4 Tab 不仅仅是改 RootNavigator -- 还需要重新组织每个 feature 的 Stack Navigator，处理旧路由到新路由的映射。

**最可能的卡点**: Today Screen 从零实现。当前 HomeScreen 有 138 行 TS 错误相关代码，部分组件（HomeScreenParts.tsx 有 17 个错误）不可用。你需要决定是修 HomeScreen 还是重写 TodayScreen。修的话要处理 17 个 `partStyles` 未定义错误；重写的话需要新写场景卡组件、推荐卡片组件、语音按钮。

12 小时不够。现实估计 20-24 小时。

#### Phase 4 (H28-40): AI + 语音 + Onboarding -- 成功率 25%

1. **语音按钮 (STT)** -- 这是最危险的部分（详见维度 4）
2. **Stylist 单屏体验** -- 合并 AiStylistScreen + AiStylistChatScreen
3. **Onboarding 4 步流程** -- 全新流程
4. **FashionRules 过滤注入** -- LLM prompt 修改

如果 Phase 3 超时（大概率），Phase 4 会被压缩到 4-6 小时甚至更少。在 4-6 小时内实现 STT + 对话状态机 + 新 Onboarding 是不可能的。

#### Phase 5 (H40-48): 端到端测试 -- 成功率 N/A

完全取决于 Phase 1-4 的完成度。如果 Phase 4 只完成 50%，Phase 5 只能是"修补半成品"而不是"打磨 Demo"。

### 关键路径甘特图

```
H0    H4    H8    H12   H16   H20   H24   H28   H32   H36   H40   H44   H48
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
Phase 1: TS 错误修复
[====== 8h ======]                                                  成功率 70%

Phase 2: 管道 + 性别降级
                  [====== 8h ======]                                成功率 50%

Phase 3: 导航 + 核心页面
                               [============ 12h ============]        成功率 35%
                                                      ^^^^
                                                      最可能超时点

Phase 4: AI + 语音 + Onboarding
                                                      [====== 12h ======]
                                                      实际可用时间可能
                                                      只有 4-6h

Phase 5: 端到端测试
                                                                   [== 8h ==]
                                                                   被压缩为 0-2h
```

---

## 维度 2: 3 Agent 并行接口分歧

**评分: 5/10** -- 接口契约是好的设计，但代码实际状态与文档描述不一致

### 已冻结的接口契约

EXECUTION_MASTER 列出了 3 个冻结的接口: RecommendationOutput, TryOnResult, OnboardingOutput。这是一个好的做法。

### 哪些接口可能对不上

| 接口                 | 涉及文件 (后端)                                                                          | 涉及文件 (移动端)                                                                                   | 风险                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| RecommendationOutput | `fashion/recommendation/` 下多个 service                                                 | `features/home/stores/homeStore.ts`, `features/home/screens/RecommendationFeedScreen.tsx`           | 移动端当前没有 `explanation` 字段，RecommendationFeedScreen 有 TS2345 错误 (id vs clothingId) |
| OnboardingOutput     | `identity/onboarding/onboarding.service.ts`, `identity/onboarding/dto/onboarding.dto.ts` | `features/onboarding/stores/onboardingStore.ts`, `features/onboarding/screens/OnboardingScreen.tsx` | 移动端 store 当前有 gender 必填，需要改为 primaryScenarios/ageBand/styleExpression            |
| TryOnResult          | `ai-core/try-on/try-on.controller.ts`                                                    | `features/tryon/screens/` 下多个文件                                                                | 移动端 tryon feature 有自己的 screen 但具体字段未确认                                         |

### 具体风险文件清单

**后端 (655 个 TS 文件，0 个错误)**:

- `C:\AiNeed\apps\backend\src\domains\identity\auth\dto\auth.dto.ts` -- gender 字段需要改 @IsOptional
- `C:\AiNeed\apps\backend\src\domains\identity\onboarding\onboarding.service.ts` -- ColdStart 逻辑需要重构
- `C:\AiNeed\apps\backend\src\domains\ai-core\ai-stylist\` -- 12 个文件，agent-tools / decision-engine / LLM provider 都在

**移动端 (703 个 TS/TSX 文件，138 个错误)**:

- `C:\AiNeed\apps\mobile\src\features\onboarding\stores\onboardingStore.ts` -- gender 必填 -> 改可选
- `C:\AiNeed\apps\mobile\src\features\home\components\HomeScreenParts.tsx` -- 17 个错误，partStyles 未定义
- `C:\AiNeed\apps\mobile\src\features\stylist\components\OutfitPlanView.tsx` -- 4 个错误，colors 重复声明
- `C:\AiNeed\apps\mobile\src\features\community\screens\CommunityFeed.tsx` -- 5 个错误，导入路径错误

### 真正的风险

3 Agent 并行的核心假设是"每个 Agent 只负责独立目录，零冲突"。但实际上:

1. **Agent A 修 ThemeSystem.tsx (18 个错误)** 和 **Agent B 修 design-system/ui 下的 ChatBubble.tsx / BottomSheets.tsx / Share.tsx / Rating.tsx / Tag.tsx** -- 这些文件共享同一个 `design-system` 目录，可能修改同一个 `colors` 导出定义。
2. **性别降级** 同时涉及后端 (auth.dto, onboarding.service) 和移动端 (onboardingStore, profile.api) -- 如果 Phase 1 的 Agent A 改了后端 DTO 但移动端 Agent B 不知道，Phase 2 集成时会炸。

**缓解方案**: Phase 1 第一个小时不做代码修改，只做两件事: (1) 确认冻结接口的实际代码位置 (2) 每个 Agent 锁定自己的文件列表，用 git checkout 隔离。

---

## 维度 3: 移动端 138 个 TS 错误

**评分: 6/10** -- 能修完，但 8 小时很紧，且部分错误暗示更深层问题

### 错误分布详解

**按错误严重程度分类**:

| 严重程度        | 类型                                                    | 数量 | 批量修复策略                 | 预估时间 |
| --------------- | ------------------------------------------------------- | ---- | ---------------------------- | -------- |
| 红灯 (结构性)   | TS2307 找不到模块                                       | 54   | 判断是路径错误还是文件缺失   | 3-4h     |
| 黄灯 (变量级)   | TS2304 找不到变量                                       | 33   | 大多是重命名遗留，补定义即可 | 1-2h     |
| 绿灯 (类型级)   | TS7053 索引 + TS2552 拼写 + TS2300 重复 + TS2345 不匹配 | 26   | 机械修复                     | 30-45min |
| 蓝灯 (any 级)   | TS7006 隐式 any + TS2305 导出不匹配                     | 13   | 加类型注解/补导出            | 1h       |
| 灰灯 (tsconfig) | TS6046 module 参数                                      | 1    | expo tsconfig.base 兼容性    | 10min    |

### 54 个 "找不到模块" 的深层分析

这些模块缺失不是偶然的。从错误信息看，项目经历过一次 Expo -> 纯 RN 的迁移，但迁移不完整:

**Polyfill 类 (应创建 thin wrapper)**:

- `../../polyfills/flash-list` -- 应该直接 re-export @shopify/flash-list
- `../../polyfills/expo-vector-icons` -- 应该 re-export react-native-vector-icons
- `../../polyfills/expo-linear-gradient` -- 应该 re-export react-native-linear-gradient
- `../../polyfills/expo-file-system` -- speechRecognition.ts 依赖，需要用 react-native-fs 替代
- `../../polyfills/expo-av` -- speechRecognition.ts 依赖，整个 STT 方案需要重写

**路径错误类 (应修复 import 路径)**:

- `../theme` (5 处) -- design-system primitives 内部引用 theme 的路径变了
- `../../../design-system/theme` -- feature 目录引用 theme 的路径层级错误
- `../../design-system/theme/tokens/design-tokens` -- flatColors 导出不存在

**缺失文件类 (需要创建或确认是否还需要)**:

- `../../services/api/community.api` -- Community feature 的 API 层缺失
- `../../services/api/tryon.api` -- HeartRecommend 依赖的 API 缺失
- `../../services/api/commerce.api` -- 同上
- `../../design-system/ui/AnimatedHeartButton` -- 心动推荐功能的组件缺失
- `../../design-system/ui/Skeleton` -- CommunitySkeleton 依赖
- `../../design-system/ui/Rating` -- ConsultantCard 依赖
- `../../../components/community/PostMasonryCard` -- CommunityFeed 依赖
- `../../../components/recommendations/FeedTabs` -- RecommendationFeedScreen 依赖
- `../../../components/recommendations/RecommendationFeedCard` -- 同上
- `../../../components/charts/TagCloud` -- StyleTagsCard 依赖
- `../../../components/charts/PercentageBar` -- 同上
- `../../../components/consultant/ConsultantCard` -- AdvisorListScreen 依赖

### 关键洞察

这些错误中，有一大部分来自 **48h 内要砍掉的功能**:

- `features/community/` -- 已决定降为灵感层，Phase 1-5 不做 Community Tab
- `features/consultant/` -- 工作室功能 Sprint 不做
- `features/customization/` -- 砍掉了"上传图片私人定制"
- `features/home/components/heartrecommend/` -- 心动推荐 (SwipeCard) 是旧功能，Sprint 不需要

**更聪明的策略**: 不是修这些错误，而是直接删掉/忽略这些 feature 目录下的文件。如果 Community/Consultant/Customization/HeartRecommend 在 48h 内不做，它们报错不影响编译 -- 只需要在 tsconfig.json 中 exclude 掉这些目录。

预估这样可以消除 40-50 个错误，剩余 90 个左右才是真正需要修的。8 小时修 90 个错误 = 5.3 分钟/个，可行。

---

## 维度 4: React Native 0.76.8 兼容性

**评分: 3/10** -- STT 方案有致命问题，整个语音按钮功能可能无法在 48h 内完成

### 实测发现

当前的 STT 实现在 `C:\AiNeed\apps\mobile\src\services\speech\speechRecognition.ts` 中，严重依赖 Expo polyfill:

```typescript
import * as FileSystem from "@/src/polyfills/expo-file-system";
import { Audio, Recording } from "@/src/polyfills/expo-av";
```

但这两个 polyfill 不存在于项目中（TS2307 错误已确认）。

更关键的是 -- 这个 STT 实现不是使用 Android 原生 SpeechRecognizer（EXECUTION_MASTER 决策 #24 要求的），而是使用 Expo Audio 录音 + 上传到远端 API 做识别。这是完全不同的架构:

- **决策 #24 说的是**: Android 原生 SpeechRecognizer（免费，本地处理）
- **代码实际实现的是**: Expo Audio 录音 -> Base64 编码 -> POST 到 API -> 等待响应（需要后端 STT 服务，有延迟，有成本）

### RN 0.76.8 + STT 的已知问题

根据搜索结果:

| 问题                                                       | 来源                                                                                                                   | 严重度 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| RN 0.76 Bridgeless 模式与原生模块兼容性问题                | [react-native-screens #2441](https://github.com/software-mansion/react-native-screens/issues/2441)                     | 致命   |
| react-native-voice 在 Android 上 onSpeechRecognized 不触发 | [react-native-voice #253](https://github.com/react-native-voice/voice/issues/253)                                      | 致命   |
| react-native-voice 不兼容 Expo 53 / RN 0.76+               | [react-native-voice #547](https://github.com/react-native-voice/voice/issues/547)                                      | 致命   |
| RN 0.76.5 升级后 App 崩溃                                  | [React Native #48394](https://github.com/facebook/react-native/issues/48394)                                           | 高     |
| react-native-tts stop() 方法在 Android 上报类型转换错误    | [Reddit r/reactnative](https://www.reddit.com/r/reactnative/comments/1nv3i1y/facing_some_issue_with_react_native_tts/) | 中     |

### 残酷结论

1. **决策 #24 选择的 Android 原生 SpeechRecognizer 方案** 需要写 Native Module（Java/Kotlin），这不是 48h 内能完成的。
2. **当前代码中的 Expo Audio + API 方案** 依赖不存在的 polyfill，也不可行。
3. **react-native-voice 库** 与 RN 0.76 不兼容。
4. **Edge-TTS** (决策 #33) 是 TTS 不是 STT，只解决了"说话"不解决"听"。

**缓解方案**:

48h 内语音按钮的现实方案只有一条路: 用 `@react-native-voice/voice` 库（如果它能桥接成功），或者放弃 STT，改用文字输入 + Edge-TTS 输出（只做"伊伊说话"不做"用户说话"）。这在 Sprint Demo 中是可以接受的 -- 演示时手动输入文字，伊伊用语音回复。

---

## 维度 5: Windows 7x24 可靠性

**评分: 4/10** -- Demo 阶段够用，但任何 7x24 声明都缺乏实测支撑

### 实际风险评估

| 风险因素                | 概率          | 影响                              | 当前状态   |
| ----------------------- | ------------- | --------------------------------- | ---------- |
| 断电（无 UPS）          | 每月 0.5-1 次 | 数据库可能损坏，重启需 10-30 分钟 | 无防护     |
| Windows 自动更新重启    | 每月 1-2 次   | 服务中断 10-30 分钟               | 未配置     |
| Docker Desktop 内存泄漏 | 每周 1 次     | 需要手动重启                      | 未监控     |
| WSL2 时钟漂移           | 每周 1 次     | SSL 证书验证失败                  | 未处理     |
| GPU 驱动崩溃            | 每月 0.5 次   | ML 服务不可用                     | 未监控     |
| 家庭宽带中断            | 每月 1-2 次   | 外部完全不可访问                  | 无备份网络 |

### 断电数据丢失分析

PostgreSQL 在突然断电时的风险取决于配置:

- **默认配置 (fsync=on)**: 数据文件几乎不丢失，但 WAL 可能丢失最后几个事务。重启后自动恢复。
- **如果 Docker volume 在 NTFS 上**: WSL2 的 ext4 文件系统比 NTFS 原生更安全。确保 PG data 在 WSL2 文件系统内。
- **Qdrant**: 内存中的未持久化向量数据会丢失。需要配置定期 snapshot。
- **Redis**: 默认 RDB 策策（每 5 分钟保存），可能丢失最近 5 分钟数据。开启 AOF 可减少丢失。

### 真正的结论

Demo 阶段不需要 7x24。评委看 Demo 时只要你的开发机开着就行。文档中大量篇幅讨论 7x24 可靠性是过早优化。48h Sprint 的可靠性问题只有一个: 确保你在演示前睡一觉时电脑不会自动更新重启。

**缓解操作（30 分钟搞定）**:

1. `powercfg /h off` -- 关闭休眠
2. Windows Update 暂停 7 天
3. Docker Desktop 设置开机自启
4. docker-compose 里所有 service 加 `restart: unless-stopped`

---

## 维度 6: AutoDL GPU 训练实际流程

**评分: 6/10** -- RTX 4090 足够，但环境准备和数据工程被严重低估

### Fine-tune CLIP 的真实时间线

| 阶段          | 工作内容                                        | 预估时间 | 被文档考虑了吗 |
| ------------- | ----------------------------------------------- | -------- | -------------- |
| 1. 环境准备   | AutoDL 租实例 + CUDA/cuDNN 验证 + PyTorch 安装  | 2-4h     | 否             |
| 2. 数据收集   | 从淘宝/DeepFashion 收集中国时尚图片 + 标注      | 2-5 天   | 否             |
| 3. 数据预处理 | 清洗 + 裁剪 + 编码 + 训练集/验证集分割          | 4-8h     | 否             |
| 4. 训练代码   | 修改 CLIP fine-tune 脚本（对比学习 + 中国数据） | 4-8h     | 否             |
| 5. 训练执行   | 5000 张图片 / RTX 4090 / 10 epochs              | 2-4h     | 部分考虑       |
| 6. 评估验证   | Recall@K 测试 + 偏见审计                        | 4-8h     | 否             |
| 7. ONNX 导出  | 模型导出 + 验证向量化一致性                     | 2-4h     | 否             |

**总计**: 最快 4-7 天（假设数据已有），如果数据要自己收集可能需要 2-3 周。

### AutoDL 实际成本

| GPU             | 价格       | 适合 CLIP Fine-tune | 说明                         |
| --------------- | ---------- | ------------------- | ---------------------------- |
| RTX 4090 (24GB) | 1.5-3 元/h | 完全足够            | CLIP ViT-B/32 只需 ~4GB VRAM |
| A100 (40GB)     | 2.8-4 元/h | 够用但浪费          | 除非训练 ViT-L               |
| A100 (80GB)     | 4-6.5 元/h | 严重浪费            | 不需要                       |

Fine-tune CLIP ViT-B/32 在 RTX 4090 上 5000 张图片 10 epochs 约 2-3 小时，花费约 5-9 元。文档估计的 ~15 元/次是合理的。

### 残酷结论

48h Sprint 完全不需要考虑 GPU 训练。FashionCLIP 开源模型直接用就够 Demo 展示了。Fine-tune 是 Phase 6+ 的事情，为它焦虑是浪费精力。

但如果你想在比赛展示时说"我们在中国数据上做了 Fine-tune"，那至少需要提前 1 周准备数据。当前 0 条中国时尚训练数据。

**来源**: [中小团队算力突围](https://juejin.cn/post/7616528442130284580) / [A100 租赁](https://www.mornai.cn/news/gpu/a100-gpu-rent-trend/) / [GPU 平台测评](https://www.cnblogs.com/zhixingyun/p/19713996)

---

## 维度 7: Phase 间依赖链

**评分: 4/10** -- 有 3 条隐藏串行依赖，48h 严格并行不可行

### 文档声称的并行结构

```
Phase 1: Agent A + Agent B + Agent C 并行 (修 TS 错误)
Phase 2: Agent A + Agent B + Agent C 并行 (管道/性别/数据)
Phase 3: Agent A + Agent B + Agent C 并行 (导航/Today/Discover)
Phase 4: Agent A + Agent B + Agent C 并行 (Stylist/Onboarding/规则)
```

### 实际依赖关系

```
Phase 1 ──────────────────────────────────────────────────────
  |                                                           |
  | (1) gender 降级影响 Phase 2 的 ColdStartService           |
  | (2) design-system 修复影响 Phase 3 的所有 UI              |
  | (3) polyfill 创建影响 Phase 4 的 STT                      |
  v                                                           |
Phase 2 ──────────────────────────────────────────────────────
  |                                                           |
  | (4) Orchestrator 重构影响 Phase 3 的 Today Screen         |
  | (5) Mock 商品数据影响 Phase 3 的 Discover Screen          |
  | (6) RecommendationOutput 接口影响 Phase 4 的 Stylist      |
  v                                                           |
Phase 3 ──────────────────────────────────────────────────────
  |                                                           |
  | (7) 4 Tab 导航完成才能放 Phase 4 的 Stylist Screen        |
  | (8) Today Screen 完成才能嵌入 Phase 4 的语音按钮          |
  v                                                           |
Phase 4 ──────────────────────────────────────────────────────
```

### 3 条致命的隐藏串行依赖

**隐藏依赖 1: design-system 是共享基础**

Phase 1 Agent A 修 ThemeSystem.tsx (18 个错误)。但 Phase 3 Agent B 写 Today Screen 时依赖 ThemeSystem 输出的正确颜色/间距 token。如果 Agent A 还没修完 ThemeSystem，Agent B 写 Today Screen 时要么等要么写错。

解决方案: Phase 1 第一个小时先修好 ThemeSystem + design-tokens 导出（因为这是最上游的依赖），然后才能释放 Agent B 开始 Phase 3。

**隐藏依赖 2: OnboardingOutput 接口是跨 Phase 的**

Phase 1 冻结 OnboardingOutput 接口。Phase 2 Agent B 修后端 Onboarding DTO。Phase 4 Agent B 写新 Onboarding 4 步流程。这三者必须严格顺序执行。如果 Phase 2 改了接口但 Phase 4 不知道，所有 Onboarding 相关代码都要返工。

**隐藏依赖 3: 4 Tab 导航是 Phase 4 的前置条件**

Phase 4 的 Stylist Screen 需要放在新的 4 Tab 结构中的 "造型师" Tab 下。如果 Phase 3 没完成导航重构，Phase 4 写的 Stylist 单屏体验无处安放。

### 修正后的时间线

```
H0-H1:   全员 -- 冻结接口 + 确认 ThemeSystem + 分配文件
H1-H8:   Phase 1 修复 (并行)
H8-H16:  Phase 2 管道 (并行，但依赖 Phase 1 完成情况)
H16-H28: Phase 3 导航 (Agent B/C 依赖 Phase 2 结果)
H28-H38: Phase 4 核心 (只能串行 -- 导航 -> Stylist -> 语音)
H38-H48: Phase 5 修补 + 测试
```

现实中 Phase 3 和 Phase 4 大部分工作必须是串行的。

---

## 维度 8: 备选方案 -- 3 Phase 版

**评分: 7/10** -- Phase 1+2+3 组合能产出可用的 Demo

### 如果 48h 只能完成 3 个 Phase，选哪 3 个？

**推荐组合: Phase 1 + Phase 2 + Phase 3 (精简版)**

| 选择        | 能展示什么                                                                            | 不能展示什么                                    |
| ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Phase 1+2+3 | 4 Tab 导航、Today Screen 有推荐、Discover 有商品流、Onboarding 旧版可用、推荐管道走通 | 语音按钮、新 Onboarding、Stylist 对话、试衣嵌入 |
| Phase 1+2+4 | 推荐管道、Stylist 对话、Onboarding 新版                                               | 4 Tab 导航、Today/Discover Screen、导航体验完整 |
| Phase 1+3+4 | 4 Tab 导航、Stylist 对话                                                              | 推荐管道不通、冷启动数据缺失                    |

Phase 1+2+3 是最优组合，因为:

1. **用户第一次打开 App 就能看到完整的 4 Tab 体验** -- 视觉冲击力最强
2. **Today Screen 有推荐内容** -- 核心价值主张可展示
3. **推荐管道走通** -- 技术深度可展示（6 层漏斗可视化）
4. **Stylist 可以用旧版 AiStylistScreen** -- 降级但不缺失
5. **Onboarding 用旧版** -- 功能不缺失，只是没有新流程

### 精简版 Phase 3 的取舍

在 Phase 3 时间不够时，砍掉这些:

| 砍掉                                     | 节省时间 | 影响                                   |
| ---------------------------------------- | -------- | -------------------------------------- |
| Discover Screen 策展空间（只保留推荐流） | 2-3h     | 低 -- 推荐流是核心，策展空间是锦上添花 |
| 穿搭日历简化版                           | 2-3h     | 低 -- 日历不是核心展示点               |
| Today Screen 场景卡天气集成              | 1-2h     | 中 -- 改用固定场景                     |
| 语音按钮                                 | 3-4h     | 中 -- 改用文字输入（反正 STT 不可行）  |

### 备选 Demo 展示路径

```
1. 打开 App -> 看到 4 Tab -> 进入 Today Tab
2. Today Tab 展示推荐方案（基于 Mock 数据）
3. 点击方案 -> 看到搭配详情 + 推荐解释
4. 进入 Discover Tab -> 看到推荐商品流
5. 进入 Stylist Tab -> 用旧版 AI 对话（文字输入）
6. 进入 Me Tab -> 个人中心（旧版）
7. 技术展示: 6 层漏斗可视化（独立页面或截图）
```

这已经是一个**完整可用的 Demo**。缺少的语音和新 Onboarding 可以在后续 Sprint 补充。

---

## 技术债务快照

### TODO/FIXME 分布

项目中有 88 个 TODO/FIXME/HACK 标记（实测扫描 apps/ 和 ml/ 目录）。

### 项目规模快照

| 模块                 | 文件数          | TS 错误 | 语言                      |
| -------------------- | --------------- | ------- | ------------------------- |
| 后端 (apps/backend)  | 655 个 .ts      | 0       | TypeScript (NestJS)       |
| 移动端 (apps/mobile) | 703 个 .ts/.tsx | 138     | TypeScript (React Native) |
| ML 服务 (ml/)        | 83 个 .py       | N/A     | Python (FastAPI)          |

---

## 风险缓解清单 (按优先级排序)

### P0 -- 必须在 Sprint 开始前解决

| #   | 风险                                   | 缓解操作                                                                           | 耗时      |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------- | --------- |
| 1   | TS 错误中有大量不需要修的 feature 文件 | 在 tsconfig.json 中 exclude community/consultant/customization/heartrecommend 目录 | 15min     |
| 2   | STT 方案不可行                         | Sprint 放弃语音按钮，改用文字输入 + Edge-TTS 输出                                  | 决策 5min |
| 3   | 接口冻结与代码不一致                   | Phase 1 第 1 小时全员确认 3 个冻结接口的实际代码位置                               | 1h        |

### P1 -- 必须在 Phase 1 完成时解决

| #   | 风险                     | 缓解操作                                                                        | 耗时  |
| --- | ------------------------ | ------------------------------------------------------------------------------- | ----- |
| 4   | design-system 是共享依赖 | 优先修好 ThemeSystem.tsx + design-tokens.ts，其他 TS 错误可以后修               | 1-2h  |
| 5   | polyfill 文件缺失        | 创建 thin wrapper polyfill: flash-list, expo-vector-icons, expo-linear-gradient | 1h    |
| 6   | 3 Agent 文件冲突         | 用 `git stash` 隔离，每个 Agent 开新分支                                        | 30min |

### P2 -- Phase 3-4 时注意

| #   | 风险               | 缓解操作                                                  | 耗时  |
| --- | ------------------ | --------------------------------------------------------- | ----- |
| 7   | Phase 3 超时       | 砍掉日历 + 策展空间，只保留 4 Tab + Today + 基础 Discover | 决策  |
| 8   | Phase 4 STT 不可用 | 降级为文字输入 + TTS，Demo 演示时手动输入                 | 2h    |
| 9   | Windows 自动重启   | 暂停 Windows Update + 关闭休眠 + Docker 自启              | 15min |

---

## 最终结论

48h 完成全部 5 Phase 的概率: **15-25%**

**推荐策略**:

1. 接受 Phase 4 的语音按钮不可能在 48h 内完成的事实
2. 将目标调整为 "Phase 1+2+3 完整 + Phase 4 部分（Stylist 单屏体验 + 旧版 Onboarding）"
3. 在 Phase 1 开始前花 15 分钟 exclude 不需要的 feature 目录
4. Phase 1 的前 1 小时用于冻结接口 + 确认依赖，不做代码修改
5. 准备一个 "Phase 3 精简方案"，当日历和策展空间来不及就果断砍

**一句话**: 你的计划写得很漂亮，但工程现实是 -- 138 个 TS 错误不是数字，54 个缺失模块意味着项目结构经历过一次不完整的迁移。先修基础设施，再堆功能。48h 的目标不是做完所有功能，而是做出一个能让人 "哇" 的 Demo。

---

_审计完成: 2026-04-23 | 下一步: 根据 P0 缓解清单调整 Sprint 启动计划_
