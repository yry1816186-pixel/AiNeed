# AiNeed 时尚 App UI 设计参考研究

> 搜索日期: 2026-04-23
> 研究范围: 18 项关键词搜索，覆盖 App UI 参考、图标系统、字体方案

---

## 一、App UI 参考

### 1.1 综合 / Dribbble 时尚 App 设计趋势

| App/来源                                 | 风格关键词                                        | 配色方案                                             | 字体                                                 | 核心动效                                 | 可借鉴页面                                      | 截图/Demo 链接                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dribbble Fashion App 趋势(2025-2026)** | 极简、高级感、大图留白、编辑风(editorial)、沉浸式 | 黑白为主 + 品牌色点缀(低饱和度); 渐变色用于 CTA 按钮 | Playfair Display + Inter; Cormorant + Helvetica Neue | 卡片悬浮微动、页面转场滑动、图片视差滚动 | 首页瀑布流、商品详情页、OOTD 日历页、穿搭推荐流 | [Dribbble Fashion 搜索](https://dribbble.com/search/fashion-app) / [Behance](https://www.behance.net/search/projects?search=fashion+app+UI+design) |

**设计趋势总结:**

- 2025-2026 主流风格: **极简线性(micro-minimalism)** + **沉浸式全屏图**
- 常见布局: 瀑布流(Pinterest 式)、全屏沉浸式卡片、底部 Tab 导航
- 品牌色用法: 小面积点缀(按钮、标签、图标高亮)，大面积中性色

---

### 1.2 AI 衣橱 / 穿搭推荐 App

| App 名                            | 风格关键词                     | 配色方案                                | 字体                                                    | 核心动效                                 | 可借鉴页面                                   | 截图/Demo 链接                                                                                                         |
| --------------------------------- | ------------------------------ | --------------------------------------- | ------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Whering**                       | 柔和、女性化、日历导向、卡片式 | 奶油白背景 + 浅粉/浅紫点缀; 柔和渐变    | Sans-serif 圆体(SF Pro / Inter); 标题用 Medium/SemiBold | 卡片拖拽排序、日历滑动切换、衣橱网格动画 | 衣橱管理页(网格布局)、穿搭日历页、每日推荐页 | [Whering 官网](https://whering.co.uk/) / [Reddit 讨论](https://www.reddit.com/r/femalefashionadvice/comments/177fzog/) |
| **Pureple**                       | 清新、AI 智能感、功能性        | 白色背景 + 薄荷绿强调色; 蓝色系辅助     | 系统字体(San Francisco/Roboto)                          | 智能推荐卡片展开、穿搭组合翻转动画       | AI 推荐结果页、衣橱浏览页、穿搭灵感页        | [Pureple 官网](https://pureple.com/)                                                                                   |
| **Acloset**                       | 现代、扁平化、AI 驱动          | 深色模式为主; 霓虹蓝/紫渐变用于 AI 元素 | 无衬线体; 代码感字体用于 AI 标签                        | 衣物背景自动去除动画、AI 分析进度条      | AI 衣橱扫描页、穿搭建议详情、风格分析报告    | [Style3D 对比评测](https://www.style3d.ai/blog/which-ai-fashion-stylist-app-gives-the-most-accurate-advice/)           |
| **Fits App**                      | 简约、工具感、高可用性         | 白底 + 深灰文字; 品牌橙色 CTA           | 系统字体                                                | 平滑列表滑动、标签切换过渡               | 穿搭规划页、衣橱概览页、统计看板             | [Fits 官网](https://www.fits-app.com/)                                                                                 |
| **AI Wardrobe (Dribbble 概念)**   | 现代扁平、流畅交互、Figma 风格 | 浅灰背景 + 亮蓝/紫色渐变; 高对比 CTA    | Inter / SF Pro                                          | 衣物添加 → 选择 → 搭配的流畅流程动画     | 添加衣物页、选择穿搭页、穿搭结果展示页       | [Dribbble: AI Wardrobe](https://dribbble.com/shots/27098417-AI-Wardrobe-Mobile-App-Add-Select-Outfit-UI-Design)        |
| **AI Fashion Stylist (Dribbble)** | 智能感、卡片式、个性化         | 深色主题 + 渐变色 AI 元素; 绿色用于推荐 | 圆体无衬线; 渐变色文字用于 AI 标签                      | 智能扫描动画、推荐卡片滑动、天气联动过渡 | AI 扫描衣橱页、智能推荐结果、天气适配穿搭    | [Dribbble: AI Stylist](https://dribbble.com/shots/26770791-AI-Fashion-Stylist-Smart-Outfit-Recommendation-App-UI-UX)   |
| **Combyne**                       | 社交化、创意、年轻化           | 丰富色彩; 渐变紫+粉; 品牌蓝             | 圆体; 活泼字体                                          | 穿搭组合拖拽、社交互动动画、滤镜切换     | 穿搭创建页、社区发现页、品牌浏览页           | [App Store](https://apps.apple.com/us/app/combyne-your-perfect-outfit/id989727742)                                     |
| **Dripped**                       | AI 驱动、极简、工具属性        | 深色主题 + 荧光绿/蓝; 科技感            | 系统无衬线; 等宽字体用于数据                            | AI 试穿渲染动画、日历滑动、天气卡片翻转  | AI 试穿页、每日穿搭建议、衣橱统计            | [App Store](https://apps.apple.com/cn/app/outfit-closet-fits-dripped/id6749790183)                                     |
| **Digital Wardrobe (Figma)**      | 温暖、亲和、柔美               | 暖色调: 奶油色+珊瑚粉+薄荷绿; 柔和阴影  | 圆角无衬线; 手写体用于装饰                              | 衣橱卡片悬浮、日历日期选中动效           | 衣橱主页、穿搭日历、添加衣物                 | [Figma 模板](https://www.figma.com/community/file/1352238241390370173/digital-wardrobe-app-ui)                         |

**AI 衣橱 App 核心 UI 模式:**

- 衣橱管理: 网格/列表双模式，支持拍照添加+AI 自动去背景
- 穿搭推荐: 卡片式推荐流，天气/场合联动
- 日历规划: 月/周视图，拖拽穿搭到日期
- 风格分析: 环形图/柱状图展示色彩偏好、穿着频率

---

### 1.3 虚拟试穿 App

| App/概念                   | 风格关键词                  | 配色方案                             | 字体                             | 核心动效                                                     | 可借鉴页面                                           | 截图/Demo 链接                                                                                                                                   |
| -------------------------- | --------------------------- | ------------------------------------ | -------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **通用虚拟试穿模式(2025)** | AR 优先、沉浸式、实时反馈   | 深色半透明覆盖层; 品牌色用于 UI 控件 | 无衬线; 紧凑型用于浮动标签       | AR 实时渲染、手势操控(捏合缩放/滑动旋转)、产品"吸附"触觉反馈 | AR 试穿主界面(相机全屏)、产品切换底栏、分享/购买浮层 | [Google Codelab 教程](https://codelabs.developers.google.com/smart-stylist-app)                                                                  |
| **Stitch Fix Vision**      | 高端感、数据驱动、AI+人结合 | 深蓝/黑 + 金色点缀; 干净白色详情页   | 品牌定制 serif + 系统 sans-serif | GenAI 风格可视化渐入、个人风格画像构建动画                   | 风格问卷页、AI 试穿可视化页、推荐 Fix 预览           | [Stitch Fix Vision](https://newsroom.stitchfix.com/blog/stitch-fix-introduces-stitch-fix-vision-a-genai-powered-style-visualization-experience/) |

**虚拟试穿核心 UI 模式:**

- 相机全屏作为主界面，最小化 UI 覆盖层
- 底部浮动操作栏: 拍照/分享/加入购物车
- 产品切换: 水平滑动卡片
- 对比模式: 前后/左右对比

---

### 1.4 小红书 (RED / Xiaohongshu)

| 维度           | 详情                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **风格关键词** | 瀑布流、图片优先、社区化、种草文化、高饱和度、圆角卡片                                                    |
| **配色方案**   | 品牌红(#FF2442)用于按钮/标签/强调; 大面积白色背景; 灰色文字层级                                           |
| **字体**       | 系统字体(SF Pro/PingFang SC); 正文 14-16px; 标题 18-20px 加粗                                             |
| **核心动效**   | 双击点赞(心形动画)、瀑布流无限滚动、笔记上下滑动切换(类抖音)、发布按钮弹起动画                            |
| **可借鉴页面** | 首页发现(双列瀑布流)、搜索页(热门标签+搜索建议)、笔记详情页(沉浸式滑动)、购物标签嵌入、发布流程(简化三步) |
| **关键链接**   | 小红书官网: xiaohongshu.com                                                                               |

**小红书设计亮点:**

- 双列瀑布流适配不同图片比例，视觉节奏丰富
- 品牌"红"贯穿但不过度，主要用于交互反馈
- 搜索栏置于顶部显眼位置，鼓励主动探索
- 发布入口(+)居中突出，降低发布门槛

---

### 1.5 得物 (POIZON)

| 维度           | 详情                                                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **风格关键词** | 潮流、年轻化、科技感、3D 交互、沉浸式购物、球鞋文化                                                                                                                                                   |
| **配色方案**   | 黑/深灰主背景; 亮绿(#00D85A)作为品牌色; 高对比度文字                                                                                                                                                  |
| **字体**       | 系统字体; 大号粗体标题; 数字使用等宽字体突出价格                                                                                                                                                      |
| **核心动效**   | 3D 球鞋旋转展示、AR 试穿、鉴别流程动画、商品卡片翻转                                                                                                                                                  |
| **可借鉴页面** | 首页(潮流社区+商城混合)、商品 3D 展示页、鉴别流程可视化、社区穿搭分享、POIZON S 空间计算体验                                                                                                          |
| **关键链接**   | [得物设计系统](http://duchuanhu.com/work/archives/work13_dewuApp.html) / [Behance](https://www.behance.net/gallery/129650857/POIZON/modules/734680155) / [站酷主页](https://m.zcool.com.cn/u/2546108) |

**得物设计亮点:**

- 拥有完整内部设计系统(设计理念/视觉规范/组件库/交互规范)
- "先鉴别再发货"的差异化流程设计，UI 上通过进度条+图标可视化
- POIZON S App 探索空间计算，3D 球鞋博物馆体验

---

### 1.6 SHEIN (及其 Redesign 概念)

| 维度                     | 详情                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **当前 SHEIN**           | 信息密集型、促销导向、电商感强、快时尚                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **常见批评**             | 界面杂乱、信息过载、视觉层次不清                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Redesign 方向**        | 极简净化、更好视觉层次、简化导航、更精致现代美学                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **配色方案(原版)**       | 白底 + 黑色/红色促销标签 + 多彩分类                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **配色方案(Redesign)**   | 柔和中性色 + 单一品牌色 + 大留白                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **可借鉴 Redesign 页面** | 简化导航栏、大图商品展示、干净分类页、流畅结账流程                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **关键链接**             | [Medium: Redesigning Shein](https://medium.com/@gabayabare/redesigning-sheins-mobile-app-fc5daaff6a6d) / [Behance: UX Audit](https://www.behance.net/gallery/232627819/Shein-App-UX-Audit-and-Redesign) / [Medium: Case Study](https://medium.com/design-bootcamp/ux-ui-case-study-shein-redesign-134e37cd3935) / [Figma 模板](https://www.figma.com/community/file/1156957050456307820/shein) / [Neylan Parker Redesign](https://www.neylanparker.design/work/sheinredesign) |

**SHEIN Redesign 关键教训:**

- 原版问题: 过度刺激、促销标签太多、缺乏视觉呼吸空间
- 改进方案: 减少同时展示的信息量、放大商品图、清晰的价格层级

---

### 1.7 Stitch Fix

| 维度           | 详情                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **风格关键词** | 数据驱动、个人化、问卷引导、温和高端                                                                                                                                                                                                                                                                                                                                       |
| **配色方案**   | 深蓝绿(#1B4D3E)主色 + 白色背景 + 暖灰辅助色; 金色用于高端感                                                                                                                                                                                                                                                                                                                |
| **字体**       | 品牌 serif(类似 GT Sectra)用于标题 + 无衬线系统字体用于正文                                                                                                                                                                                                                                                                                                                |
| **核心动效**   | 风格问卷滑动切换、Fix 盒子"打开"动画、推荐卡片堆叠/展开、AI 风格画像构建                                                                                                                                                                                                                                                                                                   |
| **可借鉴页面** | 风格 Quiz 问卷页(滑动式)、Fix 预览页(盒子打开动画)、个人风格档案页、AI 推荐详情                                                                                                                                                                                                                                                                                            |
| **关键链接**   | [Medium: Product Review](https://medium.com/design-bootcamp/stitch-fix-product-review-75daf798d380) / [Figma Blog: Design Sprints](https://www.figma.com/blog/stitch-fix-accelerates-design-sprints-by-collaborating-in-figma/) / [Forbes: AI Styling](https://www.forbes.com/sites/bernardmarr/2024/03/08/how-stitch-fix-is-using-generative-ai-to-help-us-dress-better/) |

**Stitch Fix 设计亮点:**

- 风格问卷设计: 视觉化选择(图片卡片)而非文字选项
- "Fix"概念: 神秘盒子体验，增加期待感和游戏化
- AI+人结合: UI 上同时展示 AI 推荐和造型师备注

---

### 1.8 ASAP54

| 维度           | 详情                                                             |
| -------------- | ---------------------------------------------------------------- |
| **风格关键词** | 视觉发现、相机优先、社交购物、Pinterest 式布局                   |
| **配色方案**   | 高质量大图为主; UI 覆盖层半透明深色; 品牌色点缀                  |
| **字体**       | 无衬线; 最小化文字叠加                                           |
| **核心动效**   | 拍照识别流程动画、图片搜索结果加载、造型师聊天界面               |
| **可借鉴页面** | 相机搜索页(拍一张找同款)、视觉发现流、造型师聊天界面、心愿单收藏 |
| **关键特点**   | 图像识别搜索、社交穿搭分享、真人造型师聊天                       |

---

### 1.9 AiNeed 设计方向综合建议

基于以上研究，AiNeed 应融合以下设计方向:

| 设计维度     | 推荐方向                        | 参考来源                          |
| ------------ | ------------------------------- | --------------------------------- |
| **整体风格** | 极简编辑风 + AI 科技感融合      | Dribbble 趋势 + Acloset           |
| **衣橱管理** | 网格+列表双模式，拍照 AI 去背景 | Whering + Acloset                 |
| **穿搭推荐** | 卡片式推荐流 + 天气/场合联动    | AI Fashion Stylist + Pureple      |
| **虚拟试穿** | AR 相机全屏 + 浮动操作栏        | Stitch Fix Vision + 通用 VTO 模式 |
| **社区发现** | 双列瀑布流 + 穿搭卡片           | 小红书 + Combyne                  |
| **商品详情** | 大图沉浸式 + 3D/AR 展示         | 得物 + SHEIN Redesign             |
| **色彩系统** | 中性底色 + 单一品牌色点缀       | Whering + 小红书                  |
| **动效系统** | 克制但有意义的微交互            | Stitch Fix + 小红书               |

---

## 二、图标系统评估

### 2.1 通用图标库对比

| 图标库               | 风格                                                     | 图标数量               | RN 支持                                              | 适合时尚 App                                    | 推荐度 | 关键链接                                                 |
| -------------------- | -------------------------------------------------------- | ---------------------- | ---------------------------------------------------- | ----------------------------------------------- | ------ | -------------------------------------------------------- |
| **Phosphor Icons**   | 6 种粗细(thin/light/regular/bold/fill/duotone), 现代几何 | 6,000+(含所有粗细变体) | `react-native-phosphor-icons`                        | 极佳 - 多粗细可创建视觉层级，duotone 适合时尚感 | ★★★★★  | [phosphoricons.com](https://phosphoricons.com/)          |
| **Lucide Icons**     | 单一线条风格, 简洁一致, Feather Icons 演进版             | 1,500+                 | `lucide-react-native`                                | 优秀 - 干净极简风格适合时尚 App                 | ★★★★☆  | [lucide.dev](https://lucide.dev/)                        |
| **Feather Icons**    | 极简线条, 287 个基础图标                                 | 287                    | `react-native-vector-icons` (Feather)                | 良好 - 数量有限但质量高                         | ★★★☆☆  | [feathericons.com](https://feathericons.com/)            |
| **Material Symbols** | Google 官方, Rounded/Sharp/Outlined 变体                 | 2,500+                 | `react-native-vector-icons` (MaterialCommunityIcons) | 良好 - 风格偏通用，时尚感较弱                   | ★★★☆☆  | [fonts.google.com/icons](https://fonts.google.com/icons) |
| **Tabler Icons**     | 线条风格, 2px 默认粗细                                   | 5,200+                 | `tabler-icons-react-native`                          | 优秀 - 粗线条有设计感                           | ★★★★☆  | [tabler-icons.io](https://tabler-icons.io/)              |
| **Hugeicons**        | 现代线条, 时尚分类丰富                                   | 36,000+                | `hugeicons-react-native`                             | 优秀 - 有专门的时尚/服装分类                    | ★★★★☆  | [hugeicons.com](https://hugeicons.com/)                  |
| **Iconoir**          | 开源线条图标, 简洁现代                                   | 1,500+                 | `iconoir-react-native`                               | 良好 - 风格统一                                 | ★★★☆☆  | [iconoir.com](https://iconoir.com/)                      |

### 2.2 时尚专用图标资源

| 资源                             | 类型               | 风格             | 数量     | 格式                      | 许可            | 链接                                                                                                |
| -------------------------------- | ------------------ | ---------------- | -------- | ------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| **Iconbunny Fashion Line Icons** | 时尚专用图标包     | 轮廓线条         | 166      | SVG/PNG                   | 商用付费        | [Pinterest 链接](https://www.pinterest.com/pin/112730796957451981/)                                 |
| **Flaticon Clothes Icons**       | 综合图标库时尚分类 | 多种风格         | 240,736+ | SVG/PSD/PNG/EPS/Icon Font | 免费需署名/付费 | [Flaticon](https://www.flaticon.com/free-icons/clothes)                                             |
| **Icons8 Clothes Set**           | 可定制图标         | 线条/填充/圆滑   | 数百     | SVG/PNG                   | 免费需署名      | [Icons8](https://icons8.com/icons/set/clothes)                                                      |
| **Figma Clothes Icon Pack**      | Figma 社区模板     | 线条             | 1,024    | Figma/SVG                 | 免费            | [Figma](https://www.figma.com/community/file/1269887446772963016/clothes-icon-pack-1024-free-icons) |
| **Nate Wren "Lines"**            | iOS 风格极简图标   | 纯线条           | 数百     | PNG/SVG                   | 付费            | [natewren.com](https://natewren.com/product/lines-ios-14-minimalist-icons/)                         |
| **Vecteezy Fashion Icons**       | 矢量图标库         | 多风格           | 164,602+ | AI/EPS/SVG                | 免费需署名      | [Vecteezy](https://www.vecteezy.com/free-vector/fashion-icon-set)                                   |
| **IconScout Garment Icons**      | 时尚 App 图标      | 线条/填充/多风格 | 数百     | SVG/PNG                   | 免费需署名/付费 | [IconScout](https://iconscout.com/icons/garment-app?price=free)                                     |

### 2.3 RN 自定义图标字体方案

| 方案                                       | 描述                                  | 实现方式                                                                                        | 适用场景                 |
| ------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| **react-native-vector-icons + 自定义字体** | 使用`createIconSet`创建自定义图标组件 | 1. IcoMoon/Fontello 生成字体文件 2. 放入`assets/fonts/` 3. `react-native.config.js`配置 4. 链接 | 需要大量自定义时尚图标   |
| **SVG 直接导入**                           | 使用`react-native-svg`直接渲染 SVG    | `import SvgUri from 'react-native-svg'`                                                         | 少量自定义图标，按需加载 |
| **Phosphor/Lucide RN 包**                  | 直接安装官方 RN 包                    | `npm install react-native-phosphor-icons`                                                       | 大部分场景的首选方案     |
| **Fontello 打包**                          | 多来源图标合并为一个字体              | fontello.com 在线工具 → 下载字体                                                                | 需要混合多个图标来源     |

### 2.4 推荐图标方案 (AiNeed)

**首选方案: Phosphor Icons**

- 理由: 6 种粗细变体可为时尚 App 创建视觉层级(如: thin 用于辅助图标, bold 用于操作按钮, duotone 用于分类标签)
- 补充: 时尚专用图标(服装/配饰类)从 Iconbunny 或 Flaticon 获取 SVG，通过 Fontello 打包为自定义字体

**备选方案: Lucide Icons + 自定义 SVG**

- 理由: Lucide 提供一致的极简基础图标，自定义 SVG 补充时尚专属图标
- 适合: 追求极致包体积优化的场景

---

## 三、字体方案

### 3.1 中文字体

| 字体                                 | 类型            | 适用场景                         | 加载方式                                           | 推荐度      | 关键信息                                                                                                                                                                                                                                                                 |
| ------------------------------------ | --------------- | -------------------------------- | -------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PingFang SC (苹方)**               | 无衬线/系统字体 | iOS 系统默认中文; 正文/标题/按钮 | 系统内置，无需加载                                 | ★★★★★ (iOS) | Apple 平台默认; 无 bold 变体(需用 Medium/SemiBold 替代); 无额外体积                                                                                                                                                                                                      |
| **Noto Sans SC (思源黑体)**          | 无衬线/开源     | 跨平台中文正文; Android 默认方案 | Google Fonts CDN 或本地打包(需 subset)             | ★★★★☆       | Google+Adobe 开源; 全字符集约 20MB 需裁剪; [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+SC)                                                                                                                                                           |
| **Alibaba PuHuiTi (阿里巴巴普惠体)** | 无衬线/免费商用 | 品牌标题/强调文字; 跨平台一致性  | npm 包(`@fontpkg/alibaba-pu-hui-ti-2-0`)或本地打包 | ★★★★☆       | 免费商用; 多字重(Light/Regular/Medium/Bold/Heavy); 数字屏幕优化; [iconfont](https://www.iconfont.cn/fonts/detail?cnid=adI1E7HF7yme) / [npm](https://www.npmjs.com/package/@fontpkg/alibaba-pu-hui-ti-2-0) / [Adobe Fonts](https://fonts.adobe.com/fonts/alibaba-puhuiti) |
| **HarmonyOS Sans SC**                | 无衬线/免费     | 华为生态; 小字号可读性极佳       | 本地打包                                           | ★★★★☆       | 华为免费商用; 小字号优化突出                                                                                                                                                                                                                                             |
| **Noto Serif SC (思源宋体)**         | 衬线/开源       | 长文阅读; 编辑风标题; 高端感场景 | Google Fonts CDN 或本地打包                        | ★★★☆☆       | 优雅衬线体; 适合时尚编辑内容                                                                                                                                                                                                                                             |
| **Source Han Serif SC**              | 衬线/开源       | 同 Noto Serif SC (Adobe 版本)    | Adobe Fonts                                        | ★★★☆☆       | 与 Noto Serif SC 共享设计，Adobe 版本                                                                                                                                                                                                                                    |

### 3.2 英文字体

| 字体                       | 类型        | 适用场景                   | 加载方式            | 推荐度      | 备注                                                     |
| -------------------------- | ----------- | -------------------------- | ------------------- | ----------- | -------------------------------------------------------- |
| **Inter**                  | 无衬线/开源 | UI 正文/按钮/导航/数据展示 | Google Fonts / 内置 | ★★★★★       | 时尚 App 最流行的 UI 字体; 极佳可读性; 支持 tabular 数字 |
| **SF Pro (San Francisco)** | 无衬线/系统 | iOS 系统默认; 所有 UI 元素 | iOS 系统内置        | ★★★★★ (iOS) | Apple 系统字体; 无需加载; 与 PingFang SC 完美配合        |
| **Playfair Display**       | 衬线/开源   | 时尚编辑风标题/品牌展示    | Google Fonts        | ★★★★☆       | 经典时尚感; Vogue/Zimms 风格; 适合大标题                 |
| **Cormorant**              | 衬线/开源   | 高端感标题/品牌标语        | Google Fonts        | ★★★★☆       | 优雅流畅; 比 Playfair 更轻盈; 时尚品牌常用               |
| **Montserrat**             | 无衬线/开源 | 现代标题/按钮文字/品牌     | Google Fonts        | ★★★★☆       | 几何感; 现代时尚; 全大写效果好                           |
| **DM Sans**                | 无衬线/开源 | UI 正文/辅助文字           | Google Fonts        | ★★★★☆       | 清晰现代; 良好的小字号可读性                             |
| **Outfit**                 | 无衬线/开源 | 现代 UI/数字展示           | Google Fonts        | ★★★★☆       | 圆润几何; 友好感; 适合数据展示                           |

### 3.3 React Native 字体配置指南

#### 步骤一: 字体文件放置

```
project-root/
  assets/
    fonts/
      Inter-Regular.ttf
      Inter-Medium.ttf
      Inter-SemiBold.ttf
      Inter-Bold.ttf
      AlibabaPuHuiTi-2-Regular.ttf
      AlibabaPuHuiTi-2-Medium.ttf
      AlibabaPuHuiTi-2-Bold.ttf
```

#### 步骤二: 配置 react-native.config.js

```js
// react-native.config.js
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ["./assets/fonts/"],
};
```

#### 步骤三: 链接字体

```bash
npx react-native link
```

#### 步骤四: iOS 额外配置 (Info.plist)

```xml
<key>UIAppFonts</key>
<array>
  <string>Inter-Regular.ttf</string>
  <string>Inter-Medium.ttf</string>
  <string>Inter-SemiBold.ttf</string>
  <string>Inter-Bold.ttf</string>
  <string>AlibabaPuHuiTi-2-Regular.ttf</string>
  <string>AlibabaPuHuiTi-2-Medium.ttf</string>
  <string>AlibabaPuHuiTi-2-Bold.ttf</string>
</array>
```

#### 步骤五: Android 自动处理

- 字体自动链接到 `android/app/src/main/assets/fonts/`

#### 步骤六: 使用字体

```js
const styles = StyleSheet.create({
  headingEn: {
    fontFamily: "Inter-SemiBold",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  headingCn: {
    fontFamily: "AlibabaPuHuiTi-2-Medium",
    fontSize: 24,
  },
  bodyEn: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  bodyCn: {
    fontFamily: "AlibabaPuHuiTi-2-Regular",
    fontSize: 16,
    lineHeight: 26,
  },
});
```

**关键参考链接:**

- [Custom Fonts in React Native - Full Guide (Medium)](https://medium.com/@noamkurtzer/custom-fonts-in-react-native-app-step-by-step-guide-7d07310f75e8)
- [Integrating Custom Fonts for iOS/Android (OpenReplay)](https://blog.openreplay.com/integrating-custom-fonts-react-native-ios-android/)
- [react-native-alibaba-fonts (GitHub)](https://github.com/zaixiaoqu/react-native-alibaba-fonts)
- [Custom Fonts in RN CLI - New Architecture (Medium)](https://medium.com/@mukeshbuwade3/custom-fonts-in-react-native-cli-step-by-step-new-architecture-d2babbcba775)

### 3.4 中文字体裁剪 (包体积优化)

中文字体全量文件约 5-20MB，必须裁剪以控制 App 体积:

| 工具                       | 描述                                         | 链接                                                                         |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| **fonttools (pyftsubset)** | Python 命令行工具，按字符集/Unicode 范围裁剪 | [github.com/fonttools/fonttools](https://github.com/fonttools/fonttools)     |
| **font-spider (字蛛)**     | 中文 WebFont 裁剪工具，按 HTML 内容提取      | [github.com/aui/font-spider](https://github.com/aui/font-spider)             |
| **cn-font-split**          | 将中文字体按 Unicode 区间分割为多个小文件    | [github.com/nicfont/cn-font-split](https://github.com/nicfont/cn-font-split) |

**裁剪策略:**

1. GB2312 范围(6,763 字) → 约 2-3MB，覆盖 99%常用汉字
2. 常用 3,500 字(一级常用汉字表) → 约 1-1.5MB
3. 按页面按需加载: 首屏加载核心字，详情页加载扩展字

### 3.5 推荐字体方案 (AiNeed)

| 用途                 | 中文字体                                           | 英文字体               | 字重    | 字号    |
| -------------------- | -------------------------------------------------- | ---------------------- | ------- | ------- |
| **大标题/H1**        | Alibaba PuHuiTi Bold                               | Playfair Display Bold  | 700     | 28-32sp |
| **标题/H2**          | Alibaba PuHuiTi SemiBold                           | Inter SemiBold         | 600     | 22-26sp |
| **小标题/H3**        | Alibaba PuHuiTi Medium                             | Inter Medium           | 500     | 18-20sp |
| **正文/Body**        | PingFang SC Regular (iOS) / Noto Sans SC (Android) | Inter Regular          | 400     | 15-16sp |
| **辅助文字/Caption** | 系统字体                                           | Inter Regular          | 400     | 12-13sp |
| **按钮/CTA**         | Alibaba PuHuiTi Medium                             | Inter SemiBold         | 500/600 | 15-17sp |
| **数据/价格**        | -                                                  | Inter Medium (tabular) | 500     | 14-20sp |
| **品牌标语**         | -                                                  | Cormorant Italic       | 400i    | 16-24sp |

**字体加载优先级:**

1. 系统字体(iOS: PingFang SC, SF Pro / Android: Noto Sans SC, Roboto) - 零体积开销
2. 品牌字体(Alibaba PuHuiTi) - 裁剪后打包，仅用于标题和强调
3. 展示字体(Playfair Display / Cormorant) - 英文仅含拉丁字符，体积小(<200KB)

---

## 四、补充资源汇总

### 设计灵感平台

| 平台           | 用途                           | 链接                                    |
| -------------- | ------------------------------ | --------------------------------------- |
| **Dribbble**   | UI 设计灵感、概念设计          | [dribbble.com](https://dribbble.com/)   |
| **Behance**    | 完整案例研究、项目展示         | [behance.net](https://www.behance.net/) |
| **Mobbin**     | 真实 App UI 截图库(按模式分类) | [mobbin.com](https://mobbin.com/)       |
| **Collect UI** | 按组件类型分类的 UI 设计       | [collectui.com](https://collectui.com/) |
| **Page Flows** | App 用户流程分析               | [pageflows.com](https://pageflows.com/) |
| **Uiland**     | App 截图搜索(86+ SHEIN 截图)   | [uiland.design](https://uiland.design/) |

### Figma 模板

| 资源                         | 描述                           | 链接                                                                                                               |
| ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **SHEIN App Figma**          | SHEIN App 完整复刻模板         | [Figma Community](https://www.figma.com/community/file/1156957050456307820/shein)                                  |
| **Digital Wardrobe App UI**  | 数字衣橱 App UI 模板(770+用户) | [Figma Community](https://www.figma.com/community/file/1352238241390370173/digital-wardrobe-app-ui)                |
| **Clothes Icon Pack (1024)** | 1024 个免费服装图标            | [Figma Community](https://www.figma.com/community/file/1269887446772963016/clothes-icon-pack-1024-free-icons)      |
| **Clothing Icons SVG**       | SVG 服装图标库                 | [Figma Community](https://www.figma.com/community/file/1484113168022871947/clothing-icons-free-download-svg-icons) |

### 设计系统参考

| 资源                        | 描述                                  | 链接                                                                                                      |
| --------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **得物 App 设计系统**       | 完整设计系统展示(理念/规范/组件/交互) | [Oskar](http://duchuanhu.com/work/archives/work13_dewuApp.html)                                           |
| **Stitch Fix Figma 工作流** | 设计团队冲刺流程                      | [Figma Blog](https://www.figma.com/blog/stitch-fix-accelerates-design-sprints-by-collaborating-in-figma/) |
| **Android 设计指南**        | Material Design 3 官方指南            | [Android Developers](https://developer.android.com/design/ui)                                             |

### 开发资源

| 资源                                | 描述                            | 链接                                                                       |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------- |
| **Google Codelab: AI 穿搭推荐 App** | 手把手构建 AI 穿搭推荐 App 教程 | [Google Codelab](https://codelabs.developers.google.com/smart-stylist-app) |
| **react-native-vector-icons**       | RN 图标库(支持多种图标字体)     | [GitHub](https://github.com/oblador/react-native-vector-icons)             |
| **react-native-phosphor-icons**     | Phosphor Icons RN 官方包        | [GitHub](https://github.com/duongdev/react-native-phosphor-icons)          |
| **lucide-react-native**             | Lucide Icons RN 官方包          | [npm](https://www.npmjs.com/package/lucide-react-native)                   |
| **react-native-alibaba-fonts**      | 阿里巴巴字体 RN 集成            | [GitHub](https://github.com/zaixiaoqu/react-native-alibaba-fonts)          |
| **@fontpkg/alibaba-pu-hui-ti-2-0**  | 阿里巴巴普惠体 2.0 npm 包       | [npm](https://www.npmjs.com/package/@fontpkg/alibaba-pu-hui-ti-2-0)        |

---

## 五、设计 Token 建议 (AiNeed)

基于以上研究，为 AiNeed 推荐以下基础设计 Token:

### 色彩系统

```css
/* 品牌色 - 温暖现代 */
--color-primary-50: #fff5f0; /* 最浅背景 */
--color-primary-100: #ffe8dc; /* 浅背景 */
--color-primary-200: #ffcdb2; /* 浅元素 */
--color-primary-300: #ffb088; /* 次要强调 */
--color-primary-400: #ff8c55; /* 辅助强调 */
--color-primary-500: #ff6b2c; /* 主品牌色 */
--color-primary-600: #e8551a; /* 深品牌色 */
--color-primary-700: #c24010; /* 更深 */

/* 中性色 - 暖灰调 */
--color-neutral-50: #fafaf8;
--color-neutral-100: #f5f5f3;
--color-neutral-200: #e8e8e5;
--color-neutral-300: #d4d4cf;
--color-neutral-400: #a3a39e;
--color-neutral-500: #737370;
--color-neutral-600: #525250;
--color-neutral-700: #3f3f3d;
--color-neutral-800: #2a2a28;
--color-neutral-900: #1a1a19;

/* 语义色 */
--color-success: #34d399;
--color-warning: #fbbf24;
--color-error: #f87171;
--color-info: #60a5fa;
```

### 排版系统

```css
/* 字体家族 */
--font-cn: "Alibaba PuHuiTi 2.0", "PingFang SC", "Noto Sans SC", sans-serif;
--font-en: "Inter", "SF Pro Display", -apple-system, sans-serif;
--font-display: "Playfair Display", "Cormorant", Georgia, serif;

/* 字号阶 (mobile-first) */
--text-xs: 11px; /* 辅助标签 */
--text-sm: 13px; /* 辅助文字 */
--text-base: 15px; /* 正文 */
--text-lg: 17px; /* 小标题 */
--text-xl: 20px; /* 标题 */
--text-2xl: 24px; /* 大标题 */
--text-3xl: 30px; /* 超大标题 */
--text-4xl: 36px; /* 英雄标题 */

/* 行高 */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* 字间距 */
--tracking-tight: -0.5px;
--tracking-normal: 0px;
--tracking-wide: 0.5px;
```

### 间距系统

```css
--space-0: 0px;
--space-1: 4px; /* 微间距 */
--space-2: 8px; /* 小间距 */
--space-3: 12px; /* 标准间距 */
--space-4: 16px; /* 基础间距 */
--space-5: 20px; /* 中等间距 */
--space-6: 24px; /* 大间距 */
--space-8: 32px; /* 区块间距 */
--space-10: 40px; /* 大区块间距 */
--space-12: 48px; /* 超大间距 */
--space-16: 64px; /* 页面级间距 */
```

---

_文档生成时间: 2026-04-23_
_研究覆盖: 18 项搜索查询，30+参考 App/资源_
