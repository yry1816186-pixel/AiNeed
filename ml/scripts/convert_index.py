"""
将现有索引文件转换为服务所需的格式
"""
import numpy as np
import json
import os

indices_dir = 'c:/AiNeed/ml/data/indices'
output_file = 'c:/AiNeed/ml/data/indices/style_index.npz'

print("加载现有索引文件...")

embeddings = np.load(os.path.join(indices_dir, 'embeddings.npy'))
ids = np.load(os.path.join(indices_dir, 'ids.npy'), allow_pickle=True)

with open(os.path.join(indices_dir, 'metadata.json'), 'r', encoding='utf-8') as f:
    metadata = json.load(f)

print(f"嵌入向量形状: {embeddings.shape}")
print(f"ID 数量: {len(ids)}")
print(f"元数据数量: {len(metadata)}")

print(f"\n保存为合并格式: {output_file}")
np.savez(
    output_file,
    embeddings=embeddings,
    ids=ids
)

with open(output_file.replace('.npz', '_metadata.json'), 'w', encoding='utf-8') as f:
    json.dump(metadata, f, ensure_ascii=False)

print("完成!")

print("\n验证...")
data = np.load(output_file, allow_pickle=True)
print(f"加载后嵌入向量形状: {data['embeddings'].shape}")
print(f"加载后 ID 数量: {len(data['ids'])}")
