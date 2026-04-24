"""
将Mock商品数据灌入Qdrant
使用FashionCLIP生成嵌入
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.services.rag.embeddings import EmbeddingService, EmbeddingConfig
from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig, VectorDocument


def load_mock_products():
    products_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'mock_products.json')
    products_path = os.path.normpath(products_path)
    if os.path.exists(products_path):
        with open(products_path, encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Mock products file not found: {products_path}")


def seed():
    print("Loading FashionCLIP model...")
    embedding_service = EmbeddingService()

    print("Connecting to Qdrant...")
    vector_store = QdrantVectorStore()

    print("Loading mock products...")
    products = load_mock_products()
    print(f"Loaded {len(products)} products")

    texts = [
        f"{p['name']} {p.get('description', '')} {p.get('occasion', '')} {p.get('style', '')} {' '.join(p.get('tags', []))}"
        for p in products
    ]

    print("Generating embeddings with FashionCLIP...")
    batch_size = 32
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embeddings = embedding_service.encode_text(batch)
        all_embeddings.extend(embeddings)
        print(f"  Embedded {min(i + batch_size, len(texts))}/{len(texts)}")

    print("Upserting to Qdrant...")
    docs = [
        VectorDocument(
            doc_id=p['id'],
            content=texts[i],
            embedding=all_embeddings[i],
            metadata={
                "name": p['name'],
                "description": p.get('description', ''),
                "occasion": p.get('occasion', ''),
                "style": p.get('style', ''),
                "category": p.get('category', ''),
                "gender": p.get('gender', ''),
                "colors": p.get('colors', []),
                "price": p.get('price', 0),
                "tags": p.get('tags', []),
            },
        )
        for i, p in enumerate(products)
    ]
    vector_store.upsert(docs)
    print(f"Seeded {len(docs)} products into Qdrant")

    print("Verifying...")
    query_embedding = embedding_service.encode_query("面试穿什么")
    results = vector_store.search(query_embedding, top_k=5)
    print(f"Verification query '面试穿什么' returned {len(results)} results:")
    for r in results:
        print(f"  - {r['metadata'].get('name', 'N/A')} (score={r['score']:.4f})")

    print("Done!")


if __name__ == "__main__":
    seed()
