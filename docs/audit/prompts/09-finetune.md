# 轨道 9: ChineseFashionCLIP Fine-tune（含金量核心突破）

你是 XUNO 项目的 ML 研究工程师。你的任务是 Fine-tune FashionCLIP 在中国时尚数据上，产出 ChineseFashionCLIP 模型。这是项目最重要的含金量来源——"我们自己训练了模型"。

## 为什么这是最重要的轨道

评委一定会问"哪个模型是你自己训练的"。如果答案是"都是开源的"，技术含金量直接归零。ChineseFashionCLIP 是这个问题的唯一正确答案。

## 目标

1. 收集/下载中国时尚数据集
2. Fine-tune FashionCLIP（ViT-B/32）
3. 跑 benchmark 对比原版 vs Fine-tune 版本
4. 产出 Recall@K 提升数据

## 具体步骤

### 步骤 1: 数据准备

在 AutoDL 上租 RTX 4090 实例（约 1.5-3 元/小时）。

数据来源（选一个或组合）：

1. **DeepFashion2** — 公开数据集，约 49 万张时尚图片+标注
   - 下载：https://github.com/switchablenorms/DeepFashion2
   - 优势：有丰富的属性标注（类别、风格、颜色）
2. **Polyvore Outfits** — 搭配组合数据集
   - 约 5 万套搭配，每套 3-8 件单品
   - 优势：有搭配级别的 ground truth
3. **在线爬取** — 从小红书/淘宝搜索结果收集中国穿搭图片
   - 需要标注：用 LLM 自动生成描述文本

最小可行数据集：5000 张图片 + 中文描述文本对

### 步骤 2: 数据预处理

```python
# scripts/prepare_finetune_data.py
import json
import os
from PIL import Image
from torch.utils.data import Dataset

class ChineseFashionDataset(Dataset):
    def __init__(self, data_dir, processor, max_items=5000):
        self.data = []
        self.processor = processor

        # 加载数据
        annotations = json.load(open(os.path.join(data_dir, 'annotations.json')))

        for item in annotations[:max_items]:
            img_path = os.path.join(data_dir, 'images', item['image_id'])
            if os.path.exists(img_path):
                self.data.append({
                    'image': img_path,
                    'text': item['chinese_description'],  # 中文描述
                    'category': item.get('category', ''),
                    'style': item.get('style', ''),
                })

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        image = Image.open(item['image']).convert('RGB')
        return {
            'image': image,
            'text': item['text'],
        }
```

### 步骤 3: Fine-tune 代码

```python
# scripts/finetune_fashionclip.py
import torch
from transformers import CLIPModel, CLIPProcessor
from torch.utils.data import DataLoader

def finetune():
    # 加载基础模型
    model = CLIPModel.from_pretrained("patrickjohncyh/fashion-clip")
    processor = CLIPProcessor.from_pretrained("patrickjohncyh/fashion-clip")

    # 冻结大部分层，只训练最后2层
    for param in model.parameters():
        param.requires_grad = False
    for param in model.text_projection.parameters():
        param.requires_grad = True
    for param in model.visual_projection.parameters():
        param.requires_grad = True

    # 数据集
    dataset = ChineseFashionDataset('data/chinese_fashion', processor)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

    # 训练
    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=1e-5, weight_decay=0.01
    )
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)

    for epoch in range(10):
        total_loss = 0
        for batch in dataloader:
            images = batch['image']
            texts = batch['text']

            inputs = processor(
                text=texts, images=images,
                return_tensors="pt", padding=True, truncation=True
            )
            inputs = {k: v.to(device) for k, v in inputs.items()}

            outputs = model(**inputs)
            # CLIP对比学习loss
            logits = outputs.logits_per_image
            labels = torch.arange(logits.shape[0]).to(device)
            loss = (torch.nn.functional.cross_entropy(logits, labels) +
                    torch.nn.functional.cross_entropy(logits.T, labels)) / 2

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)
        print(f"Epoch {epoch+1}/10, Loss: {avg_loss:.4f}")

    # 保存模型
    model.save_pretrained("models/chinese-fashion-clip")
    processor.save_pretrained("models/chinese-fashion-clip")
    print("ChineseFashionCLIP saved!")

if __name__ == "__main__":
    finetune()
```

### 步骤 4: Benchmark 评估

```python
# scripts/benchmark_fashionclip.py
def benchmark():
    """对比原版FashionCLIP vs ChineseFashionCLIP"""
    from transformers import CLIPModel, CLIPProcessor
    import torch
    import numpy as np

    models = {
        "FashionCLIP (原版)": "patrickjohncyh/fashion-clip",
        "ChineseFashionCLIP (微调)": "models/chinese-fashion-clip",
    }

    test_cases = [
        {"query": "互联网公司面试穿搭 男", "relevant_categories": ["suit", "shirt", "trousers"]},
        {"query": "约会穿搭 女 暖色调", "relevant_categories": ["dress", "knitwear"]},
        {"query": "冬季旅行穿搭", "relevant_categories": ["jacket", "coat", "boots"]},
        {"query": "Smart Casual 通勤", "relevant_categories": ["blazer", "chinos"]},
        {"query": "夏日清爽穿搭", "relevant_categories": ["t-shirt", "shorts", "sandals"]},
    ]

    results = {}
    for name, path in models.items():
        model = CLIPModel.from_pretrained(path)
        processor = CLIPProcessor.from_pretrained(path)
        # ... 跑 Recall@1, @5, @10
        results[name] = {"recall@1": ..., "recall@5": ..., "recall@10": ...}

    # 输出对比
    print("Benchmark Results:")
    print(f"{'Model':<30} {'R@1':>8} {'R@5':>8} {'R@10':>8}")
    for name, metrics in results.items():
        print(f"{name:<30} {metrics['recall@1']:>8.2%} {metrics['recall@5']:>8.2%} {metrics['recall@10']:>8.2%}")

if __name__ == "__main__":
    benchmark()
```

### 步骤 5: ONNX 导出

```python
# scripts/export_onnx.py
from transformers import CLIPModel
from optimum.exporters.onnx import main_export

model = CLIPModel.from_pretrained("models/chinese-fashion-clip")
main_export(
    model_name_or_path="models/chinese-fashion-clip",
    output="models/chinese-fashion-clip-onnx",
    task="feature-extraction"
)
```

## 验收标准

1. ChineseFashionCLIP 模型文件保存在 `ml/models/chinese-fashion-clip/`
2. Benchmark 显示 Recall@5 比原版 FashionCLIP 提升（任何正向提升都可以）
3. ONNX 导出成功，可以在 RTX 4060 上推理
4. 有完整的训练日志（loss 曲线、epoch 数据）
5. 可以在轨道 7 中替换原版 FashionCLIP

## 含金量展示素材

为 PPT 和 Demo 准备：

1. "原版 FashionCLIP vs ChineseFashionCLIP"的对比图
2. 训练 loss 曲线
3. 具体案例："输入'面试穿搭' → 原版返回西方西装 → 微调版返回适合中国职场的 Smart Casual"
4. AutoDL 训练截图（证明是在 GPU 上真正训练的）
