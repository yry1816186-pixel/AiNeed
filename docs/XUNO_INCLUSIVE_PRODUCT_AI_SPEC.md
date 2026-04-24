# 寻裳包容性产品与 AI 建模规范

## 1. 目的

这份文档用于把 [XUNO_TOP_LEVEL_DESIGN.md](./XUNO_TOP_LEVEL_DESIGN.md) 里的顶层原则继续往下传导到产品结构、Onboarding、画像系统、推荐引擎、虚拟试衣和会员设计中。

核心前提只有一句话：

**寻裳不是“面向女性”的产品，而是“面向全年龄段、跨性别、满足适龄与合规要求用户”的穿搭决策平台。**

这意味着：

- 产品边界不能由性别先验定义
- AI 不应以性别作为默认一阶判断逻辑
- 用户建模应优先围绕场景、体型、尺码、风格、预算、气候、年龄阶段展开
- 性别相关信息只能作为可选辅助信号，而不是强依赖输入

## 2. 产品定义方式

### 2.1 统一定义

寻裳服务的是“有形象与穿搭决策需求的人”，而不是某一性别群体。

建议后续所有文案、PRD、设计稿和 AI Prompt 统一采用以下表述：

- 用户
- 穿搭需求用户
- 有形象管理需求的人
- 有服装选择、试衣、搭配、购买决策需求的人

避免使用：

- 默认她/女生/女性用户
- 女生怎么穿
- 男生/女生各一套默认逻辑
- 仅按男装/女装进行第一层推荐分流

### 2.2 用户切分主轴

寻裳的用户切分建议采用 6 个主轴：

1. 年龄阶段
2. 主要场景
3. 体型与尺码
4. 风格表达
5. 预算与购买习惯
6. 气候与地域

性别、性别表达、文化偏好、审美偏好可以存在，但属于辅助上下文。

## 3. 年龄与适龄层设计

### 3.1 为什么必须单独设计

既然产品面向全年龄段，就不能只做“泛成年人默认模型”。

系统至少要区分：

- 是否满足平台最低使用年龄
- 是否属于青少年用户
- 是否属于成熟用户/银发用户
- 不同年龄阶段的内容边界、商品表达和推荐语气

### 3.2 建议的年龄阶段

建议内部统一用 `ageBand` 而不是只存粗糙年龄字符串：

- `teen`
- `young_adult`
- `adult`
- `midlife`
- `senior`

具体年龄边界由产品、法务、运营按平台政策确定，不要在多个模块里各自写死。

### 3.3 适龄规则

年龄阶段要影响以下系统：

- Onboarding 字段与文案
- 推荐内容的成熟度
- 商品暴露范围
- 社区内容可见范围
- 定制和顾问服务可见性
- 会员售卖策略

对未成年人或青少年模式用户，系统应默认：

- 降低成人化、性感化、强消费刺激内容
- 降低深度社交暴露
- 控制高客单和高冲动转化路径
- 更强调校服替代、校园、家庭、运动、节日、表演、日常整洁等场景

## 4. Onboarding 传导规则

### 4.1 当前系统暴露出的偏差

从现有代码看，系统仍把性别放在比较前的位置：

- [onboardingStore.ts](/C:/AiNeed/apps/mobile/src/features/onboarding/stores/onboardingStore.ts:1) 将 `gender` 放进基础表单
- [onboardingService.ts](/C:/AiNeed/apps/mobile/src/services/onboardingService.ts:1) 会直接把 `gender` 提交到 `/profile`
- [ProfileSetupFlow.tsx](/C:/AiNeed/apps/mobile/src/shared/components/flows/ProfileSetupFlow.tsx:1) 存在单独的“性别”步骤
- [auth.dto.ts](/C:/AiNeed/apps/backend/src/domains/identity/auth/dto/auth.dto.ts:1) 在手机号注册里把 `gender` 作为必填
- [profile-completeness.service.ts](/C:/AiNeed/apps/backend/src/domains/identity/profile/services/profile-completeness.service.ts:1) 目前把 `gender` 计为 Profile 完整度的 10%

这些设计都说明：当前系统仍默认“性别是穿搭建模的核心入口”，这与新的产品方向不一致。

### 4.2 建议的新 Onboarding 主线

建议将主 Onboarding 改为：

1. 你主要在哪些场景需要穿搭帮助
2. 你目前最想解决什么问题
3. 你的年龄阶段
4. 你的尺码/体型信息
5. 你的风格偏好与穿搭表达
6. 是否上传照片或连接衣橱

### 4.3 建议的字段优先级

#### 必填

- `ageBand`
- `primaryScenarios`
- `styleGoals`

#### 强建议填写

- `height`
- `weight`
- `usualSize`
- `budgetBand`
- `cityOrClimateZone`

#### 可选

- `bodyMeasurements`
- `colorSeason`
- `wardrobeSource`
- `gender`
- `genderExpression`

### 4.4 性别字段的正确位置

`gender` 不应该是“帮助我们更好地推荐”的默认文案入口。

如果保留，建议改成：

- 可选字段
- 只在用户愿意提供时填写
- 文案改成“帮助我们在部分款式与表达上更贴近你的偏好”

并新增一个更有产品价值的字段：

- `styleExpression`

例如：

- 简洁利落
- 柔和优雅
- 中性平衡
- 个性实验
- 无特别偏好

这个字段比“男/女/其他”更接近真实穿搭决策。

### 4.5 Profile 完整度重算建议

建议把当前的 Profile 完整度权重重排：

#### 旧逻辑问题

- `gender` 被算作基础完整度的重要组成
- 这会反向诱导产品和用户把性别当成主字段

#### 新逻辑建议

- 场景信息：20%
- 尺码/体型信息：25%
- 风格偏好：20%
- 衣橱/收藏/历史反馈：20%
- 照片与视觉信息：15%

性别不应进入完整度主权重；若保留，也只应放在“补充画像”层，不应影响主完成率。

## 5. 首页与信息架构传导

### 5.1 首页问题

当前首页和导航里，多个入口并列出现，像功能目录而不是任务流：

- [RootNavigator.tsx](/C:/AiNeed/apps/mobile/src/navigation/RootNavigator.tsx:1)
- [MainStackNavigator.tsx](/C:/AiNeed/apps/mobile/src/navigation/MainStackNavigator.tsx:1)
- [HomeScreen.tsx](/C:/AiNeed/apps/mobile/src/features/home/screens/HomeScreen.tsx:1)
- [QuickActions.tsx](/C:/AiNeed/apps/mobile/src/features/home/screens/components/QuickActions.tsx:1)

`AI造型 / 试衣 / 购物车 / 衣橱 / 风格报告` 并列，说明当前首页还在“陈列功能”。

### 5.2 新首页原则

首页只回答三个问题：

1. 今天我最该穿什么
2. 现在我最该做什么
3. 这件东西适不适合我

### 5.3 首页结构建议

建议首页内容排序：

1. 今日场景卡
2. 今日推荐方案
3. 候选单品适配判断
4. 衣橱缺口提醒
5. 灵感与真实示例
6. 会员升级触发点

而不是先铺满功能入口。

### 5.4 社区位置

社区不作为主导航主角，建议放在：

- 方案详情页中的真实穿搭示例
- 商品详情页中的“别人怎么穿”
- 首页中“灵感补充”区块

社区先做决策证据层，再做独立消费层。

### 5.5 会员位置

会员的售卖要绑定结果，不是绑定身份。

触发场景应是：

- 想继续展开方案时
- 想保存更多搭配时
- 想解锁更高频试衣时
- 想获得周计划/衣橱诊断时

## 6. AI 用户建模规范

### 6.1 总原则

AI 建模要采用“属性优先，身份辅助”的策略。

也就是说：

- 先理解这个人当前处于什么场景
- 再理解这个人的身体与尺码条件
- 再理解风格偏好与衣橱资源
- 最后在必要时引入性别、表达方式、文化偏好等辅助信号

### 6.2 推荐模型的建议结构

建议统一用户模型：

#### A. Compliance Profile

- `ageBand`
- `safetyLevel`
- `guardianMode`

#### B. Fit Profile

- `height`
- `weight`
- `measurements`
- `bodyType`
- `usualSize`
- `fitPainPoints`

#### C. Style Profile

- `preferredAesthetics`
- `avoidances`
- `styleExpression`
- `formalityPreference`
- `colorPreferences`
- `colorSeason`

#### D. Context Profile

- `occasion`
- `weather`
- `city`
- `budgetBand`
- `dressCode`
- `calendarContext`

#### E. Wardrobe Graph

- `ownedItems`
- `usageFrequency`
- `gaps`
- `recentLooks`

#### F. Optional Identity Signals

- `gender`
- `genderExpression`
- `culturePreference`

注意：`Optional Identity Signals` 必须是最后接入，不得成为检索第一层过滤器。

### 6.3 推荐引擎排序原则

推荐顺序建议固定为：

1. 适龄与安全过滤
2. 场景匹配
3. 尺码/体型/版型适配
4. 预算与库存可行性
5. 风格偏好匹配
6. 衣橱互补性
7. 性别表达/审美表达微调
8. 解释生成

这样可以避免系统先按“男/女装”做硬分流。

### 6.4 解释文案原则

系统解释应优先说：

- 适合你的场景
- 适合你的版型需求
- 适合你的预算
- 和你已有衣橱更好搭

尽量避免：

- 因为你是女生
- 因为你是男性
- 女性更适合
- 男性不建议

除非涉及明显的生理尺码、版型工程或用户明确选择了某种表达偏好。

## 7. 虚拟试衣规范

### 7.1 虚拟试衣不应依赖性别分桶

试衣系统的核心输入应是：

- 人体轮廓与比例
- 身体关键点
- 尺码与版型数据
- 服装廓形与覆盖范围
- 面料与垂坠信息
- 拍照质量与姿态质量

而不是：

- 先判断男/女，再决定能不能试

### 7.2 服装标签建议

商品和试衣素材应优先打这些标签：

- `silhouette`
- `coverage`
- `fit`
- `fabric`
- `stretch`
- `layeringRole`
- `occasion`
- `sizeCurve`

`menswear/womenswear/unisex` 可以保留，但应该属于 merchandising 标签，而不是试衣核心逻辑标签。

### 7.3 试衣结果解释

试衣反馈建议输出：

- 是否适配体型与尺码
- 哪些部位可能不理想
- 如果不理想，推荐换什么版型
- 如果适合，适合在哪些场景穿

这样比“这是一件适合某性别的衣服”更有价值。

## 8. 体型与健康指标建模边界

### 8.1 当前代码中的风险点

[body-metrics.service.ts](/C:/AiNeed/apps/backend/src/domains/identity/profile/services/body-metrics.service.ts:1) 当前存在明显的性别默认逻辑：

- 用户缺失性别时默认 `Gender.female`
- 多个身体指标公式以 `female/male` 两类分支处理

这在工程上可以理解，但在产品上有两个问题：

1. 会把“女性”默认为系统默认用户
2. 会把穿搭系统和生理计算系统混在一起

### 8.2 建议的拆分方式

后续应将这类能力拆成两层：

#### A. 穿搭决策层

只关心：

- 版型适配
- 尺码概率
- 轮廓平衡
- 风格表达

#### B. 生理/健康计算层

如果保留，必须明确：

- 仅在用户主动提供相关信息时使用
- 仅用于特定健康或体型指标场景
- 与穿搭推荐主链解耦

也就是说，穿搭决策不应依赖“先知道性别再推荐”，而应依赖“先知道轮廓与场景再推荐”。

## 9. Catalog 与 Merchandising 规范

### 9.1 商品分类原则

商品系统建议区分两套维度：

#### 基础商品维度

- 品类
- 版型
- 面料
- 季节
- 价格带
- 尺码
- 适用场景

#### 表达与陈列维度

- 中性
- 偏柔和
- 偏利落
- 偏正式
- 偏街头
- 男装线/女装线/童装线/银发线

后者属于陈列和搜索辅助，不应该盖过前者。

### 9.2 搜索与推荐词

建议允许用户以这些方式搜索：

- 通勤衬衫
- 适合显高的裤子
- 适合中学生的运动外套
- 适合银发用户的正式套装
- 中性风通勤鞋

这类表达比单纯“男装/女装”更贴近真实需求。

## 10. 当前系统最需要修正的 6 个点

1. `Onboarding` 不应把性别放在主步骤中。
2. `PhoneRegisterDto` 不应把 `gender` 作为个性化推荐必填前置。
3. `ProfileCompleteness` 不应给 `gender` 主权重。
4. `BodyMetrics` 不应把 `female` 作为默认兜底用户。
5. `ProfileSetupFlow` 的文案应从“帮助我们更好地推荐”改成“补充你的表达偏好”。
6. AI 推荐与试衣系统的说明文档应明确“属性优先，身份辅助”的策略。

## 11. 推荐落地顺序

### 第一批

- 调整设计与产品文案
- 重写 Onboarding 字段优先级
- 重算 Profile 完整度

### 第二批

- 引入 `ageBand` 与 `styleExpression`
- 把 `gender` 改为可选辅助字段
- 清理推荐与提示语中的性别默认表述

### 第三批

- 重构体型/尺码/试衣建模
- 重构商品标签体系
- 将社区与会员逻辑按新 IA 重新嵌入

## 12. 一句话原则

**寻裳要理解的是“这个人当下需要怎样的穿搭决策”，而不是“这个人先被归到哪种性别”。**
