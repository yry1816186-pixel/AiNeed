"""
Fashion Knowledge Vectorization Script
Builds RAG index from fashion knowledge JSON
2026 Standard Implementation

Features:
- Full index building
- Incremental index updates
- Index validation and repair
- Index statistics and monitoring
"""

import os
import sys
import json
import argparse
import logging
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Set

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class IndexStateManager:
    """
    索引状态管理器

    跟踪已索引文档的状态，支持增量更新：
    - 记录每个文档的内容哈希
    - 检测文档变更
    - 管理索引版本
    """

    def __init__(self, state_dir: str = ".index_state"):
        """
        初始化状态管理器

        Args:
            state_dir: 状态文件存储目录
        """
        self.state_dir = Path(state_dir)
        self.state_dir.mkdir(parents=True, exist_ok=True)

        self.state_file = self.state_dir / "index_state.json"
        self.state: Dict[str, Any] = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        """加载索引状态"""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load index state: {e}")

        return {
            "version": "1.0",
            "last_update": None,
            "documents": {},  # {doc_id: {hash, timestamp, metadata}}
            "stats": {
                "total_documents": 0,
                "total_updates": 0
            }
        }

    def _save_state(self):
        """保存索引状态"""
        self.state["last_update"] = datetime.now().isoformat()
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2)

    def compute_content_hash(self, content: str) -> str:
        """计算内容哈希"""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def get_document_hash(self, doc_id: str) -> Optional[str]:
        """获取已存储的文档哈希"""
        doc_state = self.state["documents"].get(doc_id)
        return doc_state.get("hash") if doc_state else None

    def has_document_changed(self, doc_id: str, content: str) -> bool:
        """检查文档是否已变更"""
        stored_hash = self.get_document_hash(doc_id)
        current_hash = self.compute_content_hash(content)
        return stored_hash != current_hash

    def update_document_state(
        self,
        doc_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """更新文档状态"""
        self.state["documents"][doc_id] = {
            "hash": self.compute_content_hash(content),
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        self.state["stats"]["total_documents"] = len(self.state["documents"])
        self.state["stats"]["total_updates"] += 1
        self._save_state()

    def remove_document_state(self, doc_id: str):
        """移除文档状态"""
        if doc_id in self.state["documents"]:
            del self.state["documents"][doc_id]
            self.state["stats"]["total_documents"] = len(self.state["documents"])
            self._save_state()

    def get_all_document_ids(self) -> Set[str]:
        """获取所有已索引的文档 ID"""
        return set(self.state["documents"].keys())

    def get_stats(self) -> Dict[str, Any]:
        """获取状态统计"""
        return {
            **self.state["stats"],
            "last_update": self.state["last_update"]
        }

    def clear_state(self):
        """清空状态"""
        self.state = {
            "version": "1.0",
            "last_update": None,
            "documents": {},
            "stats": {
                "total_documents": 0,
                "total_updates": 0
            }
        }
        self._save_state()


class IncrementalIndexBuilder:
    """
    增量索引构建器

    支持增量更新索引：
    - 检测新增、修改、删除的文档
    - 只更新变更的部分
    - 保持索引一致性
    """

    def __init__(
        self,
        rag_system,
        state_manager: Optional[IndexStateManager] = None,
        batch_size: int = 100
    ):
        """
        初始化增量索引构建器

        Args:
            rag_system: RAG 系统实例
            state_manager: 状态管理器
            batch_size: 批处理大小
        """
        self.rag = rag_system
        self.state_manager = state_manager or IndexStateManager()
        self.batch_size = batch_size

    def analyze_changes(
        self,
        documents: List[Dict[str, Any]],
        id_field: str = "id",
        content_field: str = "content"
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        分析文档变更

        Args:
            documents: 文档列表
            id_field: ID 字段名
            content_field: 内容字段名

        Returns:
            {
                "added": [...],      # 新增文档
                "modified": [...],   # 修改文档
                "deleted": [...],    # 删除文档 ID
                "unchanged": [...]   # 未变更文档
            }
        """
        current_ids = set()
        changes = {
            "added": [],
            "modified": [],
            "deleted": [],
            "unchanged": []
        }

        # 检查新增和修改
        for doc in documents:
            doc_id = doc.get(id_field)
            content = doc.get(content_field, "")

            if not doc_id:
                continue

            current_ids.add(doc_id)

            if doc_id not in self.state_manager.get_all_document_ids():
                changes["added"].append(doc)
            elif self.state_manager.has_document_changed(doc_id, content):
                changes["modified"].append(doc)
            else:
                changes["unchanged"].append(doc)

        # 检查删除
        indexed_ids = self.state_manager.get_all_document_ids()
        changes["deleted"] = list(indexed_ids - current_ids)

        return changes

    def apply_incremental_update(
        self,
        documents: List[Dict[str, Any]],
        id_field: str = "id",
        content_field: str = "content",
        metadata_field: str = "metadata"
    ) -> Dict[str, Any]:
        """
        应用增量更新

        Args:
            documents: 文档列表
            id_field: ID 字段名
            content_field: 内容字段名
            metadata_field: 元数据字段名

        Returns:
            更新统计信息
        """
        logger.info("Analyzing document changes...")
        changes = self.analyze_changes(documents, id_field, content_field)

        stats = {
            "added": len(changes["added"]),
            "modified": len(changes["modified"]),
            "deleted": len(changes["deleted"]),
            "unchanged": len(changes["unchanged"]),
            "total_processed": 0,
            "errors": []
        }

        logger.info(
            f"Changes detected: {stats['added']} added, "
            f"{stats['modified']} modified, {stats['deleted']} deleted, "
            f"{stats['unchanged']} unchanged"
        )

        # 处理新增文档
        if changes["added"]:
            logger.info(f"Adding {len(changes['added'])} new documents...")
            for doc in changes["added"]:
                try:
                    self._add_document(doc, id_field, content_field, metadata_field)
                    stats["total_processed"] += 1
                except Exception as e:
                    stats["errors"].append({
                        "doc_id": doc.get(id_field),
                        "operation": "add",
                        "error": str(e)
                    })
                    logger.error(f"Failed to add document {doc.get(id_field)}: {e}")

        # 处理修改文档
        if changes["modified"]:
            logger.info(f"Updating {len(changes['modified'])} modified documents...")
            for doc in changes["modified"]:
                try:
                    self._update_document(doc, id_field, content_field, metadata_field)
                    stats["total_processed"] += 1
                except Exception as e:
                    stats["errors"].append({
                        "doc_id": doc.get(id_field),
                        "operation": "update",
                        "error": str(e)
                    })
                    logger.error(f"Failed to update document {doc.get(id_field)}: {e}")

        # 处理删除文档
        if changes["deleted"]:
            logger.info(f"Deleting {len(changes['deleted'])} removed documents...")
            for doc_id in changes["deleted"]:
                try:
                    self._delete_document(doc_id)
                    stats["total_processed"] += 1
                except Exception as e:
                    stats["errors"].append({
                        "doc_id": doc_id,
                        "operation": "delete",
                        "error": str(e)
                    })
                    logger.error(f"Failed to delete document {doc_id}: {e}")

        logger.info(f"Incremental update completed: {stats['total_processed']} documents processed")

        return stats

    def _add_document(
        self,
        doc: Dict[str, Any],
        id_field: str,
        content_field: str,
        metadata_field: str
    ):
        """添加单个文档"""
        doc_id = doc[id_field]
        content = doc.get(content_field, "")
        metadata = doc.get(metadata_field, {})

        # 调用 RAG 系统添加文档
        self.rag.add_document(
            doc_id=doc_id,
            content=content,
            metadata=metadata
        )

        # 更新状态
        self.state_manager.update_document_state(doc_id, content, metadata)

    def _update_document(
        self,
        doc: Dict[str, Any],
        id_field: str,
        content_field: str,
        metadata_field: str
    ):
        """更新单个文档"""
        doc_id = doc[id_field]
        content = doc.get(content_field, "")
        metadata = doc.get(metadata_field, {})

        # 先删除旧文档
        self.rag.delete_document(doc_id)

        # 添加新文档
        self.rag.add_document(
            doc_id=doc_id,
            content=content,
            metadata=metadata
        )

        # 更新状态
        self.state_manager.update_document_state(doc_id, content, metadata)

    def _delete_document(self, doc_id: str):
        """删除单个文档"""
        # 从索引中删除
        self.rag.delete_document(doc_id)

        # 更新状态
        self.state_manager.remove_document_state(doc_id)


def build_rag_index(
    knowledge_path: str,
    qdrant_host: str = "localhost",
    qdrant_port: int = 6333,
    collection_name: str = "fashion_knowledge",
    embedding_model: str = "patrickjohncyh/fashion-clip",
    force: bool = False,
    dry_run: bool = False,
    incremental: bool = False,
    state_dir: str = ".index_state"
):
    """
    Build RAG index from fashion knowledge

    Args:
        knowledge_path: Path to fashion_knowledge.json
        qdrant_host: Qdrant server host
        qdrant_port: Qdrant server port
        collection_name: Qdrant collection name
        embedding_model: Embedding model to use
        force: Force rebuild
        dry_run: Only validate, don't index
        incremental: Enable incremental update
        state_dir: State directory for incremental updates
    """
    from services.fashion_knowledge_rag import FashionKnowledgeRAG, FashionRAGConfig

    logger.info("=" * 60)
    logger.info("Fashion Knowledge RAG Index Builder")
    logger.info("=" * 60)

    # Check knowledge file
    knowledge_file = Path(knowledge_path)
    if not knowledge_file.exists():
        logger.error(f"Knowledge file not found: {knowledge_file}")
        return False

    # Load and validate knowledge
    with open(knowledge_file, "r", encoding="utf-8") as f:
        knowledge_data = json.load(f)

    logger.info(f"Loaded knowledge file: {knowledge_file}")
    logger.info(f"Knowledge version: {knowledge_data.get('version', 'unknown')}")

    # Count entries
    body_types = len(knowledge_data.get("body_type_rules", {}))
    color_seasons = len(knowledge_data.get("color_theory", {}).get("color_seasons", {}))
    occasions = len(knowledge_data.get("occasion_rules", {}))
    garments = sum(
        len(items) for items in knowledge_data.get("garment_knowledge", {}).values()
    )
    templates = len(knowledge_data.get("outfit_templates", {}))
    styles = len(knowledge_data.get("style_keywords", {}))

    logger.info(f"Knowledge statistics:")
    logger.info(f"  - Body types: {body_types}")
    logger.info(f"  - Color seasons: {color_seasons}")
    logger.info(f"  - Occasions: {occasions}")
    logger.info(f"  - Garments: {garments}")
    logger.info(f"  - Outfit templates: {templates}")
    logger.info(f"  - Styles: {styles}")

    if dry_run:
        logger.info("Dry run completed - knowledge file validated")
        return True

    # Create config
    config = FashionRAGConfig(
        knowledge_path=knowledge_path,
        qdrant_host=qdrant_host,
        qdrant_port=qdrant_port,
        collection_name=collection_name,
        embedding_model=embedding_model
    )

    # Initialize RAG system
    logger.info("Initializing RAG system...")
    rag = FashionKnowledgeRAG(config)

    # Build or update index
    start_time = datetime.now()

    if incremental and not force:
        # 增量更新模式
        logger.info("Running incremental index update...")
        state_manager = IndexStateManager(state_dir)
        builder = IncrementalIndexBuilder(rag, state_manager)

        # 准备文档列表
        documents = _prepare_documents_from_knowledge(knowledge_data)

        # 应用增量更新
        update_stats = builder.apply_incremental_update(documents)

        elapsed = (datetime.now() - start_time).total_seconds()
        logger.info(f"Incremental update completed in {elapsed:.2f} seconds")
        logger.info(f"Update statistics: {json.dumps(update_stats, indent=2, ensure_ascii=False)}")

    else:
        # 全量构建模式
        logger.info("Building full index...")
        success = rag.build_index(force=force)

        elapsed = (datetime.now() - start_time).total_seconds()

        if success:
            logger.info(f"Index built successfully in {elapsed:.2f} seconds")

            # 初始化状态管理器
            state_manager = IndexStateManager(state_dir)
            state_manager.clear_state()

            # 记录所有文档状态
            documents = _prepare_documents_from_knowledge(knowledge_data)
            for doc in documents:
                state_manager.update_document_state(
                    doc["id"],
                    doc.get("content", ""),
                    doc.get("metadata", {})
                )
        else:
            logger.error("Failed to build index")
            return False

    # Get stats
    stats = rag.get_stats()
    logger.info(f"Index statistics: {json.dumps(stats, indent=2, ensure_ascii=False)}")

    return True


def _prepare_documents_from_knowledge(knowledge_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    从知识数据准备文档列表

    Args:
        knowledge_data: 知识数据字典

    Returns:
        文档列表
    """
    documents = []

    # 处理体型规则
    for body_type, rules in knowledge_data.get("body_type_rules", {}).items():
        doc = {
            "id": f"body_type_{body_type}",
            "content": json.dumps(rules, ensure_ascii=False),
            "metadata": {
                "category": "body_type",
                "name": body_type,
                "type": "rule"
            }
        }
        documents.append(doc)

    # 处理色彩理论
    color_theory = knowledge_data.get("color_theory", {})
    for season, colors in color_theory.get("color_seasons", {}).items():
        doc = {
            "id": f"color_season_{season}",
            "content": json.dumps(colors, ensure_ascii=False),
            "metadata": {
                "category": "color_theory",
                "name": season,
                "type": "color_season"
            }
        }
        documents.append(doc)

    # 处理场合规则
    for occasion, rules in knowledge_data.get("occasion_rules", {}).items():
        doc = {
            "id": f"occasion_{occasion}",
            "content": json.dumps(rules, ensure_ascii=False),
            "metadata": {
                "category": "occasion",
                "name": occasion,
                "type": "rule"
            }
        }
        documents.append(doc)

    # 处理服装知识
    for category, items in knowledge_data.get("garment_knowledge", {}).items():
        for item_name, item_info in items.items():
            doc = {
                "id": f"garment_{category}_{item_name}",
                "content": json.dumps(item_info, ensure_ascii=False),
                "metadata": {
                    "category": "garment",
                    "sub_category": category,
                    "name": item_name,
                    "type": "knowledge"
                }
            }
            documents.append(doc)

    # 处理穿搭模板
    for template_id, template in knowledge_data.get("outfit_templates", {}).items():
        doc = {
            "id": f"template_{template_id}",
            "content": json.dumps(template, ensure_ascii=False),
            "metadata": {
                "category": "outfit_template",
                "name": template_id,
                "type": "template"
            }
        }
        documents.append(doc)

    # 处理风格关键词
    for style, keywords in knowledge_data.get("style_keywords", {}).items():
        doc = {
            "id": f"style_{style}",
            "content": json.dumps(keywords, ensure_ascii=False),
            "metadata": {
                "category": "style",
                "name": style,
                "type": "keywords"
            }
        }
        documents.append(doc)

    return documents


def verify_qdrant_connection(host: str, port: int) -> bool:
    """Verify Qdrant connection"""
    try:
        from services.rag.qdrant_client import QdrantVectorStore, QdrantConfig

        config = QdrantConfig(host=host, port=port)
        store = QdrantVectorStore(config)

        health = store.health_check()
        if health["connected"]:
            logger.info(f"Qdrant connection verified: {host}:{port}")
            return True
        else:
            logger.error(f"Qdrant connection failed: {health.get('error')}")
            return False

    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")
        return False


def test_search(
    knowledge_path: str,
    qdrant_host: str = "localhost",
    qdrant_port: int = 6333,
    queries: list = None
):
    """Test search functionality"""
    from services.fashion_knowledge_rag import FashionKnowledgeRAG, FashionRAGConfig

    logger.info("Testing search functionality...")

    config = FashionRAGConfig(
        knowledge_path=knowledge_path,
        qdrant_host=qdrant_host,
        qdrant_port=qdrant_port
    )

    rag = FashionKnowledgeRAG(config)

    # Build index if needed
    rag.build_index()

    # Default test queries
    if not queries:
        queries = [
            "梨形身材怎么穿搭",
            "约会穿什么",
            "春季型人适合什么颜色",
            "韩系风格的特点",
            "职场通勤穿搭建议"
        ]

    for query in queries:
        logger.info(f"\nQuery: {query}")
        results = rag.search(query, top_k=3)

        for i, result in enumerate(results):
            logger.info(f"  [{i+1}] {result['metadata'].get('name', result['id'])} (score: {result.get('score', 0):.4f})")

    return True


def validate_index(
    knowledge_path: str,
    qdrant_host: str = "localhost",
    qdrant_port: int = 6333,
    collection_name: str = "fashion_knowledge",
    state_dir: str = ".index_state"
):
    """
    验证索引完整性

    Args:
        knowledge_path: 知识文件路径
        qdrant_host: Qdrant 主机
        qdrant_port: Qdrant 端口
        collection_name: 集合名称
        state_dir: 状态目录
    """
    from services.fashion_knowledge_rag import FashionKnowledgeRAG, FashionRAGConfig

    logger.info("Validating index integrity...")

    # 加载知识数据
    knowledge_file = Path(knowledge_path)
    if not knowledge_file.exists():
        logger.error(f"Knowledge file not found: {knowledge_file}")
        return False

    with open(knowledge_file, "r", encoding="utf-8") as f:
        knowledge_data = json.load(f)

    # 准备文档列表
    expected_docs = _prepare_documents_from_knowledge(knowledge_data)
    expected_ids = {doc["id"] for doc in expected_docs}

    # 加载状态
    state_manager = IndexStateManager(state_dir)
    indexed_ids = state_manager.get_all_document_ids()

    # 比较
    missing_in_index = expected_ids - indexed_ids
    extra_in_index = indexed_ids - expected_ids

    validation_result = {
        "expected_documents": len(expected_ids),
        "indexed_documents": len(indexed_ids),
        "missing_documents": list(missing_in_index),
        "extra_documents": list(extra_in_index),
        "is_valid": len(missing_in_index) == 0 and len(extra_in_index) == 0
    }

    logger.info(f"Validation result: {json.dumps(validation_result, indent=2, ensure_ascii=False)}")

    return validation_result["is_valid"]


def main():
    parser = argparse.ArgumentParser(
        description="Fashion Knowledge RAG Index Builder"
    )

    parser.add_argument(
        "--action",
        choices=["build", "verify", "test", "validate", "incremental"],
        default="build",
        help="Action to perform"
    )

    parser.add_argument(
        "--knowledge-path",
        default=str(Path(__file__).parent.parent / "data" / "knowledge" / "fashion_knowledge.json"),
        help="Path to fashion_knowledge.json"
    )

    parser.add_argument(
        "--qdrant-host",
        default=os.getenv("QDRANT_HOST", "localhost"),
        help="Qdrant server host"
    )

    parser.add_argument(
        "--qdrant-port",
        type=int,
        default=int(os.getenv("QDRANT_PORT", "6333")),
        help="Qdrant server port"
    )

    parser.add_argument(
        "--collection",
        default="fashion_knowledge",
        help="Qdrant collection name"
    )

    parser.add_argument(
        "--embedding-model",
        default="patrickjohncyh/fashion-clip",
        help="Embedding model to use"
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rebuild index"
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate only, don't index"
    )

    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Enable incremental update mode"
    )

    parser.add_argument(
        "--state-dir",
        default=".index_state",
        help="State directory for incremental updates"
    )

    parser.add_argument(
        "--queries",
        nargs="+",
        help="Test queries for search test"
    )

    args = parser.parse_args()

    if args.action == "build":
        # Verify Qdrant connection first
        if not args.dry_run:
            if not verify_qdrant_connection(args.qdrant_host, args.qdrant_port):
                logger.error("Cannot proceed without Qdrant connection")
                sys.exit(1)

        success = build_rag_index(
            knowledge_path=args.knowledge_path,
            qdrant_host=args.qdrant_host,
            qdrant_port=args.qdrant_port,
            collection_name=args.collection,
            embedding_model=args.embedding_model,
            force=args.force,
            dry_run=args.dry_run,
            incremental=args.incremental,
            state_dir=args.state_dir
        )

        sys.exit(0 if success else 1)

    elif args.action == "incremental":
        # 增量更新模式
        if not verify_qdrant_connection(args.qdrant_host, args.qdrant_port):
            logger.error("Cannot proceed without Qdrant connection")
            sys.exit(1)

        success = build_rag_index(
            knowledge_path=args.knowledge_path,
            qdrant_host=args.qdrant_host,
            qdrant_port=args.qdrant_port,
            collection_name=args.collection,
            embedding_model=args.embedding_model,
            force=False,
            dry_run=False,
            incremental=True,
            state_dir=args.state_dir
        )

        sys.exit(0 if success else 1)

    elif args.action == "verify":
        success = verify_qdrant_connection(args.qdrant_host, args.qdrant_port)
        sys.exit(0 if success else 1)

    elif args.action == "test":
        success = test_search(
            knowledge_path=args.knowledge_path,
            qdrant_host=args.qdrant_host,
            qdrant_port=args.qdrant_port,
            queries=args.queries
        )
        sys.exit(0 if success else 1)

    elif args.action == "validate":
        success = validate_index(
            knowledge_path=args.knowledge_path,
            qdrant_host=args.qdrant_host,
            qdrant_port=args.qdrant_port,
            collection_name=args.collection,
            state_dir=args.state_dir
        )
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
