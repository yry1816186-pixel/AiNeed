"""
检查索引服务状态
"""
import sys
sys.path.insert(0, 'c:/AiNeed/ml')

import numpy as np
import json

print("=" * 60)
print("检查索引数据")
print("=" * 60)

embeddings = np.load('c:/AiNeed/ml/data/indices/embeddings.npy')
ids = np.load('c:/AiNeed/ml/data/indices/ids.npy', allow_pickle=True)

print(f"嵌入向量形状: {embeddings.shape}")
print(f"ID 数量: {len(ids)}")
print(f"前5个 ID: {ids[:5]}")

with open('c:/AiNeed/ml/data/indices/metadata.json', 'r', encoding='utf-8') as f:
    metadata = json.load(f)

print(f"元数据类型: {type(metadata)}")

if isinstance(metadata, dict):
    print(f"元数据键数量: {len(metadata)}")
    first_key = list(metadata.keys())[0]
    print(f"\n第一个商品 ID: {first_key}")
    print(f"元数据:")
    print(json.dumps(metadata[first_key], ensure_ascii=False, indent=2))
elif isinstance(metadata, list):
    print(f"元数据数量: {len(metadata)}")
    print(f"\n第一个商品元数据:")
    print(json.dumps(metadata[0], ensure_ascii=False, indent=2))

print("\n" + "=" * 60)
print("测试索引服务")
print("=" * 60)

from services.intelligent_style_recommender import StyleIndexService, StyleIndexConfig

config = StyleIndexConfig(index_path='c:/AiNeed/ml/data/indices/style_index')
index_service = StyleIndexService(config)

try:
    index_service.load_index()
    print("索引加载成功!")
    
    query = np.random.randn(512).astype(np.float32)
    query = query / np.linalg.norm(query)
    
    results = index_service.hybrid_search(query, style_preference=['法式'], k=5)
    print(f"搜索结果数量: {len(results)}")
    
    for i, result in enumerate(results[:3]):
        print(f"\n结果 {i+1}:")
        print(f"  ID: {result.get('id', 'N/A')}")
        print(f"  分数: {result.get('score', 0):.4f}")
        print(f"  类别: {result.get('category', 'N/A')}")
        
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
