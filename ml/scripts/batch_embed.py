"""
Batch embedding pipeline for FashionSigLIP.

Reads all products from database or JSON, generates 1152-dim embeddings
using FashionSigLIP, and upserts to Qdrant in batches.

Usage:
    python -m ml.scripts.batch_embed --batch-size 100
    python -m ml.scripts.batch_embed --collection-name clothing_items --dry-run
"""
import argparse
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.services.rag.embeddings import EmbeddingService, EmbeddingConfig
from ml.services.rag.qdrant_client import QdrantVectorStore, QdrantConfig, VectorDocument


EMBEDDING_DIM = 1152


def load_products_from_json(json_path: str) -> list:
    """Load products from a JSON file."""
    if not os.path.exists(json_path):
        raise FileNotFoundError(f"Products file not found: {json_path}")
    with open(json_path, encoding="utf-8") as f:
        return json.load(f)


def load_products_from_db() -> list:
    """Load products from PostgreSQL database.

    Requires DATABASE_URL environment variable.
    Falls back to JSON if database is unavailable.
    """
    try:
        import psycopg2
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL environment variable not set")

        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, name, description, category, gender, price "
            "FROM \"ClothingItem\" WHERE \"isActive\" = true"
        )
        rows = cursor.fetchall()
        conn.close()

        products = []
        for row in rows:
            products.append({
                "id": str(row[0]),
                "name": row[1] or "",
                "description": row[2] or "",
                "category": row[3] or "",
                "gender": row[4] or "",
                "price": float(row[5]) if row[5] else 0,
            })
        return products
    except Exception as e:
        print(f"Database load failed: {e}. Falling back to JSON.")
        return None


def build_text_for_embedding(product: dict) -> str:
    """Build a combined text string from product fields for embedding."""
    parts = [
        product.get("name", ""),
        product.get("description", ""),
        product.get("occasion", ""),
        product.get("style", ""),
    ]
    tags = product.get("tags", [])
    if tags:
        parts.append(" ".join(tags) if isinstance(tags, list) else str(tags))
    return " ".join(p for p in parts if p)


def batch_embed(
    collection_name: str = "fashion_knowledge",
    batch_size: int = 100,
    dry_run: bool = False,
    json_path: str = None,
):
    """Main batch embedding pipeline."""
    start_time = time.time()

    # Load products
    products = None
    if json_path:
        products = load_products_from_json(json_path)
        print(f"Loaded {len(products)} products from JSON: {json_path}")
    else:
        products = load_products_from_db()

    if products is None:
        # Fallback to default mock data
        default_path = os.path.join(
            os.path.dirname(__file__), '..', 'data', 'mock_products.json'
        )
        default_path = os.path.normpath(default_path)
        products = load_products_from_json(default_path)
        print(f"Loaded {len(products)} products from default mock data")

    if not products:
        print("No products to embed. Exiting.")
        return

    # Initialize embedding service
    print(f"Loading FashionSigLIP model (dim={EMBEDDING_DIM})...")
    embedding_config = EmbeddingConfig(dimension=EMBEDDING_DIM)
    embedding_service = EmbeddingService(config=embedding_config)

    # Build texts
    texts = [build_text_for_embedding(p) for p in products]

    # Generate embeddings in batches
    total_batches = (len(texts) + batch_size - 1) // batch_size
    print(f"Generating embeddings: {len(products)} products, {total_batches} batches (batch_size={batch_size})")

    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch_start = time.time()
        batch = texts[i:i + batch_size]
        embeddings = embedding_service.encode_text(batch)
        all_embeddings.extend(embeddings)

        batch_num = i // batch_size + 1
        batch_elapsed = time.time() - batch_start
        total_elapsed = time.time() - start_time
        avg_per_item = total_elapsed / min(i + batch_size, len(texts))
        remaining = (len(texts) - min(i + batch_size, len(texts))) * avg_per_item

        print(
            f"  Encoding batch {batch_num}/{total_batches}... "
            f"({min(i + batch_size, len(texts))}/{len(texts)}) "
            f"batch_time={batch_elapsed:.1f}s ETA={remaining:.0f}s"
        )

    if dry_run:
        print(f"\n[DRY RUN] Would upsert {len(products)} vectors (dim={EMBEDDING_DIM}) to collection '{collection_name}'")
        print(f"[DRY RUN] Sample embedding length: {len(all_embeddings[0])}")
        total_elapsed = time.time() - start_time
        print(f"[DRY RUN] Total time: {total_elapsed:.1f}s")
        return

    # Connect to Qdrant and upsert
    print(f"Connecting to Qdrant (collection: {collection_name})...")
    qdrant_config = QdrantConfig(
        collection_name=collection_name,
        embedding_dim=EMBEDDING_DIM,
    )
    vector_store = QdrantVectorStore(config=qdrant_config)

    # Build documents
    docs = [
        VectorDocument(
            doc_id=p.get("id", str(i)),
            content=texts[i],
            embedding=all_embeddings[i],
            metadata={
                "name": p.get("name", ""),
                "description": p.get("description", ""),
                "occasion": p.get("occasion", ""),
                "style": p.get("style", ""),
                "category": p.get("category", ""),
                "gender": p.get("gender", ""),
                "colors": p.get("colors", []),
                "price": p.get("price", 0),
                "tags": p.get("tags", []),
            },
        )
        for i, p in enumerate(products)
    ]

    # Upsert in batches
    print("Upserting to Qdrant...")
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        vector_store.upsert(batch)
        batch_num = i // batch_size + 1
        print(f"  Upserted batch {batch_num}/{total_batches} ({min(i + batch_size, len(docs))}/{len(docs)})")

    total_elapsed = time.time() - start_time
    print(f"\nBatch embedding complete: {len(docs)} products upserted to '{collection_name}'")
    print(f"Total time: {total_elapsed:.1f}s ({total_elapsed / len(docs):.2f}s/item)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch embedding pipeline for FashionSigLIP")
    parser.add_argument(
        "--collection-name",
        type=str,
        default="fashion_knowledge",
        help="Qdrant collection name (default: fashion_knowledge)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size for embedding and upsert (default: 100)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Generate embeddings but skip Qdrant upsert",
    )
    parser.add_argument(
        "--json-path",
        type=str,
        default=None,
        help="Path to products JSON file (default: auto-detect)",
    )
    args = parser.parse_args()
    batch_embed(
        collection_name=args.collection_name,
        batch_size=args.batch_size,
        dry_run=args.dry_run,
        json_path=args.json_path,
    )
