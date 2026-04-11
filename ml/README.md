# AI霓 - 智能服装推荐系统

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端应用 (Next.js)                         │
│                    http://localhost:3000                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端服务 (NestJS)                            │
│                    http://localhost:3001                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 用户模块     │  │ 商品模块     │  │ 推荐模块     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AI集成模块   │  │ 试衣模块     │  │ 搜索模块     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI服务 (FastAPI)                            │
│                    http://localhost:8001                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ CLIP模型     │  │ YOLOv11      │  │ MediaPipe    │          │
│  │ 图像嵌入     │  │ 服装检测     │  │ 姿态估计     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        数据层                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ PostgreSQL   │  │ Redis        │  │ 向量存储     │          │
│  │ 主数据库     │  │ 缓存         │  │ 嵌入向量     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 环境要求

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (可选)

### 2. 安装依赖

```bash
# Python依赖
pip install torch torchvision transformers ultralytics mediapipe scikit-learn fastapi uvicorn

# Node.js依赖
cd apps/backend
npm install
```

### 3. 启动服务

```bash
# 方式一：使用启动脚本
start-services.bat

# 方式二：手动启动
# 终端1 - AI服务
python ml/services/ai_service.py

# 终端2 - 后端服务
cd apps/backend
npm run start:dev
```

### 4. 访问服务

- AI服务: http://localhost:8001
- 后端API: http://localhost:3001
- 前端Web: http://localhost:3000
- API文档: http://localhost:3001/api/docs

## API接口

### AI服务接口 (端口8001)

| 接口 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/analyze` | POST | 分析服装图像 |
| `/api/body-analysis` | POST | 分析用户体型 |
| `/api/similar` | POST | 查找相似服装 |
| `/api/outfit` | POST | 推荐搭配组合 |
| `/api/colors` | POST | 色彩推荐 |

### 后端接口 (端口3001)

| 接口 | 方法 | 描述 |
|------|------|------|
| `/ai/health` | GET | AI服务状态 |
| `/ai/analyze` | POST | 分析图像 |
| `/ai/similar/:itemId` | GET | 相似商品 |
| `/ai/outfit` | POST | 搭配推荐 |
| `/ai/colors/:season` | GET | 色彩推荐 |

## 核心功能

### 1. 服装图像分析

```typescript
// 请求
POST /ai/analyze
Content-Type: multipart/form-data

// 响应
{
  "success": true,
  "data": {
    "category": "tops",
    "style": ["casual", "minimalist"],
    "colors": ["white", "blue"],
    "occasions": ["daily", "work"],
    "seasons": ["spring", "summer"],
    "confidence": 0.85
  }
}
```

### 2. 体型分析

```typescript
// 请求
POST /ai/body-analysis
Content-Type: multipart/form-data

// 响应
{
  "success": true,
  "data": {
    "bodyType": "hourglass",
    "skinTone": "medium",
    "colorSeason": "summer",
    "recommendations": {
      "suitable": ["fitted", "wrap", "belted"],
      "avoid": ["boxy", "oversized"],
      "tips": ["突出腰线的款式最适合您"]
    }
  }
}
```

### 3. 搭配推荐

```typescript
// 请求
POST /ai/outfit
{
  "baseItemId": "item_001",
  "userBodyType": "hourglass",
  "occasion": "work",
  "topK": 5
}

// 响应
{
  "success": true,
  "data": {
    "bottoms": [
      {
        "itemId": "item_002",
        "score": 0.92,
        "reasons": ["风格匹配: casual", "适合场合: work"]
      }
    ],
    "footwear": [...],
    "accessories": [...]
  }
}
```

## 模型说明

### CLIP (图像-文本联合嵌入)

- 用途: 服装风格分类、图像嵌入提取
- 模型: openai/clip-vit-base-patch32
- 输出: 512维向量

### YOLOv11 (目标检测)

- 用途: 服装区域检测
- 模型: yolo11n.pt
- 类别: 服装相关类别

### MediaPipe (姿态估计)

- 用途: 用户体型分析
- 功能: 关键点检测、体型推断

## 数据处理

### 批量处理图像

```bash
# 处理指定目录图像
python ml/scripts/batch_process.py --image-dir data/raw/images --limit 1000

# 搜索相似图像
python ml/scripts/batch_process.py --search data/raw/images/test.jpg --top-k 10
```

### 数据格式

```json
{
  "item_id": "item_001",
  "category": "tops",
  "style": ["casual", "minimalist"],
  "colors": ["white"],
  "occasions": ["daily", "work"],
  "seasons": ["spring", "summer"],
  "confidence": 0.85
}
```

## 配置

### 环境变量

```env
# AI服务
AI_SERVICE_URL=http://localhost:8001

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/aini

# Redis (可选)
REDIS_URL=redis://localhost:6379
```

## 论文参考

本系统整合了以下论文的核心算法：

| 论文 | 核心技术 | 应用 |
|------|---------|------|
| 刘等-2023 | PCMF多模态融合 | 推荐引擎 |
| 侯-2024 | 图神经网络用户建模 | 用户画像 |
| 张等-2024 | 知识图谱推荐 | 关联推理 |
| 李和蒋-2024 | 加权多模态融合 | 特征融合 |
| 雷-2024 | 搭配理论融合 | 规则引擎 |

## 许可证

MIT License
