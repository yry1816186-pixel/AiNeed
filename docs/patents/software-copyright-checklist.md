# 软著申请材料清单

## 一、软著 1：寻裳 AI 穿搭推荐系统 V1.0

### 基本信息

| 项目         | 内容                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| 软件名称     | 寻裳 AI 智能穿搭推荐系统                                                |
| 版本号       | V1.0                                                                    |
| 开发完成日期 | 2026-04-20                                                              |
| 首次发表日期 | （未发表，填"未发表"）                                                  |
| 软件分类     | 应用软件-人工智能应用                                                   |
| 开发方式     | 独立开发                                                                |
| 运行环境     | Linux/Windows Server, Node.js 20+, Python 3.11+, PostgreSQL 16, Redis 7 |
| 编程语言     | TypeScript, Python                                                      |
| 源程序量     | 约 150,000 行                                                           |

### 覆盖范围

- NestJS 后端全部业务模块（35 个模块）
- Python AI 服务层（造型师/试穿/分析）
- 共享 TypeScript 类型包
- 数据库 Schema 与迁移脚本

### 需准备材料

| 序号 | 材料名称             | 要求                              | 状态   |
| ---- | -------------------- | --------------------------------- | ------ |
| 1    | 软件著作权登记申请表 | 在线填写                          | 可提交 |
| 2    | 软件鉴别材料-源代码  | 前 30 页+后 30 页，每页 50 行     | 已提取 |
| 3    | 软件鉴别材料-文档    | 软件说明书（功能说明+操作说明）   | 可提交 |
| 4    | 申请人身份证明       | 个人：身份证复印件                | 待用户 |
| 5    | AI 合规声明          | 2025 年新规：涉 AI 软著需额外提交 | 待准备 |

### 软著 1 材料就绪状态 (Phase 12 终审确认)

**源代码文档 (60 页)**:

- `docs/LEGAL/source-code/front-30-pages.txt` — 1515 行 (30 页 x 50 行/页, 含文件头和行号)
- `docs/LEGAL/source-code/back-30-pages.txt` — 1507 行 (30 页 x 50 行/页, 含文件头和行号)
- 脱敏处理: extract-source-code.ps1 自动替换 API_KEY/SECRET/PASSWORD/TOKEN 为 `***REDACTED***`
- 需手动操作: A4 打印, 等宽字体 Consolas 10pt, 页眉软件名称+版本号, 页脚页码

**用户手册 (2103 行, ~40 页)**:

- `docs/LEGAL/software-manual.md` — 7 章完整说明书 (概述/运行环境/安装/功能/API/数据库/安全)
- SCREENSHOT 标记 6 处: 需从运行 App 截图后插入
- FashionSigLIP 已替换 FashionCLIP, GLM-5 fallback 已记录
- 需手动操作: A4 打印, 插入 App 截图, 添加页眉页脚

**申请表**:

- `docs/software-copyright/application.md` — 基本信息已填写 (开发完成日期 2026-04-25)
- 待用户操作: 填写著作权人姓名/地址/电话, 在线提交 CNIPA 系统
- AI 合规声明: 需单独准备说明 AI 在开发中的角色 (代码生成辅助, 架构和决策由人完成)

### 源代码选取方案

**前 30 页**（约 1500 行，从文件开头选取）：

1. `apps/backend/src/main.ts` — 后端入口
2. `apps/backend/src/app.module.ts` — 根模块
3. `apps/backend/src/modules/ai-stylist/` — AI 造型师模块
4. `apps/backend/src/modules/tryon/` — 虚拟试穿模块
5. `apps/backend/src/modules/recommendations/` — 推荐模块
6. `ml/services/intelligent_stylist_service.py` — GLM 造型师核心
7. `ml/services/visual_outfit_service.py` — 穿搭可视化

**后 30 页**（约 1500 行，从文件末尾选取）：

1. `ml/services/analysis/color_season_analyzer.py` — 色彩分析（末尾部分）
2. `ml/services/analysis/body_analyzer.py` — 体型分析（末尾部分）
3. `apps/backend/src/modules/clothing/` — 服装模块
4. `apps/backend/src/common/` — 公共模块
5. `packages/types/` — 共享类型

### 软件说明书大纲

1. 软件概述（功能简介、技术架构）
2. 运行环境（硬件、软件、网络要求）
3. 安装与部署（Docker 部署、环境配置）
4. 功能说明
   - 用户注册与认证
   - AI 造型师对话
   - 虚拟试穿
   - 色彩季型分析
   - 体型分析与适配
   - 服装推荐
   - 用户画像管理
5. API 接口说明
6. 数据库设计
7. 安全设计

---

## 二、软著 2：寻裳移动端应用 V1.0

### 基本信息

| 项目         | 内容                                          |
| ------------ | --------------------------------------------- |
| 软件名称     | 寻裳移动客户端软件                            |
| 版本号       | V1.0                                          |
| 开发完成日期 | 2026-04-20                                    |
| 首次发表日期 | （未发表，填"未发表"）                        |
| 软件分类     | 应用软件-移动应用                             |
| 开发方式     | 独立开发                                      |
| 运行环境     | Android 8.0+ / iOS 13.0+, React Native 0.76.8 |
| 编程语言     | TypeScript, JavaScript                        |
| 源程序量     | 约 80,000 行                                  |

### 覆盖范围

- React Native 移动端全部页面和组件
- Zustand 状态管理
- TanStack Query 服务端状态
- API 服务层
- 6-tab 导航（首页/探索/收藏/购物车/衣橱/个人）

### 需准备材料

| 序号 | 材料名称             | 要求                          | 状态   |
| ---- | -------------------- | ----------------------------- | ------ |
| 1    | 软件著作权登记申请表 | 在线填写                      | 待准备 |
| 2    | 软件鉴别材料-源代码  | 前 30 页+后 30 页，每页 50 行 | 待提取 |
| 3    | 软件鉴别材料-文档    | 软件说明书                    | 待准备 |
| 4    | 申请人身份证明       | 个人：身份证复印件            | 待用户 |
| 5    | AI 合规声明          | 涉 AI 功能（试穿/分析）       | 待准备 |

### 软著 2 材料就绪状态 (Phase 12 终审确认)

- 源代码选取方案已规划 (5 个前端文件), 需运行 extract-source-code.ps1 提取
- 移动端架构已改为 feature-based (16 features), 6-tab 已改为 4-tab (Today/Discover/Stylist/Me)
- 需更新导航描述: 6-tab → 4-tab
- 软件说明书需重新编写以匹配当前移动端架构

---

## 三、软著 3：寻裳 AI 分析服务 V1.0

### 基本信息

| 项目         | 内容                                           |
| ------------ | ---------------------------------------------- |
| 软件名称     | 寻裳 AI 色彩体型智能分析系统                   |
| 版本号       | V1.0                                           |
| 开发完成日期 | 2026-04-20                                     |
| 首次发表日期 | （未发表，填"未发表"）                         |
| 软件分类     | 应用软件-人工智能应用                          |
| 开发方式     | 独立开发                                       |
| 运行环境     | Linux/Windows, Python 3.11+, MediaPipe, OpenCV |
| 编程语言     | Python                                         |
| 源程序量     | 约 30,000 行                                   |

### 覆盖范围

- 色彩季型分析服务（12 季/8 季体系）
- 体型分析服务（5 种体型分类+适配评分）
- 虚拟试穿预处理与后处理
- CIELAB 色彩科学工具库
- GLM API 集成层
- DialogEngine 对话状态机 (GREET→CONTEXT→SCENE/DIRECT/CHAT→GENERATE→ACTION→WRAP)
- FashionRuleLoader 264+ 条时尚规则
- StudioSignalDetector 5 种工作室信号
- Edge-TTS 语音合成集成

### 需准备材料

| 序号 | 材料名称             | 要求                          | 状态   |
| ---- | -------------------- | ----------------------------- | ------ |
| 1    | 软件著作权登记申请表 | 在线填写                      | 待准备 |
| 2    | 软件鉴别材料-源代码  | 前 30 页+后 30 页，每页 50 行 | 待提取 |
| 3    | 软件鉴别材料-文档    | 软件说明书                    | 待准备 |

### 软著 3 材料就绪状态 (Phase 12 终审确认)

- AI 服务已大幅扩展: DialogEngine + FashionRuleLoader + StudioSignalDetector + Edge-TTS
- 源代码选取方案需更新: 加入 dialog_engine.py + fashion_rule_loader.py + studio_signal_detector.py
- 软件说明书需包含新增模块的功能说明
  | 4 | 申请人身份证明 | 企业：营业执照副本复印件 | 待准备 |
  | 5 | AI 合规声明 | 核心 AI 服务，必须提交 | 待准备 |

### 源代码选取方案

**前 30 页**：

1. `ml/services/analysis/color_utils.py` — CIELAB 色彩科学
2. `ml/services/analysis/color_season_analyzer.py` — 12 季色彩分析（前半部分）
3. `ml/services/analysis/body_analyzer.py` — 体型分析（前半部分）

**后 30 页**：

1. `ml/services/analysis/body_analyzer.py` — 体型分析（后半部分）
2. `ml/services/tryon/tryon_preprocessor.py` — 试穿预处理
3. `ml/services/tryon/tryon_postprocessor.py` — 试穿后处理
4. `ml/services/ai_service.py` — AI 服务入口

---

## 四、通用注意事项

### CNIPA 2026 新规

1. **发明人必须为自然人** — AI 不能列为发明人
2. **涉 AI 软著需额外提交 AI 合规声明** — 说明 AI 在软件开发中的角色
3. **社会伦理合规** — 数据来源必须合法，人脸数据需获得授权
4. **企业申请需统一社会信用代码**

### 源代码格式要求

- 每页不少于 50 行
- 前 30 页从源程序开头连续选取
- 后 30 页从源程序末尾连续选取
- 去除空行后不足 60 页的，提交全部源代码
- 注释使用中文或英文

### 软件说明书格式要求

- A4 纸打印
- 页眉注明软件名称及版本号
- 包含功能说明和操作说明
- 界面截图（如有）
- 不少于 10 页

### 费用估算

| 项目               | 费用(人民币)           |
| ------------------ | ---------------------- |
| 软著登记官费(3 项) | 3×300 = 900            |
| 代理费(3 项)       | 3×500-1000 = 1500-3000 |
| **总计**           | **约 2400-3900**       |

### 办理时间

- 自行办理：2-3 个月
- 代理加急：1 个月（加急费另计）
