# 轨道 7: FashionCLIP 接入 + Qdrant 向量灌入

你是 XUNO 项目的 ML 工程师。你的任务是把当前假的向量检索替换为真正的 FashionCLIP 嵌入 + Qdrant 存储。

## 当前问题

1. `ml/services/rag/embeddings.py` 第 10 行使用 `bge-small-zh-v1.5`（通用中文文本模型），不是 FashionCLIP
2. 第 36-38 行：当 sentence_transformers 不可用时返回随机向量
3. `ml/services/rag/qdrant_client.py` 第 38-40 行：当 qdrant_client 不可用时用内存 fallback
4. 没有任何数据写入 Qdrant 的管道 — 数据库永远是空的
5. NestJS 侧 `apps/backend/src/domains/platform/recommendations/services/qdrant.service.ts` 第 43-46 行也是内存 Map fallback

## 目标

1. FashionCLIP（patrickjohncyh/fashion-clip）作为主要嵌入模型
2. 100 条 Mock 商品的嵌入数据灌入 Qdrant
3. 消除所有随机向量 fallback
4. 后端 NestJS 正确调用 ML 服务的向量 API

## 具体修改指令

### 步骤 1: 替换嵌入模型

文件: `ml/services/rag/embeddings.py`

```python
@dataclass
class EmbeddingConfig:
    # 替换 bge-small-zh-v1.5 为 FashionCLIP
    model_name: str = "patrickjohncyh/fashion-clip"
    dimension: int = 512  # FashionCLIP ViT-B/32 输出维度

class EmbeddingService:
    def __init__(self, config=None):
        self.config = config or EmbeddingConfig()
        try:
            from transformers import CLIPModel, CLIPProcessor
            import torch
            self._model = CLIPModel.from_pretrained(self.config.model_name)
            self._processor = CLIPProcessor.from_pretrained(self.config.model_name)
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._model.to(self._device)
            self._model.eval()
            logger.info(f"FashionCLIP loaded on {self._device}")
        except ImportError as e:
            raise RuntimeError(f"FashionCLIP dependencies not available: {e}. "
                             f"Install: pip install transformers torch")

    def encode_text(self, texts: List[str]) -> List[List[float]]:
        """文本嵌入 — 用于用户查询"""
        import torch
        inputs = self._processor(text=texts, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}
        with torch.no_grad():
            features = self._model.get_text_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().tolist()

    def encode_image(self, images) -> List[List[float]]:
        """图片嵌入 — 用于商品索引"""
        import torch
        from PIL import Image
        if isinstance(images[0], str):
            images = [Image.open(img).convert("RGB") for img in images]
        inputs = self._processor(images=images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self._device) for k, v in inputs.items()}
        with torch.no_grad():
            features = self._model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().tolist()
```

关键：

- 删除 `self._model = "fallback"` 和返回随机向量的逻辑
- 如果依赖不可用，直接 raise RuntimeError 而不是静默返回随机值
- FashionCLIP 同时支持文本和图片嵌入

### 步骤 2: 确保 Qdrant 客户端可靠

文件: `ml/services/rag/qdrant_client.py`

```python
class QdrantVectorStore:
    def __init__(self, config=None):
        self.config = config or QdrantConfig()
        try:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(
                host=self.config.host,
                port=self.config.port,
            )
            self._ensure_collection()
        except ImportError:
            raise RuntimeError("qdrant_client not installed. pip install qdrant-client")

    def _ensure_collection(self):
        """确保collection存在"""
        from qdrant_client.models import Distance, VectorParams
        collections = self._client.get_collections().collections
        if self.config.collection_name not in [c.name for c in collections]:
            self._client.create_collection(
                collection_name=self.config.collection_name,
                vectors_config=VectorParams(size=512, distance=Distance.COSINE)
            )

    def upsert(self, documents: List[VectorDocument]):
        """批量写入向量"""
        from qdrant_client.models import PointStruct
        points = [
            PointStruct(
                id=doc.doc_id,
                vector=doc.embedding,
                payload=doc.metadata
            )
            for doc in documents
        ]
        self._client.upsert(
            collection_name=self.config.collection_name,
            points=points
        )

    def search(self, query_embedding: List[float], top_k: int = 10, filters=None):
        """向量检索"""
        return self._client.search(
            collection_name=self.config.collection_name,
            query_vector=query_embedding,
            limit=top_k,
            query_filter=filters
        )
```

关键：

- 删除内存 fallback (`self._documents` dict)
- 删除 numpy 手写 cosine similarity
- 如果 Qdrant 不可连接，raise 而不是静默返回空结果

### 步骤 3: 创建数据灌入脚本

新建文件: `ml/scripts/seed_qdrant.py`

```python
"""
将Mock商品数据灌入Qdrant
使用FashionCLIP生成嵌入
"""
import json
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rag.embeddings import EmbeddingService
from services.rag.qdrant_client import QdrantVectorStore

def load_mock_products():
    """从JSON文件加载Mock商品数据"""
    products_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'mock_products.json')
    if os.path.exists(products_path):
        with open(products_path) as f:
            return json.load(f)
    # 如果没有现成的Mock数据，生成基础Mock
    return generate_mock_products()

def generate_mock_products():
    """生成100条Mock商品数据，覆盖面试/约会/旅行等场景"""
    products = []
    # 面试场景: 30件（西装、衬衫、裤子、裙装）
    # 约会场景: 25件（针织衫、连衣裙、外套）
    # 旅行场景: 20件（夹克、休闲裤、T恤）
    # 日常通勤: 25件（各种基础款）
    # ... 具体生成逻辑
    return products

def seed():
    embedding_service = EmbeddingService()
    vector_store = QdrantVectorStore()

    products = load_mock_products()

    # 生成文本嵌入（用商品名称+描述+场景标签）
    texts = [f"{p['name']} {p.get('description', '')} {p.get('occasion', '')} {p.get('style', '')}" for p in products]
    embeddings = embedding_service.encode_text(texts)

    # 灌入Qdrant
    from services.rag.qdrant_client import VectorDocument
    docs = [
        VectorDocument(
            doc_id=p['id'],
            content=texts[i],
            embedding=embeddings[i],
            metadata=p
        )
        for i, p in enumerate(products)
    ]
    vector_store.upsert(docs)
    print(f"Seeded {len(docs)} products into Qdrant")

if __name__ == "__main__":
    seed()
```

### 步骤 4: NestJS 侧调用 ML 向量 API

文件: `apps/backend/src/domains/platform/recommendations/services/qdrant.service.ts`

确保这个 service 调用 ML Python API 而不是自己实现向量检索：

```typescript
// 调用 ml/api/ 暴露的向量检索端点
// 而不是在NestJS中做内存Map的cosine similarity
async search(query: string, topK: number): Promise<SearchResult[]> {
  const embedding = await this.mlClient.getTextEmbedding(query);
  return this.mlClient.vectorSearch(embedding, topK);
}
```

## 验收标准

1. `ml/scripts/seed_qdrant.py` 能成功运行，灌入 100 条数据
2. 向量检索返回有意义的相似度排序结果（不是随机）
3. `embeddings.py` 不再有任何随机向量 fallback
4. FashionCLIP 模型加载成功（验证：encode_text 返回 512 维向量）
5. 后端推荐管道调用向量检索能得到结果

## 注意事项

- FashionCLIP 模型约 1.5GB，首次加载需要下载
- RTX 4060 上推理延迟约 15-30ms/图，5-10ms/文本
- Mock 商品需要覆盖面试/约会/旅行/通勤 4 个场景，每个场景有男女风格各半
- 如果 CUDA 不可用，CPU 推理也能用，只是慢一些
