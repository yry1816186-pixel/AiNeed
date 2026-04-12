# Phase 0 Scripts

AiNeed V3 Phase 0 数据管线脚本，负责从原始数据采集到向量嵌入生成的完整流程。

## 脚本列表

### p0_download_datasets.sh

公开数据集下载脚本。

**用途**: 下载 Polyvore Outfits、DeepFashion2、Amazon Review Fashion、iMaterialist 四个公开数据集到 `data/raw/` 目录。

**前置条件**:
- Bash 环境 (Linux / macOS / WSL)
- `wget` 和 `curl`
- `huggingface-cli` (可选，用于 Polyvore): `pip install huggingface_hub`
- `kaggle` CLI (可选，用于 iMaterialist): `pip install kaggle`
- 磁盘空间 >= 100GB

**用法**:
```bash
bash scripts/p0_download_datasets.sh
```

**特性**:
- 断点续传: 已下载的数据集通过 `.download_complete` 标记文件跳过
- `wget -c` 支持网络中断后继续下载
- HuggingFace CLI 内置断点续传
- 缺少可选工具时自动跳过对应数据集并提示手动操作
- 下载完成后输出汇总报告

---

### p0_process_rules.py

搭配规则提取脚本。

**用途**: 从 Polyvore 搭配数据和 Amazon Fashion 评价数据中提取结构化搭配规则，输出到 `data/processed/fashion_rules.json`。

**前置条件**:
- Python 3.10+
- 无额外依赖 (仅使用标准库)

**用法**:
```bash
python scripts/p0_process_rules.py
python scripts/p0_process_rules.py --limit 5000
python scripts/p0_process_rules.py --no-merge-existing
python scripts/p0_process_rules.py --output data/processed/my_rules.json
```

**参数**:
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--limit` | 0 (全部) | 每个数据集处理的原始记录数上限 |
| `--merge-existing` | True | 是否与 `data/knowledge-graph/fashion-rules.json` 合并 |
| `--no-merge-existing` | - | 不与已有规则合并 |
| `--output` | `data/processed/fashion_rules.json` | 输出文件路径 |

**输出格式**:
```json
[
  {
    "id": "p0r_00001",
    "category": "color_harmony",
    "condition": {"colorA": "黑色", "colorB": "白色"},
    "recommendation": "黑白搭配是永恒经典...",
    "confidence": 0.95,
    "source": "Polyvore搭配统计"
  }
]
```

**规则分类**: `color_harmony` / `body_type` / `occasion` / `style_mix` / `seasonal`

---

### p0_validate_data.py

数据验证脚本。

**用途**: 验证项目中所有 JSON 数据文件的格式正确性、字段完整性和类型一致性，生成统计报告。

**前置条件**:
- Python 3.10+
- 无额外依赖

**用法**:
```bash
python scripts/p0_validate_data.py
python scripts/p0_validate_data.py --scope kg
python scripts/p0_validate_data.py --scope processed --no-save
```

**参数**:
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--scope` | `all` | 验证范围: `all` / `kg` / `processed` / `raw` |
| `--no-save` | False | 不保存验证报告到文件 |

**验证内容**:
- JSON 格式正确性
- 必填字段完整性 (`id`, `category`, `condition`, `recommendation`, `confidence`, `source`)
- 字段类型校验 (confidence 为 [0,1] 浮点数, condition 为对象等)
- 分类合法性 (必须在 5 个有效分类内)
- ID 唯一性检查
- 置信度分布统计

**输出**:
- 控制台: 彩色验证报告
- `data/processed/validation_report.json`: 机器可读的完整报告

---

### p0_generate_embeddings.py

文本向量嵌入生成脚本。

**用途**: 使用 BGE-M3 模型批量生成时尚规则和商品描述的文本向量，输出 Qdrant 兼容格式。

**前置条件**:
- Python 3.10+
- `sentence-transformers`: `pip install sentence-transformers`
- `torch` (GPU 版需 CUDA): `pip install torch` 或 `pip install torch --index-url https://download.pytorch.org/whl/cu121`
- `tqdm` (可选，进度条): `pip install tqdm`
- GPU 推荐: RTX 4060+ (8GB VRAM)，CPU 也可运行但较慢

**用法**:
```bash
python scripts/p0_generate_embeddings.py
python scripts/p0_generate_embeddings.py --device cpu --batch-size 32
python scripts/p0_generate_embeddings.py --source rules --verify
python scripts/p0_generate_embeddings.py --model BAAI/bge-m3 --dimension 1024
```

**参数**:
| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--model` | `BAAI/bge-m3` | 模型名称或本地路径 |
| `--batch-size` | 64 | 批处理大小 |
| `--dimension` | 1024 | 期望的向量维度 |
| `--device` | `auto` | 设备: `auto` / `cuda` / `cpu` |
| `--input` | 自动检测 | 输入 JSON 文件路径 |
| `--output` | `data/processed/text_embeddings.jsonl` | 输出文件路径 |
| `--source` | `all` | 数据源: `rules` / `items` / `all` |
| `--no-resume` | False | 不续传，从头开始 |
| `--verify` | False | 生成后验证输出 |

**输出格式** (JSONL，每行一条):
```json
{
  "id": "fr_001",
  "vector": [0.012, -0.034, ...],
  "payload": {
    "source": "fashion-rules.json",
    "category": "color_harmony",
    "type": "rule"
  }
}
```

**特性**:
- 自动检测 CUDA，有 GPU 时自动加速
- 断点续传: 已处理的 ID 自动跳过
- 进度条显示
- 归一化向量 (余弦相似度直接可用)
- 生成后可选验证维度正确性

---

## 执行顺序

```
1. p0_download_datasets.sh    → 下载原始数据集
2. p0_process_rules.py        → 提取搭配规则
3. p0_validate_data.py        → 验证数据质量
4. p0_generate_embeddings.py  → 生成向量嵌入
```

## 目录结构

```
data/
├── raw/                        # 原始数据 (下载脚本写入)
│   ├── polyvore/
│   ├── deepfashion2/
│   ├── amazon/
│   └── imaterialist/
├── processed/                  # 处理后数据 (规则提取/验证/嵌入写入)
│   ├── fashion_rules.json
│   ├── text_embeddings.jsonl
│   └── validation_report.json
└── knowledge-graph/            # 知识图谱种子数据 (已有)
    ├── fashion-rules.json
    ├── color-theory.json
    ├── body-type-guide.json
    ├── occasion-guide.json
    └── style-taxonomy.json
```
