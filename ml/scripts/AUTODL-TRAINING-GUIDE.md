# ChineseFashionCLIP AutoDL 训练指南

本地 RTX 4060 已验证 pipeline 正确（5 epochs, 2.4 分钟），但 mock 色块数据无法提供语义提升。
本指南说明如何在 AutoDL 云 GPU 上使用 DeepFashion2 真实数据完成训练。

---

## 1. AutoDL 实例选择

| 配置项     | 推荐选择                  | 说明                                  |
| ---------- | ------------------------- | ------------------------------------- |
| GPU        | RTX 4090 (24GB)           | 性价比最高，训练速度约 3-5x 本地 4060 |
| GPU (备选) | A100 (40GB)               | 更大批次，但单价更高                  |
| 镜像       | PyTorch 2.1 + Python 3.11 | 基础镜像即可                          |
| 系统盘     | 50GB                      | 足够装代码+模型                       |
| 数据盘     | 勾选                      | 数据集持久化，避免每次重传            |

**不推荐**：V100 (16GB 显存偏紧，batch_size 需降到 16)

## 2. 环境准备

```bash
# SSH 连接实例后执行

# 2.1 安装依赖（使用清华镜像加速）
pip install -r requirements.txt \
  -i https://pypi.tuna.tsinghua.edu.cn/simple \
  --trusted-host pypi.tuna.tsinghua.edu.cn

# 2.2 验证 GPU
python -c "import torch; print(f'GPU: {torch.cuda.get_device_name(0)}, VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f}GB')"
```

## 3. 代码上传

### 方式 A：Git Clone（推荐）

```bash
cd /root
git clone <你的仓库地址> AiNeed
cd AiNeed
```

### 方式 B：SCP 上传

```bash
# 本地执行
scp -r C:\AiNeed\ml root@<实例IP>:/root/AiNeed/
scp -r C:\AiNeed\data root@<实例IP>:/root/AiNeed/
```

## 4. 数据集上传

### 4.1 下载 DeepFashion2

DeepFashion2 数据集从官方获取：https://github.com/switchablenorms/DeepFashion2

需要下载：

- `train.zip`（训练集图片 + 标注，约 12GB）
- `validation.zip`（验证集图片 + 标注，约 4GB）

### 4.2 上传到 AutoDL

```bash
# 方式 1：AutoDL 文件管理器上传（适合小文件）
# 在 AutoDL 控制台 -> 文件管理 -> 上传

# 方式 2：SCP 直传（推荐，支持断点续传）
scp train.zip root@<实例IP>:/root/AiNeed/data/raw/DeepFashion2/
scp validation.zip root@<实例IP>:/root/AiNeed/data/raw/DeepFashion2/

# 方式 3：AutoDL 学术加速 + wget（如果数据集在网盘）
# 在实例内执行
cd /root/AiNeed/data/raw/DeepFashion2/
# 使用 AutoDL 提供的学术加速代理下载
```

### 4.3 解压数据集

```bash
cd /root/AiNeed/data/raw/DeepFashion2/

# 解压训练集
unzip train.zip -d train/
# 解压后应得到 train/image/ 和 train/annos/

# 解压验证集
unzip validation.zip -d validation/
# 解压后应得到 validation/image/ 和 validation/annos/

# 验证目录结构
ls train/image/ | head -5
ls train/annos/ | head -5
```

预期目录结构：

```
data/raw/DeepFashion2/
├── train/
│   ├── image/
│   │   ├── 000001.jpg
│   │   └── ... (~491K 张)
│   └── annos/
│       ├── 000001.json
│       └── ...
└── validation/
    ├── image/
    └── annos/
```

## 5. 一键训练

### 5.1 准备训练数据

```bash
cd /root/AiNeed

# 从 DeepFashion2 生成训练标注（自动检测数据集路径）
python ml/scripts/prepare_finetune_data.py \
  --mode real \
  --dataset deepfashion2 \
  --num-items 50000 \
  --output-dir ml/data/chinese_fashion

# 如果同时有 Fashion Product Images 数据集，使用 auto 模式
# python ml/scripts/prepare_finetune_data.py \
#   --mode real \
#   --dataset auto \
#   --num-items 50000 \
#   --output-dir ml/data/chinese_fashion
```

### 5.2 下载基础模型

```bash
# FashionCLIP 基础模型（首次需要下载，约 1.2GB）
python -c "
from transformers import CLIPModel, CLIPProcessor
model = CLIPModel.from_pretrained('patrickjohncyh/fashion-clip')
processor = CLIPProcessor.from_pretrained('patrickjohncyh/fashion-clip')
model.save_pretrained('ml/models/clip_fashion')
processor.save_pretrained('ml/models/clip_fashion')
print('Base model saved to ml/models/clip_fashion')
"
```

### 5.3 启动训练

```bash
cd /root/AiNeed

# 推荐训练配置（RTX 4090, 24GB VRAM）
python ml/scripts/finetune_fashionclip.py \
  --base-model ml/models/clip_fashion \
  --data-dir ml/data/chinese_fashion \
  --output-dir ml/models/chinese-fashion-clip \
  --epochs 15 \
  --batch-size 64 \
  --lr 2e-5 \
  --unfreeze-layers 4 \
  --patience 5 \
  --save-every 3 \
  --num-workers 4

# A100 40GB 可用更大批次
# python ml/scripts/finetune_fashionclip.py \
#   --base-model ml/models/clip_fashion \
#   --data-dir ml/data/chinese_fashion \
#   --output-dir ml/models/chinese-fashion-clip \
#   --epochs 15 \
#   --batch-size 128 \
#   --lr 3e-5 \
#   --unfreeze-layers 6 \
#   --patience 5 \
#   --save-every 3 \
#   --num-workers 4
```

### 5.4 后台训练（防止 SSH 断开）

```bash
# 使用 nohup
nohup python ml/scripts/finetune_fashionclip.py \
  --base-model ml/models/clip_fashion \
  --data-dir ml/data/chinese_fashion \
  --output-dir ml/models/chinese-fashion-clip \
  --epochs 15 \
  --batch-size 64 \
  --lr 2e-5 \
  --unfreeze-layers 4 \
  --patience 5 \
  --num-workers 4 \
  > train.log 2>&1 &

# 查看训练日志
tail -f train.log

# 或使用 tmux（推荐）
tmux new -s train
# 在 tmux 内启动训练命令
# Ctrl+B, D 分离会话
# tmux attach -t train 重新连接
```

## 6. 预期耗时与成本

### 6.1 数据规模与训练时间

| 数据量                 | GPU       | Batch Size | Epochs | 预计耗时     | AutoDL 费用 |
| ---------------------- | --------- | ---------- | ------ | ------------ | ----------- |
| 5,000 (mock)           | RTX 4060  | 32         | 5      | ~2.4 分钟    | - (本地)    |
| 50,000 (DeepFashion2)  | RTX 4090  | 64         | 15     | ~45-60 分钟  | ~¥3-5       |
| 100,000 (DeepFashion2) | RTX 4090  | 64         | 15     | ~90-120 分钟 | ~¥6-10      |
| 50,000 (DeepFashion2)  | A100 40GB | 128        | 15     | ~25-35 分钟  | ~¥5-8       |

> 费用按 AutoDL RTX 4090 ~¥2.6/小时、A100 ~¥6.5/小时估算（2025 价格，以实际为准）

### 6.2 关键里程碑

| 阶段     | 耗时            | 说明                   |
| -------- | --------------- | ---------------------- |
| 环境搭建 | ~10 分钟        | pip install + 模型下载 |
| 数据准备 | ~5-15 分钟      | 解压 + 生成标注        |
| 训练     | ~45-120 分钟    | 取决于数据量和 GPU     |
| 验证     | ~5 分钟         | 推理测试               |
| **总计** | **~1-2.5 小时** |                        |

## 7. 结果验证

### 7.1 检查训练输出

```bash
# 查看训练日志
cat ml/models/chinese-fashion-clip/training_log.json | python -m json.tool

# 查看最佳模型配置
cat ml/models/chinese-fashion-clip/finetune_config.json | python -m json.tool

# 确认 best_model 存在
ls -la ml/models/chinese-fashion-clip/best_model/
# 应包含: config.json, model.safetensors, preprocessor_config.json 等
```

### 7.2 语义检索验证

```python
# verify_model.py - 在 AutoDL 实例上运行
import torch
from transformers import CLIPModel, CLIPProcessor
from PIL import Image

model_path = "ml/models/chinese-fashion-clip/best_model"
model = CLIPModel.from_pretrained(model_path)
processor = CLIPProcessor.from_pretrained(model_path)

test_texts = [
    "适合面试的商务正装穿搭",
    "约会场合温柔浪漫风格",
    "旅行穿搭舒适又时尚",
    "通勤穿搭简约知性",
]

inputs = processor(text=test_texts, return_tensors="pt", padding=True, truncation=True)
with torch.no_grad():
    text_embeds = model.get_text_features(**inputs)
    text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)

# 计算文本相似度矩阵，验证语义区分度
sim_matrix = (text_embeds @ text_embeds.T).numpy()
print("文本语义相似度矩阵:")
for i, t in enumerate(test_texts):
    print(f"  {t[:10]}... -> {sim_matrix[i].round(3)}")

# 对角线应最高（自身），不同场合应有一定区分
print(f"\n对角线均值: {sim_matrix.diagonal().mean():.3f}")
print(f"非对角线均值: {sim_matrix[~np.eye(4, dtype=bool)].mean():.3f}")
```

### 7.3 与基线模型对比

```python
# compare_models.py - 对比微调前后效果
from transformers import CLIPModel, CLIPProcessor
import torch
import numpy as np

base_model = CLIPModel.from_pretrained("patrickjohncyh/fashion-clip")
ft_model = CLIPModel.from_pretrained("ml/models/chinese-fashion-clip/best_model")
processor = CLIPProcessor.from_pretrained("patrickjohncyh/fashion-clip")

test_pairs = [
    ("黑色西装搭配白色衬衫", "面试正装穿搭推荐"),
    ("碎花连衣裙搭配高跟鞋", "约会场合温柔浪漫风格"),
    ("卫衣搭配牛仔裤运动鞋", "旅行穿搭舒适又时尚"),
]

for text_a, text_b in test_pairs:
    inputs = processor(text=[text_a, text_b], return_tensors="pt", padding=True, truncation=True)

    with torch.no_grad():
        base_embeds = base_model.get_text_features(**inputs)
        base_embeds = base_embeds / base_embeds.norm(dim=-1, keepdim=True)
        base_sim = (base_embeds[0] @ base_embeds[1]).item()

        ft_embeds = ft_model.get_text_features(**inputs)
        ft_embeds = ft_embeds / ft_embeds.norm(dim=-1, keepdim=True)
        ft_sim = (ft_embeds[0] @ ft_embeds[1]).item()

    print(f"'{text_a}' vs '{text_b}'")
    print(f"  基线相似度: {base_sim:.4f} | 微调相似度: {ft_sim:.4f} | 提升: {ft_sim - base_sim:+.4f}")
```

### 7.4 下载模型到本地

```bash
# 方式 1：SCP 下载
scp -r root@<实例IP>:/root/AiNeed/ml/models/chinese-fashion-clip/best_model \
  C:\AiNeed\ml\models\chinese-fashion-clip\

# 方式 2：AutoDL 文件管理器下载
# 控制台 -> 文件管理 -> 导航到 ml/models/chinese-fashion-clip/best_model -> 下载
```

## 8. 训练调优建议

### 8.1 如果 val_loss 不下降

| 问题       | 解决方案                                              |
| ---------- | ----------------------------------------------------- |
| 学习率过大 | 降到 1e-5                                             |
| 欠拟合     | 增加 `--unfreeze-layers 6` 或 `--epochs 20`           |
| 过拟合     | 减少 unfreeze layers 到 2，增加 `--weight-decay 0.02` |
| 数据量不足 | 增加 `--num-items` 到 100K+                           |

### 8.2 显存不足

| 显存        | 推荐配置                               |
| ----------- | -------------------------------------- |
| 16GB (V100) | `--batch-size 16 --unfreeze-layers 2`  |
| 24GB (4090) | `--batch-size 64 --unfreeze-layers 4`  |
| 40GB (A100) | `--batch-size 128 --unfreeze-layers 6` |

### 8.3 训练速度优化

```bash
# 启用 torch.compile（PyTorch 2.0+，约 10-20% 加速）
# 在 finetune_fashionclip.py 的 model.to(device) 后添加：
# model = torch.compile(model)

# 增加 DataLoader workers
--num-workers 4  # 根据 CPU 核心数调整
```

## 9. 常见问题

**Q: DeepFashion2 标注格式不对？**
A: 脚本支持两种目录结构：`train/image/` + `train/annos/` 和 `train_image/` + `train_annos/`。如果标注是单个大 JSON 文件，需要先拆分为每图一个 JSON。

**Q: 训练中断后如何恢复？**
A: 使用 `--base-model ml/models/chinese-fashion-clip/checkpoint_epoch_X` 从检查点继续训练。

**Q: 如何确认模型已生效？**
A: 下载 best_model 到本地 `ml/models/chinese-fashion-clip/best_model/`，重启后端服务，`embeddings.py` 会自动检测并加载。
