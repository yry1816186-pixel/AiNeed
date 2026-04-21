# 任务: Python ML 服务联调

## 项目路径

C:\AiNeed

## 上下文

项目有 17 个 Python AI 服务，位于 `ml/` 目录。包括:

- color_season_analyzer (12 季色彩分析)
- body_analyzer (体型分析)
- FashionCLIP embedding 服务
- SASRec 推荐模型
- tryon_preprocessor (试穿预处理)
- 其他分析服务

## 步骤

### 1. 安装依赖

```bash
cd /c/AiNeed/ml
pip install -r requirements.txt
```

如果有 CUDA 依赖（RTX 4060）:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt
```

### 2. 检查目录结构

```bash
find /c/AiNeed/ml -name "*.py" -path "*/services/*" | head -30
find /c/AiNeed/ml -name "*.py" -path "*/models/*" | head -20
```

### 3. 逐个检查服务 import

对每个 Python 服务文件，尝试 import:

```bash
cd /c/AiNeed/ml
python -c "from services.analysis.color_season_analyzer import *"
python -c "from services.analysis.body_analyzer import *"
python -c "from services.recommender.sasrec_service import *"
```

记录哪些 import 失败，缺少什么包。

### 4. 修复 import 错误

- 缺少第三方包 → `pip install <package>`
- 路径错误 → 修正 Python import 路径
- 模型文件缺失 → 检查是否需要下载预训练模型

### 5. 关键服务端到端测试

#### 5.1 色彩分析

```python
from services.analysis.color_season_analyzer import ColorSeasonAnalyzer
analyzer = ColorSeasonAnalyzer()
result = analyzer.analyze("path/to/test/photo.jpg")
print(result)  # 应该输出季型 (spring_warm, summer_cool, etc.)
```

#### 5.2 体型分析

```python
from services.analysis.body_analyzer import BodyAnalyzer
analyzer = BodyAnalyzer()
result = analyzer.analyze("path/to/test/photo.jpg")
print(result)  # 应该输出体型 (hourglass, rectangle, etc.)
```

#### 5.3 FashionCLIP embedding

```python
from services.recommender.fashionclip_service import FashionCLIPService
service = FashionCLIPService()
embedding = service.get_embedding("path/to/product/image.jpg")
print(len(embedding))  # 应该输出向量维度
```

### 6. API 服务启动测试

如果有 FastAPI 服务:

```bash
cd /c/AiNeed/ml
uvicorn services.main:app --host 0.0.0.0 --port 8000 --reload
```

检查每个端点是否响应。

### 7. Backend ↔ ML 通信

确认 NestJS backend 能通过 HTTP 调用 ML 服务:

- 检查 backend 中 ML 服务的配置（URL、端口）
- 确认两者在同一网络或端口可达

### 8. 输出

- 哪些服务可以正常 import
- 哪些服务有缺失依赖
- 端到端测试结果
- 需要下载的预训练模型列表
