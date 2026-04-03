"""
Fashion Knowledge RAG Service - 2026 Standard Implementation
Production-grade RAG system for fashion knowledge retrieval

Features:
- Hybrid Retrieval (BM25 + Vector)
- Reciprocal Rank Fusion (RRF)
- BGE-Reranker Integration
- RAGAS Evaluation
- Qdrant Vector Store
"""

import os
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict

# Import RAG components
from services.rag.embeddings import EmbeddingService, EmbeddingConfig
from services.rag.bm25_retriever import BM25Retriever, BM25Config, BM25Document
from services.rag.qdrant_client import QdrantVectorStore, QdrantConfig, VectorDocument
from services.rag.hybrid_retriever import (
    HybridRetriever,
    HybridRetrievalConfig,
    RetrievalResult
)
from services.rag.reranker import BGEReranker, FashionReranker, RerankerConfig
from services.rag.rag_evaluator import RAGEvaluator, RAGMetrics, EvaluationSample

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).parent.parent / "data" / "knowledge"
INDEX_DIR = Path(__file__).parent.parent / "data" / "rag_index"


@dataclass
class FashionRAGConfig:
    """Configuration for Fashion RAG System"""
    # Paths
    knowledge_path: str = str(KNOWLEDGE_DIR / "fashion_knowledge.json")
    index_dir: str = str(INDEX_DIR)

    # Embedding settings
    embedding_model: str = "patrickjohncyh/fashion-clip"
    embedding_device: str = "auto"

    # Qdrant settings
    qdrant_host: str = os.getenv("QDRANT_URL", "http://localhost:6333").replace("http://", "").split(":")[0]
    qdrant_port: int = int(os.getenv("QDRANT_URL", "http://localhost:6333").split(":")[-1].split("/")[0])
    collection_name: str = "fashion_knowledge"

    # Retrieval settings
    bm25_top_k: int = 30
    vector_top_k: int = 30
    final_top_k: int = 10

    # RRF settings
    rrf_k: int = 60
    bm25_weight: float = 0.5
    vector_weight: float = 0.5

    # Reranking
    enable_reranking: bool = True
    reranker_model: str = "BAAI/bge-reranker-base"

    # Evaluation
    enable_evaluation: bool = True


@dataclass
class KnowledgeEntry:
    """Single knowledge entry for indexing"""
    id: str
    category: str  # body_type, color_season, occasion, garment, style
    content: str
    metadata: Dict[str, Any]
    keywords: List[str] = field(default_factory=list)


# Legacy dataclasses for backward compatibility
@dataclass
class BodyTypeAdvice:
    body_type: str
    name: str
    characteristics: List[str]
    goals: List[str]
    suitable_styles: Dict[str, List[str]]
    style_tips: List[str]


@dataclass
class ColorSeasonAdvice:
    season: str
    name: str
    characteristics: List[str]
    best_colors: List[str]
    avoid_colors: List[str]
    metal: str


@dataclass
class OccasionAdvice:
    occasion: str
    name: str
    formality: str
    keywords: List[str]
    recommended: Dict[str, List[str]]
    avoid: List[str]
    tips: List[str]


@dataclass
class GarmentInfo:
    category: str
    name: str
    styles: List[str]
    occasions: List[str]
    pairing: List[str]
    tips: List[str]


class FashionKnowledgeIndexer:
    """
    Index fashion knowledge for RAG retrieval

    Converts JSON knowledge to searchable documents
    """

    def __init__(self, knowledge_data: Dict):
        self.knowledge_data = knowledge_data
        self.entries: List[KnowledgeEntry] = []

    def build_entries(self) -> List[KnowledgeEntry]:
        """Build knowledge entries from raw data"""
        self.entries = []

        # Index body type rules
        self._index_body_types()

        # Index color seasons
        self._index_color_seasons()

        # Index occasion rules
        self._index_occasions()

        # Index garment knowledge
        self._index_garments()

        # Index outfit templates
        self._index_outfit_templates()

        # Index style keywords
        self._index_style_keywords()

        logger.info(f"Built {len(self.entries)} knowledge entries")
        return self.entries

    def _index_body_types(self):
        """Index body type knowledge"""
        body_types = self.knowledge_data.get("body_type_rules", {})

        for body_type, data in body_types.items():
            # Create comprehensive content
            content_parts = [
                f"体型类型：{data.get('name', body_type)}",
                f"代码：{body_type}"
            ]

            if "characteristics" in data:
                content_parts.append(f"特征：{', '.join(data['characteristics'])}")

            if "goals" in data:
                content_parts.append(f"穿搭目标：{', '.join(data['goals'])}")

            styles = data.get("suitable_styles", {})
            for category, items in styles.items():
                if isinstance(items, list) and category != "avoid":
                    content_parts.append(f"适合的{category}：{', '.join(items)}")

            if "style_tips" in data:
                content_parts.append(f"穿搭建议：{'; '.join(data['style_tips'])}")

            # Keywords for BM25
            keywords = [
                body_type, data.get("name", ""),
                *data.get("characteristics", []),
                *data.get("goals", [])
            ]

            self.entries.append(KnowledgeEntry(
                id=f"body_type_{body_type}",
                category="body_type",
                content="\n".join(content_parts),
                metadata={
                    "body_type": body_type,
                    "name": data.get("name", body_type),
                    "characteristics": data.get("characteristics", []),
                    "goals": data.get("goals", []),
                    "suitable_styles": data.get("suitable_styles", {}),
                    "style_tips": data.get("style_tips", [])
                },
                keywords=[k for k in keywords if k]
            ))

    def _index_color_seasons(self):
        """Index color season knowledge"""
        color_theory = self.knowledge_data.get("color_theory", {})
        seasons = color_theory.get("color_seasons", {})

        for season, data in seasons.items():
            content_parts = [
                f"色彩季型：{data.get('name', season)}",
                f"代码：{season}"
            ]

            if "characteristics" in data:
                content_parts.append(f"特征：{', '.join(data['characteristics'])}")

            if "best_colors" in data:
                content_parts.append(f"最佳颜色：{', '.join(data['best_colors'])}")

            if "avoid_colors" in data:
                content_parts.append(f"避免颜色：{', '.join(data['avoid_colors'])}")

            if "metal" in data:
                content_parts.append(f"推荐饰品：{data['metal']}")

            keywords = [
                season, data.get("name", ""),
                *data.get("characteristics", []),
                *data.get("best_colors", [])
            ]

            self.entries.append(KnowledgeEntry(
                id=f"color_season_{season}",
                category="color_season",
                content="\n".join(content_parts),
                metadata={
                    "season": season,
                    "name": data.get("name", season),
                    "characteristics": data.get("characteristics", []),
                    "best_colors": data.get("best_colors", []),
                    "avoid_colors": data.get("avoid_colors", []),
                    "metal": data.get("metal", "")
                },
                keywords=[k for k in keywords if k]
            ))

    def _index_occasions(self):
        """Index occasion rules"""
        occasions = self.knowledge_data.get("occasion_rules", {})

        for occasion, data in occasions.items():
            content_parts = [
                f"场合：{data.get('name', occasion)}",
                f"代码：{occasion}",
                f"正式程度：{data.get('formality', 'medium')}"
            ]

            if "keywords" in data:
                content_parts.append(f"关键词：{', '.join(data['keywords'])}")

            recommended = data.get("recommended", {})
            for category, items in recommended.items():
                if isinstance(items, list):
                    content_parts.append(f"推荐{category}：{', '.join(items)}")

            if "avoid" in data:
                content_parts.append(f"避免：{', '.join(data['avoid'])}")

            if "tips" in data:
                content_parts.append(f"建议：{'; '.join(data['tips'])}")

            keywords = [
                occasion, data.get("name", ""),
                *data.get("keywords", [])
            ]

            self.entries.append(KnowledgeEntry(
                id=f"occasion_{occasion}",
                category="occasion",
                content="\n".join(content_parts),
                metadata={
                    "occasion": occasion,
                    "name": data.get("name", occasion),
                    "formality": data.get("formality", "medium"),
                    "keywords": data.get("keywords", []),
                    "recommended": data.get("recommended", {}),
                    "avoid": data.get("avoid", []),
                    "tips": data.get("tips", [])
                },
                keywords=[k for k in keywords if k]
            ))

    def _index_garments(self):
        """Index garment knowledge"""
        garments = self.knowledge_data.get("garment_knowledge", {})

        for category, items in garments.items():
            for garment_type, data in items.items():
                content_parts = [
                    f"服装类别：{category}",
                    f"服装类型：{data.get('name', garment_type)}",
                    f"代码：{garment_type}"
                ]

                if "styles" in data:
                    content_parts.append(f"款式：{', '.join(data['styles'])}")

                if "occasions" in data:
                    content_parts.append(f"适合场合：{', '.join(data['occasions'])}")

                if "pairing" in data:
                    content_parts.append(f"搭配建议：{', '.join(data['pairing'])}")

                if "tips" in data:
                    content_parts.append(f"小贴士：{'; '.join(data['tips'])}")

                keywords = [
                    category, garment_type, data.get("name", ""),
                    *data.get("styles", []),
                    *data.get("occasions", [])
                ]

                self.entries.append(KnowledgeEntry(
                    id=f"garment_{category}_{garment_type}",
                    category="garment",
                    content="\n".join(content_parts),
                    metadata={
                        "category": category,
                        "garment_type": garment_type,
                        "name": data.get("name", garment_type),
                        "styles": data.get("styles", []),
                        "occasions": data.get("occasions", []),
                        "pairing": data.get("pairing", []),
                        "tips": data.get("tips", [])
                    },
                    keywords=[k for k in keywords if k]
                ))

    def _index_outfit_templates(self):
        """Index outfit templates"""
        templates = self.knowledge_data.get("outfit_templates", {})

        for template_id, data in templates.items():
            content_parts = [
                f"穿搭模板：{data.get('name', template_id)}",
                f"代码：{template_id}"
            ]

            if "items" in data:
                content_parts.append(f"单品：{', '.join(data['items'])}")

            if "occasions" in data:
                content_parts.append(f"适合场合：{', '.join(data['occasions'])}")

            if "body_types" in data:
                body_types = data['body_types']
                if isinstance(body_types, list):
                    content_parts.append(f"适合体型：{', '.join(body_types)}")

            keywords = [
                template_id, data.get("name", ""),
                *data.get("occasions", []),
                *data.get("items", [])
            ]

            self.entries.append(KnowledgeEntry(
                id=f"template_{template_id}",
                category="outfit_template",
                content="\n".join(content_parts),
                metadata={
                    "template_id": template_id,
                    "name": data.get("name", template_id),
                    "items": data.get("items", []),
                    "occasions": data.get("occasions", []),
                    "body_types": data.get("body_types", [])
                },
                keywords=[k for k in keywords if k]
            ))

    def _index_style_keywords(self):
        """Index style keywords"""
        styles = self.knowledge_data.get("style_keywords", {})

        for style, data in styles.items():
            content_parts = [
                f"风格：{data.get('name', style)}",
                f"代码：{style}"
            ]

            if "keywords" in data:
                content_parts.append(f"关键词：{', '.join(data['keywords'])}")

            if "brands" in data:
                content_parts.append(f"代表品牌：{', '.join(data['brands'])}")

            if "colors" in data:
                content_parts.append(f"常用颜色：{', '.join(data['colors'])}")

            keywords = [
                style, data.get("name", ""),
                *data.get("keywords", [])
            ]

            self.entries.append(KnowledgeEntry(
                id=f"style_{style}",
                category="style",
                content="\n".join(content_parts),
                metadata={
                    "style": style,
                    "name": data.get("name", style),
                    "keywords": data.get("keywords", []),
                    "brands": data.get("brands", []),
                    "colors": data.get("colors", [])
                },
                keywords=[k for k in keywords if k]
            ))


class FashionKnowledgeRAG:
    """
    Fashion Knowledge RAG System

    Production-grade RAG implementation with:
    - Hybrid retrieval (BM25 + Vector)
    - RRF fusion
    - Reranking
    - Evaluation
    """

    def __init__(self, config: Optional[FashionRAGConfig] = None):
        """
        Initialize Fashion Knowledge RAG

        Args:
            config: RAG configuration
        """
        self.config = config or FashionRAGConfig()

        # Initialize components (lazy loading)
        self._knowledge_data: Optional[Dict] = None
        self._embedding_service: Optional[EmbeddingService] = None
        self._bm25_retriever: Optional[BM25Retriever] = None
        self._vector_store: Optional[QdrantVectorStore] = None
        self._hybrid_retriever: Optional[HybridRetriever] = None
        self._reranker = None
        self._evaluator: Optional[RAGEvaluator] = None

        # Index status
        self._is_indexed = False
        self._index_entries: List[KnowledgeEntry] = []

        # Legacy knowledge base for backward compatibility
        self._legacy_kb = None

    @property
    def knowledge_data(self) -> Dict:
        """Load knowledge data"""
        if self._knowledge_data is None:
            self._load_knowledge()
        return self._knowledge_data

    def _load_knowledge(self):
        """Load knowledge from JSON file"""
        knowledge_file = Path(self.config.knowledge_path)

        if knowledge_file.exists():
            try:
                with open(knowledge_file, "r", encoding="utf-8") as f:
                    self._knowledge_data = json.load(f)
                logger.info(f"Loaded fashion knowledge from {knowledge_file}")
            except Exception as e:
                logger.error(f"Failed to load knowledge: {e}")
                self._knowledge_data = {}
        else:
            logger.warning(f"Knowledge file not found: {knowledge_file}")
            self._knowledge_data = {}

    @property
    def embedding_service(self) -> EmbeddingService:
        """Get embedding service"""
        if self._embedding_service is None:
            self._embedding_service = EmbeddingService(
                model_type="fashion_clip",
                config=EmbeddingConfig(
                    model_name=self.config.embedding_model,
                    device=self.config.embedding_device
                )
            )
        return self._embedding_service

    @property
    def bm25_retriever(self) -> BM25Retriever:
        """Get BM25 retriever"""
        if self._bm25_retriever is None:
            index_path = Path(self.config.index_dir) / "bm25_index.pkl"
            self._bm25_retriever = BM25Retriever(BM25Config(index_path=str(index_path)))
        return self._bm25_retriever

    @property
    def vector_store(self) -> QdrantVectorStore:
        """Get Qdrant vector store"""
        if self._vector_store is None:
            self._vector_store = QdrantVectorStore(QdrantConfig(
                host=self.config.qdrant_host,
                port=self.config.qdrant_port,
                collection_name=self.config.collection_name,
                vector_size=512  # FashionCLIP dimension
            ))
        return self._vector_store

    @property
    def reranker(self):
        """Get reranker"""
        if self._reranker is None and self.config.enable_reranking:
            self._reranker = FashionReranker(
                base_reranker=BGEReranker(RerankerConfig(
                    model_name=self.config.reranker_model
                ))
            )
        return self._reranker

    @property
    def evaluator(self) -> RAGEvaluator:
        """Get RAG evaluator"""
        if self._evaluator is None and self.config.enable_evaluation:
            self._evaluator = RAGEvaluator(
                embedding_service=self.embedding_service
            )
        return self._evaluator

    def build_index(self, force: bool = False) -> bool:
        """
        Build RAG index from knowledge data

        Args:
            force: Force rebuild even if index exists

        Returns:
            True if successful
        """
        try:
            # Check if already indexed
            if self._is_indexed and not force:
                return True

            logger.info("Building fashion knowledge RAG index...")

            # Build knowledge entries
            indexer = FashionKnowledgeIndexer(self.knowledge_data)
            entries = indexer.build_entries()
            self._index_entries = entries

            # Index in BM25
            self._index_bm25(entries)

            # Index in Qdrant
            self._index_vector(entries)

            # Create hybrid retriever
            self._build_hybrid_retriever()

            self._is_indexed = True
            logger.info("Fashion knowledge RAG index built successfully")

            return True

        except Exception as e:
            logger.error(f"Failed to build index: {e}")
            return False

    def _index_bm25(self, entries: List[KnowledgeEntry]):
        """Index entries in BM25"""
        documents = [
            {
                "id": entry.id,
                "content": entry.content,
                "category": entry.category,
                **entry.metadata
            }
            for entry in entries
        ]

        self.bm25_retriever.add_documents(documents)

        # Save index
        index_path = Path(self.config.index_dir) / "bm25_index.pkl"
        index_path.parent.mkdir(parents=True, exist_ok=True)
        self.bm25_retriever.save(str(index_path))

        logger.info(f"BM25 indexed {len(documents)} documents")

    def _index_vector(self, entries: List[KnowledgeEntry]):
        """Index entries in Qdrant"""
        # Create embeddings
        contents = [entry.content for entry in entries]
        embeddings = self.embedding_service.encode_texts(contents)

        # Create vector documents
        vector_docs = [
            VectorDocument(
                id=entry.id,
                vector=embeddings[i].tolist(),
                content=entry.content,
                metadata={
                    "category": entry.category,
                    **entry.metadata
                }
            )
            for i, entry in enumerate(entries)
        ]

        # Upsert to Qdrant
        self.vector_store.create_collection()
        self.vector_store.upsert_documents(vector_docs)

        logger.info(f"Qdrant indexed {len(vector_docs)} documents")

    def _build_hybrid_retriever(self):
        """Build hybrid retriever"""
        config = HybridRetrievalConfig(
            bm25_top_k=self.config.bm25_top_k,
            vector_top_k=self.config.vector_top_k,
            final_top_k=self.config.final_top_k,
            rrf_k=self.config.rrf_k,
            bm25_weight=self.config.bm25_weight,
            vector_weight=self.config.vector_weight,
            enable_reranking=self.config.enable_reranking
        )

        self._hybrid_retriever = HybridRetriever(
            bm25_retriever=self.bm25_retriever,
            vector_store=self.vector_store,
            embedding_service=self.embedding_service,
            reranker=self.reranker,
            config=config
        )

    def search(
        self,
        query: str,
        top_k: int = 10,
        category_filter: Optional[str] = None,
        include_scores: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Search fashion knowledge

        Args:
            query: Search query
            top_k: Number of results
            category_filter: Filter by category (body_type, occasion, etc.)
            include_scores: Include relevance scores

        Returns:
            List of search results
        """
        # Ensure index is built
        if not self._is_indexed:
            self.build_index()

        if self._hybrid_retriever is None:
            self._build_hybrid_retriever()

        # Build filter conditions
        filter_conditions = None
        if category_filter:
            filter_conditions = {"category": category_filter}

        # Search
        results = self._hybrid_retriever.search(
            query=query,
            top_k=top_k,
            filter_conditions=filter_conditions
        )

        # Format results
        formatted = []
        for result in results:
            item = {
                "id": result.doc_id,
                "content": result.content,
                "metadata": result.metadata
            }
            if include_scores:
                item["score"] = result.score
                item["source"] = result.source
            formatted.append(item)

        return formatted

    def search_with_evaluation(
        self,
        query: str,
        ground_truth: Optional[str] = None,
        top_k: int = 10
    ) -> Dict[str, Any]:
        """
        Search with evaluation metrics

        Args:
            query: Search query
            ground_truth: Optional ground truth for evaluation
            top_k: Number of results

        Returns:
            Search results with evaluation metrics
        """
        start_time = time.time()

        results = self.search(query, top_k=top_k)

        retrieval_time = (time.time() - start_time) * 1000

        response = {
            "query": query,
            "results": results,
            "retrieval_time_ms": retrieval_time
        }

        # Evaluate if enabled
        if self.config.enable_evaluation and self._evaluator:
            contexts = [r["content"] for r in results]

            evaluation = self._evaluator.evaluate_rag_response(
                question=query,
                answer="",  # No answer generated yet
                contexts=contexts,
                ground_truth=ground_truth,
                latency_info={"retrieval_ms": retrieval_time}
            )

            response["evaluation"] = evaluation

        return response

    def get_context_for_stylist(
        self,
        body_type: Optional[str] = None,
        color_season: Optional[str] = None,
        occasion: Optional[str] = None,
        preferred_styles: Optional[List[str]] = None,
        query: Optional[str] = None
    ) -> str:
        """
        Get context for AI stylist

        Args:
            body_type: Body type code
            color_season: Color season code
            occasion: Occasion code
            preferred_styles: List of preferred styles
            query: Optional direct query

        Returns:
            Formatted context string
        """
        # Build search query from parameters
        search_parts = []

        if body_type:
            search_parts.append(f"体型 {body_type}")
        if color_season:
            search_parts.append(f"色彩季型 {color_season}")
        if occasion:
            search_parts.append(f"场合 {occasion}")
        if preferred_styles:
            search_parts.append(f"风格 {' '.join(preferred_styles)}")

        if query:
            search_parts.append(query)

        search_query = " ".join(search_parts) if search_parts else "穿搭建议"

        # Search for relevant knowledge
        results = self.search(search_query, top_k=10)

        # Build context
        context_parts = []

        # Group by category
        by_category: Dict[str, List] = {}
        for result in results:
            category = result["metadata"].get("category", "other")
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(result)

        # Format body type info
        if "body_type" in by_category:
            for item in by_category["body_type"]:
                meta = item["metadata"]
                context_parts.append(f"""
【体型分析 - {meta.get('name', '')}】
特征：{', '.join(meta.get('characteristics', []))}
穿搭目标：{', '.join(meta.get('goals', []))}
适合的上装：{', '.join(meta.get('suitable_styles', {}).get('tops', []))}
适合的下装：{', '.join(meta.get('suitable_styles', {}).get('bottoms', []))}
适合的裙装：{', '.join(meta.get('suitable_styles', {}).get('dresses', []))}
避免的款式：{', '.join(meta.get('suitable_styles', {}).get('avoid', []))}
穿搭建议：{'; '.join(meta.get('style_tips', []))}
""")

        # Format color season info
        if "color_season" in by_category:
            for item in by_category["color_season"]:
                meta = item["metadata"]
                context_parts.append(f"""
【色彩分析 - {meta.get('name', '')}】
特征：{', '.join(meta.get('characteristics', []))}
最佳颜色：{', '.join(meta.get('best_colors', []))}
避免颜色：{', '.join(meta.get('avoid_colors', []))}
推荐饰品：{meta.get('metal', '')}
""")

        # Format occasion info
        if "occasion" in by_category:
            for item in by_category["occasion"]:
                meta = item["metadata"]
                rec = meta.get("recommended", {})
                context_parts.append(f"""
【场合分析 - {meta.get('name', '')}】
正式程度：{meta.get('formality', 'medium')}
关键词：{', '.join(meta.get('keywords', []))}
推荐上装：{', '.join(rec.get('tops', []))}
推荐下装：{', '.join(rec.get('bottoms', []))}
推荐裙装：{', '.join(rec.get('dresses', []))}
推荐颜色：{', '.join(rec.get('colors', []))}
避免：{', '.join(meta.get('avoid', []))}
建议：{'; '.join(meta.get('tips', []))}
""")

        # Format style info
        if "style" in by_category:
            style_info = []
            for item in by_category["style"]:
                meta = item["metadata"]
                style_info.append(f"{meta.get('name', '')}：{', '.join(meta.get('keywords', []))}")

            if style_info:
                context_parts.append(f"""
【风格偏好】
{chr(10).join(style_info)}
""")

        return "\n".join(context_parts)

    # Legacy methods for backward compatibility
    def get_body_type_advice(self, body_type: str) -> Optional[BodyTypeAdvice]:
        """Get body type advice (legacy)"""
        rules = self.knowledge_data.get("body_type_rules", {})
        if body_type in rules:
            data = rules[body_type]
            return BodyTypeAdvice(
                body_type=body_type,
                name=data.get("name", body_type),
                characteristics=data.get("characteristics", []),
                goals=data.get("goals", []),
                suitable_styles=data.get("suitable_styles", {}),
                style_tips=data.get("style_tips", [])
            )
        return None

    def get_color_season_advice(self, season: str) -> Optional[ColorSeasonAdvice]:
        """Get color season advice (legacy)"""
        seasons = self.knowledge_data.get("color_theory", {}).get("color_seasons", {})
        if season in seasons:
            data = seasons[season]
            return ColorSeasonAdvice(
                season=season,
                name=data.get("name", season),
                characteristics=data.get("characteristics", []),
                best_colors=data.get("best_colors", []),
                avoid_colors=data.get("avoid_colors", []),
                metal=data.get("metal", "")
            )
        return None

    def get_occasion_advice(self, occasion: str) -> Optional[OccasionAdvice]:
        """Get occasion advice (legacy)"""
        rules = self.knowledge_data.get("occasion_rules", {})
        if occasion in rules:
            data = rules[occasion]
            return OccasionAdvice(
                occasion=occasion,
                name=data.get("name", occasion),
                formality=data.get("formality", "medium"),
                keywords=data.get("keywords", []),
                recommended=data.get("recommended", {}),
                avoid=data.get("avoid", []),
                tips=data.get("tips", [])
            )
        return None

    def get_garment_info(self, category: str, garment_type: str) -> Optional[GarmentInfo]:
        """Get garment info (legacy)"""
        garments = self.knowledge_data.get("garment_knowledge", {}).get(category, {})
        if garment_type in garments:
            data = garments[garment_type]
            return GarmentInfo(
                category=category,
                name=data.get("name", garment_type),
                styles=data.get("styles", data.get("occasions", [])),
                occasions=data.get("occasions", []),
                pairing=data.get("pairing", []),
                tips=data.get("tips", [])
            )
        return None

    def get_outfit_templates(self, occasion: str = None) -> List[Dict]:
        """Get outfit templates (legacy)"""
        templates = self.knowledge_data.get("outfit_templates", {})
        if occasion:
            return [
                t for t in templates.values()
                if occasion in t.get("occasions", [])
            ]
        return list(templates.values())

    def get_style_keywords(self, style: str) -> Optional[Dict]:
        """Get style keywords (legacy)"""
        styles = self.knowledge_data.get("style_keywords", {})
        return styles.get(style)

    def get_color_combinations(self, scenario: str = "classic") -> List[List[str]]:
        """Get color combinations (legacy)"""
        return self.knowledge_data.get("color_theory", {}).get("color_combinations", {}).get(scenario, [])

    def build_context_for_stylist(
        self,
        body_type: str = None,
        color_season: str = None,
        occasion: str = None,
        preferred_styles: List[str] = None
    ) -> str:
        """Build context for stylist (legacy, uses new implementation)"""
        return self.get_context_for_stylist(
            body_type=body_type,
            color_season=color_season,
            occasion=occasion,
            preferred_styles=preferred_styles
        )

    def generate_outfit_suggestion(
        self,
        body_type: str,
        occasion: str,
        color_season: str = None,
        preferred_styles: List[str] = None
    ) -> Dict[str, Any]:
        """Generate outfit suggestion"""
        result = {
            "body_type_advice": None,
            "occasion_advice": None,
            "color_advice": None,
            "recommended_items": [],
            "tips": []
        }

        body_advice = self.get_body_type_advice(body_type)
        if body_advice:
            result["body_type_advice"] = {
                "name": body_advice.name,
                "suitable_styles": body_advice.suitable_styles,
                "style_tips": body_advice.style_tips
            }
            result["tips"].extend(body_advice.style_tips)

        occasion_advice = self.get_occasion_advice(occasion)
        if occasion_advice:
            result["occasion_advice"] = {
                "name": occasion_advice.name,
                "recommended": occasion_advice.recommended,
                "tips": occasion_advice.tips
            }
            result["tips"].extend(occasion_advice.tips)

        if color_season:
            color_advice = self.get_color_season_advice(color_season)
            if color_advice:
                result["color_advice"] = {
                    "name": color_advice.name,
                    "best_colors": color_advice.best_colors,
                    "avoid_colors": color_advice.avoid_colors
                }

        templates = self.get_outfit_templates(occasion)
        if templates:
            result["outfit_templates"] = templates

        return result

    def get_stats(self) -> Dict[str, Any]:
        """Get RAG system statistics"""
        stats = {
            "is_indexed": self._is_indexed,
            "total_entries": len(self._index_entries),
            "categories": {}
        }

        if self._index_entries:
            from collections import Counter
            categories = Counter(e.category for e in self._index_entries)
            stats["categories"] = dict(categories)

        if self._bm25_retriever:
            stats["bm25"] = self._bm25_retriever.get_stats()

        if self._vector_store:
            qdrant_info = self._vector_store.get_collection_info()
            if qdrant_info:
                stats["qdrant"] = qdrant_info

        return stats


# Global instance
_fashion_rag: Optional[FashionKnowledgeRAG] = None


def get_fashion_rag(config: Optional[FashionRAGConfig] = None) -> FashionKnowledgeRAG:
    """Get Fashion RAG singleton"""
    global _fashion_rag
    if _fashion_rag is None:
        _fashion_rag = FashionKnowledgeRAG(config)
    return _fashion_rag


# Legacy compatibility
knowledge_base: Optional[FashionKnowledgeRAG] = None


class FashionKnowledgeBase(FashionKnowledgeRAG):
    """Legacy alias for backward compatibility"""

    def __init__(self, knowledge_dir: Path = None):
        config = FashionRAGConfig()
        if knowledge_dir:
            config.knowledge_path = str(knowledge_dir / "fashion_knowledge.json")
        super().__init__(config)


def get_knowledge_base() -> FashionKnowledgeBase:
    """Get knowledge base singleton (legacy)"""
    global knowledge_base
    if knowledge_base is None:
        knowledge_base = FashionKnowledgeBase()
    return knowledge_base
