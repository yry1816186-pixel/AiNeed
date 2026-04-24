# 软著源代码提取指南

**提取日期：2026 年 4 月 23 日**
**软件名称：寻裳 AI 智能穿搭推荐系统 V1.0**

---

## 一、提取要求

- 前 30 页：从源程序开头连续选取，每页不少于 50 行
- 后 30 页：从源程序末尾连续选取，每页不少于 50 行
- 去除空行后不足 60 页的，提交全部源代码
- 注释使用中文或英文

---

## 二、前 30 页选取方案（约 1500 行）

### 文件顺序

| 序号 | 文件路径                                           | 预计行数  | 说明           |
| ---- | -------------------------------------------------- | --------- | -------------- |
| 1    | apps/backend/src/main.ts                           | ~137      | 后端入口       |
| 2    | apps/backend/src/app.module.ts                     | ~180      | 根模块         |
| 3    | ml/services/stylist/intelligent_stylist_service.py | 前 500 行 | GLM 造型师核心 |
| 4    | ml/services/tryon/visual_outfit_service.py         | 全文      | 穿搭可视化     |
| 5    | ml/services/analysis/color_season_analyzer.py      | 前 300 行 | 色彩分析       |
| 6    | ml/services/analysis/body_analyzer.py              | 前 300 行 | 体型分析       |

### 提取命令

```bash
# 在项目根目录执行
cd c:\AiNeed

# 前30页提取
type apps\backend\src\main.ts apps\backend\src\app.module.ts ml\services\stylist\intelligent_stylist_service.py ml\services\tryon\visual_outfit_service.py ml\services\analysis\color_season_analyzer.py ml\services\analysis\body_analyzer.py > docs\LEGAL\source-code-front.txt
```

---

## 三、后 30 页选取方案（约 1500 行）

### 文件顺序

| 序号 | 文件路径                                         | 预计行数  | 说明         |
| ---- | ------------------------------------------------ | --------- | ------------ |
| 1    | ml/services/stylist/full_outfit_engine.py        | 后 500 行 | 穿搭引擎     |
| 2    | ml/services/analysis/body_analyzer.py            | 后 300 行 | 体型分析尾部 |
| 3    | ml/services/tryon/tryon_postprocessor.py         | 全文      | 试穿后处理   |
| 4    | ml/services/rag/hybrid_retriever.py              | 全文      | 混合检索     |
| 5    | ml/services/common/algorithm_gateway.py          | 全文      | 算法网关     |
| 6    | ml/services/recommender/fashion_knowledge_rag.py | 全文      | 时尚知识 RAG |

### 提取命令

```bash
# 后30页提取（需手动从各文件末尾截取）
# 建议使用编辑器打开各文件，从末尾复制相应行数
```

---

## 四、格式要求

1. 每页 50 行，使用等宽字体（如 Consolas, 10pt）
2. 页眉标注：软件名称 + 版本号
3. 页脚标注：页码（第 X 页 共 60 页）
4. 左侧标注行号
5. A4 纸打印，单面

---

## 五、注意事项

1. 源代码中不得包含商业秘密标记
2. 删除所有 API 密钥、密码等敏感信息
3. 删除环境变量中的真实值（替换为占位符）
4. 保留注释（有助于审查员理解代码逻辑）
5. 如使用自动提取工具，确保行号连续无断行

---

## 六、软著 2（移动端）源代码提取方案

### 前 30 页

| 序号 | 文件路径                                   | 说明           |
| ---- | ------------------------------------------ | -------------- |
| 1    | apps/mobile/App.tsx                        | 应用入口       |
| 2    | apps/mobile/src/screens/HomeScreen.tsx     | 首页           |
| 3    | apps/mobile/src/screens/ExploreScreen.tsx  | 探索页         |
| 4    | apps/mobile/src/screens/WardrobeScreen.tsx | 衣橱页         |
| 5    | apps/mobile/src/stores/                    | Zustand stores |

### 后 30 页

| 序号 | 文件路径                                  | 说明       |
| ---- | ----------------------------------------- | ---------- |
| 1    | apps/mobile/src/services/                 | API 服务层 |
| 2    | apps/mobile/src/screens/ProfileScreen.tsx | 个人页     |
| 3    | apps/mobile/src/components/               | UI 组件    |

---

_本指南供软著申请材料准备参考，实际提取需根据代码量调整。_
