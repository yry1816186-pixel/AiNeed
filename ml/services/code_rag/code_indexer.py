"""
Code Indexer for RAG System
Indexes source code into Qdrant vector database for semantic search

Usage:
    from ml.services.code_rag import CodeIndexer

    config = CodeIndexerConfig(project_root="/path/to/AiNeed")
    indexer = CodeIndexer(config)
    indexer.build_index()          # Full index build
    indexer.incremental_update()   # Incremental update
"""

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any

import numpy as np

from .code_chunker import CodeChunker, ChunkStrategy, CodeChunk
from .qdrant_client import QdrantVectorStore, QdrantConfig, VectorDocument

logger = logging.getLogger(__name__)

CODE_COLLECTION = "aineed_code_index"
CODE_VECTOR_SIZE = 384


@dataclass
class CodeIndexerConfig:
    project_root: str = "."
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_strategy: ChunkStrategy = ChunkStrategy.FUNCTION
    max_chunk_size: int = 1500
    include_extensions: List[str] = field(default_factory=lambda: [".ts", ".tsx", ".js", ".py", ".prisma", ".md"])
    exclude_dirs: List[str] = field(default_factory=lambda: ["node_modules", "dist", "build", ".git", ".next", "__pycache__", ".venv", "models"])
    batch_size: int = 64
    device: str = "cpu"


class CodeIndexer:
    """
    Indexes source code into Qdrant for semantic retrieval.

    Pipeline:
      Source Files → CodeChunker → Text Embeddings → Qdrant Vector Store
    """

    def __init__(self, config: Optional[CodeIndexerConfig] = None):
        self.config = config or CodeIndexerConfig()
        self.chunker = CodeChunker(
            strategy=self.config.chunk_strategy,
            max_chunk_size=self.config.max_chunk_size,
        )
        self.vector_store: Optional[QdrantVectorStore] = None
        self.embedding_model = None
        self._index_metadata: Dict[str, Any] = {}

    def _init_vector_store(self):
        if self.vector_store is None:
            qdrant_config = QdrantConfig(
                host=self.config.qdrant_host,
                port=self.config.qdrant_port,
                collection_name=CODE_COLLECTION,
                vector_size=CODE_VECTOR_SIZE,
            )
            self.vector_store = QdrantVectorStore(qdrant_config)

    def _load_embedding_model(self):
        if self.embedding_model is None:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading embedding model: {self.config.embedding_model}")
            self.embedding_model = SentenceTransformer(
                self.config.embedding_model,
                device=self.config.device,
            )
            logger.info(f"Model loaded, dimension: {self.embedding_model.get_sentence_embedding_dimension()}")

    def _generate_doc_id(self, chunk: CodeChunk) -> str:
        raw = f"{chunk.file_path}:{chunk.start_line}:{chunk.end_line}:{chunk.chunk_type}:{chunk.name or ''}"
        return hashlib.md5(raw.encode()).hexdigest()[:16]

    def _chunk_to_document(self, chunk: CodeChunk, embedding: np.ndarray) -> VectorDocument:
        return VectorDocument(
            id=self._generate_doc_id(chunk),
            vector=embedding.tolist(),
            content=chunk.content,
            metadata={
                "file_path": chunk.file_path,
                "start_line": chunk.start_line,
                "end_line": chunk.end_line,
                "language": chunk.language,
                "chunk_type": chunk.chunk_type,
                "name": chunk.name or "",
                "module": self._extract_module(chunk.file_path),
                "relative_path": self._relative_path(chunk.file_path),
            },
        )

    def _extract_module(self, file_path: str) -> str:
        rel = self._relative_path(file_path)
        parts = rel.replace("\\", "/").split("/")
        if len(parts) >= 3 and parts[0] in ("apps", "ml", "packages"):
            return "/".join(parts[:3])
        return "/".join(parts[:2]) if len(parts) >= 2 else parts[0] if parts else "root"

    def _relative_path(self, file_path: str) -> str:
        try:
            return str(Path(file_path).resolve().relative_to(Path(self.config.project_root).resolve()))
        except ValueError:
            return file_path

    def build_index(self, force: bool = False) -> Dict[str, Any]:
        """
        Build full code index.

        Args:
            force: Force rebuild even if index exists

        Returns:
            Indexing statistics
        """
        start_time = time.time()
        self._init_vector_store()
        self._load_embedding_model()

        if force:
            logger.info("Force rebuild requested, deleting existing collection...")
            self.vector_store.delete_collection(CODE_COLLECTION)

        logger.info(f"Scanning project: {self.config.project_root}")
        chunks, scan_stats = self.chunker.scan_directory(
            directory=self.config.project_root,
            extensions=self.config.include_extensions,
            exclude_dirs=self.config.exclude_dirs,
        )

        if not chunks:
            logger.warning("No chunks generated, nothing to index")
            return {"status": "empty", "stats": scan_stats}

        logger.info(f"Generating embeddings for {len(chunks)} chunks...")

        texts = [self._format_chunk_for_embedding(c) for c in chunks]
        all_embeddings = self.embedding_model.encode(
            texts,
            batch_size=self.config.batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
        )

        documents = []
        for chunk, embedding in zip(chunks, all_embeddings):
            documents.append(self._chunk_to_document(chunk, embedding))

        logger.info(f"Upserting {len(documents)} documents to Qdrant collection '{CODE_COLLECTION}'...")
        upserted = self.vector_store.upsert_documents(documents, batch_size=self.config.batch_size)

        elapsed = time.time() - start_time
        result = {
            "status": "success",
            "stats": scan_stats,
            "index_stats": {
                "documents_upserted": upserted,
                "collection": CODE_COLLECTION,
                "vector_size": CODE_VECTOR_SIZE,
                "embedding_model": self.config.embedding_model,
            },
            "performance": {
                "elapsed_seconds": round(elapsed, 2),
                "chunks_per_second": round(len(chunks) / elapsed, 1) if elapsed > 0 else 0,
            },
        }

        self._index_metadata = result
        collection_info = self.vector_store.get_collection_info(CODE_COLLECTION)
        if collection_info:
            result["collection_info"] = collection_info

        logger.info(
            f"Index build complete: {upserted} documents indexed in {elapsed:.1f}s "
            f"({len(chunks) / elapsed:.0f} chunks/s)"
        )
        return result

    def incremental_update(self) -> Dict[str, Any]:
        """
        Incremental index update - only process changed files.

        Uses file modification time to detect changes.
        """
        self._init_vector_store()
        self._load_embedding_model()

        existing_docs, _ = self.vector_store.scroll_documents(limit=10000)
        existing_paths = {doc["metadata"]["file_path"]: doc for doc in existing_docs}

        chunks, scan_stats = self.chunker.scan_directory(
            directory=self.config.project_root,
            extensions=self.config.include_extensions,
            exclude_dirs=self.config.exclude_dirs,
        )

        paths_to_update = set()
        for chunk in chunks:
            if chunk.file_path not in existing_paths:
                paths_to_update.add(chunk.file_path)
            else:
                try:
                    mtime = Path(chunk.file_path).stat().st_mtime
                    stored_mtime = existing_docs[chunk.file_path]["metadata"].get("_mtime", 0)
                    if mtime > stored_mtime:
                        paths_to_update.add(chunk.file_path)
                except (FileNotFoundError, KeyError):
                    paths_to_update.add(chunk.file_path)

        if not paths_to_update:
            return {"status": "up_to_date", "updated_files": 0}

        update_chunks = [c for c in chunks if c.file_path in paths_to_update]
        old_ids = [
            doc["id"]
            for doc in existing_docs
            if doc["metadata"]["file_path"] in paths_to_update
        ]
        if old_ids:
            self.vector_store.delete_documents(old_ids)

        texts = [self._format_chunk_for_embedding(c) for c in update_chunks]
        embeddings = self.embedding_model.encode(texts, batch_size=self.config.batch_size, normalize_embeddings=True)
        documents = [self._chunk_to_document(c, e) for c, e in zip(update_chunks, embeddings)]
        upserted = self.vector_store.upsert_documents(documents, batch_size=self.config.batch_size)

        return {
            "status": "success",
            "updated_files": len(paths_to_update),
            "documents_upserted": upserted,
            "stats": scan_stats,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Get current index statistics."""
        self._init_vector_store()
        info = self.vector_store.get_collection_info(CODE_COLLECTION)
        count = self.vector_store.count_documents(CODE_COLLECTION)
        return {
            **(info or {}),
            "config": {
                "project_root": self.config.project_root,
                "embedding_model": self.config.embedding_model,
                "chunk_strategy": self.config.chunk_strategy.value,
            },
            "last_build": self._index_metadata,
        }

    @staticmethod
    def _format_chunk_for_embedding(chunk: CodeChunk) -> str:
        parts = [f"[{chunk.language}] {chunk.file_path}"]
        if chunk.name:
            parts.append(f"{chunk.chunk_type}: {chunk.name}")
        parts.append(chunk.content)
        return "\n".join(parts)
