"""
创建正确格式的索引元数据文件
"""
import numpy as np
import json
from collections import defaultdict

indices_dir = 'c:/AiNeed/ml/data/indices'

with open(f'{indices_dir}/metadata.json', 'r', encoding='utf-8') as f:
    raw_metadata = json.load(f)

print(f"原始元数据数量: {len(raw_metadata)}")

metadata = {}
style_to_items = defaultdict(list)
category_to_items = defaultdict(list)
occasion_to_items = defaultdict(list)

for item_id, item in raw_metadata.items():
    metadata[item_id] = item
    
    for style in item.get('style_tags', []):
        style_to_items[style].append(item_id)
    
    category = item.get('category', '')
    if category:
        category_to_items[category].append(item_id)
    
    for occasion in item.get('occasion_tags', []):
        occasion_to_items[occasion].append(item_id)

output = {
    "metadata": metadata,
    "style_to_items": dict(style_to_items),
    "category_to_items": dict(category_to_items),
    "occasion_to_items": dict(occasion_to_items),
    "config": {
        "index_path": "./data/indices/style_index",
        "index_type": "flat",
        "embedding_dim": 512,
        "metric": "cosine"
    }
}

output_path = f'{indices_dir}/style_metadata.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"已保存到: {output_path}")
print(f"风格数: {len(style_to_items)}")
print(f"类别数: {len(category_to_items)}")
print(f"场合数: {len(occasion_to_items)}")

print("\n风格分布:")
for style, items in sorted(style_to_items.items(), key=lambda x: -len(x[1]))[:5]:
    print(f"  {style}: {len(items)}")

print("\n类别分布:")
for cat, items in sorted(category_to_items.items(), key=lambda x: -len(x[1]))[:5]:
    print(f"  {cat}: {len(items)}")
