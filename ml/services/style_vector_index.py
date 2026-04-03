"""
风格向量索引服务
支持高效的风格检索、相似度搜索和个性化推荐
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
from enum import Enum
import heapq
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IndexType(Enum):
    FLAT = "flat"
    IVF = "ivf"
    HNSW = "hnsw"
    PQ = "pq"


@dataclass
class StyleIndexConfig:
    embedding_dim: int = 512
    index_type: str = "flat"
    n_clusters: int = 100
    n_probe: int = 10
    m: int = 32
    ef_construction: int = 200
    ef_search: int = 50
    n_subquantizers: int = 8
    n_bits: int = 8
    
    use_gpu: bool = False
    metric: str = "cosine"
    
    index_path: str = "./data/indices/style_index"
    metadata_path: str = "./data/indices/style_metadata.json"


@dataclass
class IndexedItem:
    item_id: str
    embedding: np.ndarray
    category: str
    style_tags: List[str]
    color_tags: List[str]
    occasion_tags: List[str]
    season_tags: List[str]
    popularity_score: float
    source: str
    metadata: Dict[str, Any]


class FlatIndex:
    def __init__(self, dim: int, metric: str = "cosine"):
        self.dim = dim
        self.metric = metric
        self.embeddings: Optional[np.ndarray] = None
        self.ids: List[str] = []
    
    def add(self, ids: List[str], embeddings: np.ndarray) -> None:
        if self.embeddings is None:
            self.embeddings = embeddings.astype(np.float32)
            self.ids = ids
        else:
            self.embeddings = np.vstack([self.embeddings, embeddings.astype(np.float32)])
            self.ids.extend(ids)
        
        if self.metric == "cosine":
            self.embeddings = self._normalize(self.embeddings)
    
    def search(self, query: np.ndarray, k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        if self.embeddings is None or len(self.embeddings) == 0:
            return np.array([]), np.array([])
        
        query = query.reshape(1, -1).astype(np.float32)
        if self.metric == "cosine":
            query = self._normalize(query)
        
        similarities = np.dot(self.embeddings, query.T).flatten()
        
        top_k_indices = np.argsort(similarities)[::-1][:k]
        top_k_scores = similarities[top_k_indices]
        
        return top_k_indices, top_k_scores
    
    def _normalize(self, embeddings: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return embeddings / norms
    
    def save(self, path: str) -> None:
        np.savez(
            path,
            embeddings=self.embeddings,
            ids=np.array(self.ids, dtype=object)
        )
    
    def load(self, path: str) -> None:
        if not path.endswith('.npz'):
            path = path + '.npz'
        data = np.load(path, allow_pickle=True)
        self.embeddings = data['embeddings']
        self.ids = data['ids'].tolist()


class IVFIndex:
    def __init__(self, dim: int, n_clusters: int = 100, n_probe: int = 10):
        self.dim = dim
        self.n_clusters = n_clusters
        self.n_probe = n_probe
        
        self.centroids: Optional[np.ndarray] = None
        self.cluster_items: Dict[int, List[int]] = defaultdict(list)
        self.embeddings: Optional[np.ndarray] = None
        self.ids: List[str] = []
    
    def train(self, embeddings: np.ndarray) -> None:
        from sklearn.cluster import KMeans
        
        kmeans = KMeans(n_clusters=self.n_clusters, random_state=42)
        kmeans.fit(embeddings)
        self.centroids = kmeans.cluster_centers_
    
    def add(self, ids: List[str], embeddings: np.ndarray) -> None:
        if self.centroids is None:
            self.train(embeddings)
        
        if self.embeddings is None:
            self.embeddings = embeddings.astype(np.float32)
            self.ids = ids
        else:
            self.embeddings = np.vstack([self.embeddings, embeddings.astype(np.float32)])
            self.ids.extend(ids)
        
        embeddings_norm = self._normalize(embeddings)
        centroids_norm = self._normalize(self.centroids)
        
        for i, emb in enumerate(embeddings_norm):
            distances = np.dot(centroids_norm, emb)
            nearest_cluster = np.argmax(distances)
            self.cluster_items[nearest_cluster].append(len(self.ids) - len(ids) + i)
    
    def search(self, query: np.ndarray, k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        if self.embeddings is None or self.centroids is None:
            return np.array([]), np.array([])
        
        query = query.reshape(1, -1).astype(np.float32)
        query_norm = self._normalize(query)
        centroids_norm = self._normalize(self.centroids)
        
        centroid_scores = np.dot(centroids_norm, query_norm.T).flatten()
        top_clusters = np.argsort(centroid_scores)[::-1][:self.n_probe]
        
        candidate_indices = []
        for cluster_id in top_clusters:
            candidate_indices.extend(self.cluster_items[cluster_id])
        
        if not candidate_indices:
            return np.array([]), np.array([])
        
        candidate_embeddings = self.embeddings[candidate_indices]
        candidate_embeddings_norm = self._normalize(candidate_embeddings)
        
        similarities = np.dot(candidate_embeddings_norm, query_norm.T).flatten()
        
        top_k_local = np.argsort(similarities)[::-1][:k]
        top_k_indices = np.array(candidate_indices)[top_k_local]
        top_k_scores = similarities[top_k_local]
        
        return top_k_indices, top_k_scores
    
    def _normalize(self, embeddings: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return embeddings / norms
    
    def save(self, path: str) -> None:
        np.savez(
            path,
            embeddings=self.embeddings,
            ids=np.array(self.ids, dtype=object),
            centroids=self.centroids
        )
    
    def load(self, path: str) -> None:
        if not path.endswith('.npz'):
            path = path + '.npz'
        data = np.load(path, allow_pickle=True)
        self.embeddings = data['embeddings']
        self.ids = data['ids'].tolist()
        self.centroids = data['centroids']


class HNSWIndex:
    def __init__(self, dim: int, m: int = 32, ef_construction: int = 200, ef_search: int = 50):
        self.dim = dim
        self.m = m
        self.ef_construction = ef_construction
        self.ef_search = ef_search
        
        self.embeddings: Optional[np.ndarray] = None
        self.ids: List[str] = []
        self.graph: Dict[int, List[Tuple[int, float]]] = defaultdict(list)
    
    def add(self, ids: List[str], embeddings: np.ndarray) -> None:
        if self.embeddings is None:
            self.embeddings = embeddings.astype(np.float32)
            self.ids = ids
        else:
            self.embeddings = np.vstack([self.embeddings, embeddings.astype(np.float32)])
            self.ids.extend(ids)
        
        self._build_graph()
    
    def _build_graph(self) -> None:
        embeddings_norm = self._normalize(self.embeddings)
        
        for i in range(len(embeddings_norm)):
            if i == 0:
                continue
            
            similarities = np.dot(embeddings_norm[:i], embeddings_norm[i])
            
            top_m_indices = np.argsort(similarities)[::-1][:self.m]
            
            for j in top_m_indices:
                sim = similarities[j]
                self.graph[i].append((j, sim))
                self.graph[j].append((i, sim))
    
    def search(self, query: np.ndarray, k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        if self.embeddings is None:
            return np.array([]), np.array([])
        
        query = query.reshape(1, -1).astype(np.float32)
        query_norm = self._normalize(query)
        embeddings_norm = self._normalize(self.embeddings)
        
        similarities = np.dot(embeddings_norm, query_norm.T).flatten()
        
        top_k_indices = np.argsort(similarities)[::-1][:k]
        top_k_scores = similarities[top_k_indices]
        
        return top_k_indices, top_k_scores
    
    def _normalize(self, embeddings: np.ndarray) -> np.ndarray:
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        return embeddings / norms
    
    def save(self, path: str) -> None:
        np.savez(
            path,
            embeddings=self.embeddings,
            ids=np.array(self.ids, dtype=object)
        )
    
    def load(self, path: str) -> None:
        if not path.endswith('.npz'):
            path = path + '.npz'
        data = np.load(path, allow_pickle=True)
        self.embeddings = data['embeddings']
        self.ids = data['ids'].tolist()


class StyleVectorIndex:
    def __init__(self, config: StyleIndexConfig):
        self.config = config
        self.index = self._create_index()
        self.metadata: Dict[str, Dict] = {}
        self.style_to_items: Dict[str, List[str]] = defaultdict(list)
        self.category_to_items: Dict[str, List[str]] = defaultdict(list)
        self.occasion_to_items: Dict[str, List[str]] = defaultdict(list)
    
    def _create_index(self):
        index_type = self.config.index_type.lower()
        
        if index_type == "flat":
            return FlatIndex(self.config.embedding_dim, self.config.metric)
        elif index_type == "ivf":
            return IVFIndex(
                self.config.embedding_dim,
                self.config.n_clusters,
                self.config.n_probe
            )
        elif index_type == "hnsw":
            return HNSWIndex(
                self.config.embedding_dim,
                self.config.m,
                self.config.ef_construction,
                self.config.ef_search
            )
        else:
            return FlatIndex(self.config.embedding_dim, self.config.metric)
    
    def add_items(self, items: List[IndexedItem]) -> None:
        ids = [item.item_id for item in items]
        embeddings = np.array([item.embedding for item in items])
        
        self.index.add(ids, embeddings)
        
        for item in items:
            self.metadata[item.item_id] = {
                "category": item.category,
                "style_tags": item.style_tags,
                "color_tags": item.color_tags,
                "occasion_tags": item.occasion_tags,
                "season_tags": item.season_tags,
                "popularity_score": item.popularity_score,
                "source": item.source,
                **item.metadata
            }
            
            for style in item.style_tags:
                self.style_to_items[style].append(item.item_id)
            
            self.category_to_items[item.category].append(item.item_id)
            
            for occasion in item.occasion_tags:
                self.occasion_to_items[occasion].append(item.item_id)
        
        logger.info(f"Added {len(items)} items to index")
    
    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        indices, scores = self.index.search(query_embedding, k * 2)
        
        results = []
        for idx, score in zip(indices, scores):
            if idx >= len(self.index.ids):
                continue
            
            item_id = self.index.ids[idx]
            item_metadata = self.metadata.get(item_id, {})
            
            if filters and not self._match_filters(item_metadata, filters):
                continue
            
            results.append({
                "item_id": item_id,
                "score": float(score),
                "metadata": item_metadata
            })
            
            if len(results) >= k:
                break
        
        return results
    
    def search_by_style(
        self,
        style: str,
        query_embedding: Optional[np.ndarray] = None,
        k: int = 10
    ) -> List[Dict[str, Any]]:
        style_items = self.style_to_items.get(style, [])
        
        if not style_items:
            return []
        
        if query_embedding is not None:
            style_item_embeddings = []
            valid_ids = []
            for item_id in style_items:
                idx = self.index.ids.index(item_id)
                if idx >= 0:
                    style_item_embeddings.append(self.index.embeddings[idx])
                    valid_ids.append(item_id)
            
            if not style_item_embeddings:
                return []
            
            style_item_embeddings = np.array(style_item_embeddings)
            query_embedding = query_embedding.reshape(1, -1)
            
            similarities = np.dot(style_item_embeddings, query_embedding.T).flatten()
            top_indices = np.argsort(similarities)[::-1][:k]
            
            return [
                {
                    "item_id": valid_ids[i],
                    "score": float(similarities[i]),
                    "metadata": self.metadata.get(valid_ids[i], {})
                }
                for i in top_indices
            ]
        else:
            sorted_items = sorted(
                style_items,
                key=lambda x: self.metadata.get(x, {}).get("popularity_score", 0),
                reverse=True
            )[:k]
            
            return [
                {
                    "item_id": item_id,
                    "score": 1.0,
                    "metadata": self.metadata.get(item_id, {})
                }
                for item_id in sorted_items
            ]
    
    def search_by_category(
        self,
        category: str,
        query_embedding: np.ndarray,
        k: int = 10
    ) -> List[Dict[str, Any]]:
        category_items = self.category_to_items.get(category, [])
        
        if not category_items:
            return []
        
        category_item_embeddings = []
        valid_ids = []
        for item_id in category_items:
            idx = self.index.ids.index(item_id)
            if idx >= 0:
                category_item_embeddings.append(self.index.embeddings[idx])
                valid_ids.append(item_id)
        
        if not category_item_embeddings:
            return []
        
        category_item_embeddings = np.array(category_item_embeddings)
        query_embedding = query_embedding.reshape(1, -1)
        
        similarities = np.dot(category_item_embeddings, query_embedding.T).flatten()
        top_indices = np.argsort(similarities)[::-1][:k]
        
        return [
            {
                "item_id": valid_ids[i],
                "score": float(similarities[i]),
                "metadata": self.metadata.get(valid_ids[i], {})
            }
            for i in top_indices
        ]
    
    def hybrid_search(
        self,
        query_embedding: np.ndarray,
        style_preference: Optional[List[str]] = None,
        category_filter: Optional[str] = None,
        occasion_filter: Optional[str] = None,
        k: int = 10
    ) -> List[Dict[str, Any]]:
        base_results = self.search(query_embedding, k * 3)
        
        reranked_results = []
        for result in base_results:
            score = result["score"]
            metadata = result["metadata"]
            
            if style_preference:
                style_overlap = len(set(metadata.get("style_tags", [])) & set(style_preference))
                style_boost = style_overlap / len(style_preference) * 0.3
                score += style_boost
            
            if category_filter and metadata.get("category") != category_filter:
                score *= 0.5
            
            if occasion_filter and occasion_filter not in metadata.get("occasion_tags", []):
                score *= 0.8
            
            popularity = metadata.get("popularity_score", 0)
            popularity_boost = min(popularity / 100, 0.2)
            score += popularity_boost
            
            reranked_results.append({
                **result,
                "final_score": score
            })
        
        reranked_results.sort(key=lambda x: x["final_score"], reverse=True)
        
        return reranked_results[:k]
    
    def _match_filters(self, metadata: Dict, filters: Dict) -> bool:
        for key, value in filters.items():
            if key == "category":
                if metadata.get("category") != value:
                    return False
            elif key == "styles":
                if not any(s in metadata.get("style_tags", []) for s in value):
                    return False
            elif key == "occasions":
                if not any(o in metadata.get("occasion_tags", []) for o in value):
                    return False
            elif key == "seasons":
                if not any(s in metadata.get("season_tags", []) for s in value):
                    return False
            elif key == "colors":
                if not any(c in metadata.get("color_tags", []) for c in value):
                    return False
            elif key == "min_popularity":
                if metadata.get("popularity_score", 0) < value:
                    return False
        
        return True
    
    def get_item_embedding(self, item_id: str) -> Optional[np.ndarray]:
        try:
            idx = self.index.ids.index(item_id)
            if idx >= 0:
                return self.index.embeddings[idx]
        except ValueError:
            pass
        return None
    
    def get_similar_items(self, item_id: str, k: int = 10) -> List[Dict[str, Any]]:
        embedding = self.get_item_embedding(item_id)
        if embedding is None:
            return []
        
        return self.search(embedding, k + 1)[1:]
    
    def get_statistics(self) -> Dict[str, Any]:
        return {
            "total_items": len(self.index.ids),
            "total_styles": len(self.style_to_items),
            "total_categories": len(self.category_to_items),
            "total_occasions": len(self.occasion_to_items),
            "style_distribution": {
                style: len(items) for style, items in self.style_to_items.items()
            },
            "category_distribution": {
                cat: len(items) for cat, items in self.category_to_items.items()
            }
        }
    
    def save(self, path: Optional[str] = None) -> None:
        path = path or self.config.index_path
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        
        self.index.save(path)
        
        metadata_path = Path(path).parent / "style_metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump({
                "metadata": self.metadata,
                "style_to_items": dict(self.style_to_items),
                "category_to_items": dict(self.category_to_items),
                "occasion_to_items": dict(self.occasion_to_items),
                "config": asdict(self.config)
            }, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Saved index to {path}")
    
    def load(self, path: Optional[str] = None) -> None:
        path = path or self.config.index_path
        
        self.index.load(path)
        
        metadata_path = Path(path).parent / "style_metadata.json"
        if Path(metadata_path).exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.metadata = data.get("metadata", {})
            self.style_to_items = defaultdict(list, data.get("style_to_items", {}))
            self.category_to_items = defaultdict(list, data.get("category_to_items", {}))
            self.occasion_to_items = defaultdict(list, data.get("occasion_to_items", {}))
        
        logger.info(f"Loaded index from {path} with {len(self.index.ids)} items")


class StyleIndexService:
    def __init__(self, config: Optional[StyleIndexConfig] = None):
        self.config = config or StyleIndexConfig()
        self.index = StyleVectorIndex(self.config)
    
    def build_index_from_data(self, data_path: str) -> None:
        data_path = Path(data_path)
        
        items_file = data_path / "items.json"
        if not items_file.exists():
            logger.error(f"Items file not found: {items_file}")
            return
        
        with open(items_file, 'r', encoding='utf-8') as f:
            items_data = json.load(f)
        
        indexed_items = []
        for item_id, item in tqdm(items_data.items(), desc="Building index"):
            embedding = item.get("embedding")
            if embedding is None:
                continue
            
            indexed_items.append(IndexedItem(
                item_id=item_id,
                embedding=np.array(embedding),
                category=item.get("category", "unknown"),
                style_tags=item.get("style_tags", []),
                color_tags=item.get("color_tags", []),
                occasion_tags=item.get("occasion_tags", []),
                season_tags=item.get("season_tags", []),
                popularity_score=item.get("popularity_score", 0),
                source=item.get("source", "unknown"),
                metadata=item.get("attributes", {})
            ))
        
        self.index.add_items(indexed_items)
        self.index.save()
        
        logger.info(f"Built index with {len(indexed_items)} items")
    
    def search(
        self,
        query_embedding: np.ndarray,
        k: int = 10,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        return self.index.search(query_embedding, k, filters)
    
    def search_by_style(
        self,
        style: str,
        query_embedding: Optional[np.ndarray] = None,
        k: int = 10
    ) -> List[Dict]:
        return self.index.search_by_style(style, query_embedding, k)
    
    def hybrid_search(
        self,
        query_embedding: np.ndarray,
        style_preference: Optional[List[str]] = None,
        category_filter: Optional[str] = None,
        k: int = 10
    ) -> List[Dict]:
        return self.index.hybrid_search(
            query_embedding,
            style_preference,
            category_filter,
            k=k
        )
    
    def load_index(self, path: Optional[str] = None) -> None:
        self.index.load(path)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="风格向量索引服务")
    parser.add_argument("--action", choices=["build", "search", "stats"], default="stats")
    parser.add_argument("--data-path", default="./data/processed")
    parser.add_argument("--index-path", default="./data/indices/style_index")
    
    args = parser.parse_args()
    
    config = StyleIndexConfig(index_path=args.index_path)
    service = StyleIndexService(config)
    
    if args.action == "build":
        service.build_index_from_data(args.data_path)
    
    elif args.action == "stats":
        try:
            service.load_index()
            stats = service.index.get_statistics()
            print(json.dumps(stats, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"Index not found or empty: {e}")


if __name__ == "__main__":
    main()
