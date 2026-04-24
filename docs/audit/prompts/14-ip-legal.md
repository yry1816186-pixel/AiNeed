# 轨道 14: 商标查询 + 软著申请 + 域名注册

你是 XUNO 项目的法律合规专员。你要完成 IP 保护的三件紧急事项。

## 任务 1: 商标查询

### 查询地址

中国商标网: https://sbj.cnipa.gov.cn/sbj/sbcx/

### 需要查询的商标

| 商标 | 类别             | 说明             |
| ---- | ---------------- | ---------------- |
| 寻裳 | 第 9 类（软件）  | 核心保护         |
| 寻裳 | 第 42 类（SaaS） | 平台保护         |
| 寻裳 | 第 25 类（服装） | 品牌保护         |
| XUNO | 第 9 类          | 英文名保护       |
| 伊伊 | 第 9 类          | Agent 角色名保护 |

### 查询后行动

- 如果未注册：立即准备申请材料
- 如果已注册：评估是否需要改名或购买

### 申请材料准备

为每个未注册的商标准备：

1. 商标图样（300×300 PNG）
2. 商品/服务项目清单
3. 申请人信息
4. 委托书模板

保存到: `docs/LEGAL/trademark/`

## 任务 2: 软著申请

### 中国版权保护中心

https://www.ccopyright.com.cn/

### 需要准备的材料

1. **软件著作权登记申请表**（在线填写）
2. **软件鉴别材料**:
   - 源代码（前后各连续 30 页，每页 50 行）
   - 软件说明书（用户手册或设计文档）

### 源代码材料准备

从代码库中提取：

- 前部分（开头 30 页）：主要入口文件+核心模块

  - `apps/backend/src/main.ts`
  - `apps/backend/src/app.module.ts`
  - `apps/mobile/src/App.tsx`
  - `ml/services/stylist/intelligent_stylist_service.py`（前 1500 行）

- 后部分（末尾 30 页）：核心业务逻辑
  - `apps/backend/src/domains/platform/recommendations/orchestrator/recommendation.orchestrator.ts`
  - `ml/services/stylist/full_outfit_engine.py`（后 1500 行）

### 软件说明书

编写约 30 页的软件设计说明书，保存到: `docs/LEGAL/software-manual.md`

包含：

1. 软件概述
2. 功能说明（每个模块）
3. 运行环境
4. 安装说明
5. 使用说明
6. 技术特点

## 任务 3: 域名注册

### 需要注册的域名

| 域名          | 用途     | 优先级 |
| ------------- | -------- | ------ |
| xuno.app      | 主域名   | P0     |
| xuno.com.cn   | 中国市场 | P0     |
| xuno.cn       | 备选     | P1     |
| xuno.ai       | AI 属性  | P1     |
| xunoshang.com | 寻裳拼音 | P2     |

### 注册商选择

- 阿里云万网（国内首选）
- Cloudflare（国际）

### 注册操作

检查每个域名的可用性，如可用则记录注册步骤。

## 任务 4: 用户协议+隐私政策模板

文件: `docs/LEGAL/user-agreement.md` 和 `docs/LEGAL/privacy-policy.md`

### 关键条款

1. XUNO 法律定位：信息推荐服务平台，非商品销售方
2. 虚拟试穿免责：AI 生成效果仅供参考
3. 数据收集清单+逐项同意说明
4. 用户权利：查询/更正/删除/导出/撤回同意
5. 未成年人保护
6. 跨境数据传输说明（如果使用 OpenAI）

## 验收标准

1. 商标查询结果记录在案（每个商标的注册状态）
2. 软著申请材料齐全（申请表+源代码+说明书）
3. 域名可用性检查完成
4. 用户协议和隐私政策初稿完成
5. 所有文件保存在 `docs/LEGAL/`
