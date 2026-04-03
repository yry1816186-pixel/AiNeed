"""
Code Retriever for RAG System
Queries indexed code from Qdrant with filtering support

Designed to be called by NestJS backend API to serve cloud AI context requests.
"""

import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from pathlib import Path

import numpy as np

from .qdrant_client import QdrantVectorStore, QdrantConfig

logger = logging.getLogger(__name__)
CODE_COLLECTION = "aineed_code_index"
CODE_VECTOR_SIZE = 384


@dataclass
class RetrievalResult:
    id: str
    content: str
    file_path: str
    start_line: int
    end_line: int
    language: str
    chunk_type: str
    name: Optional[str]
    module: str
    score: float

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "file_path": self.file_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "language": self.language,
            "chunk_type": self.chunk_type,
            "name": self.name,
            "module": self.module,
            "score": round(float(self.score), 4),
        }

    def to_context_string(self, max_chars: int = 2000) -> str:
        truncated = self.content[:max_chars]
        if len(self.content) > max_chars:
            truncated += "\n... (truncated)"
        return (
            f"## {self.file_path} (L{self.start_line}-{self.end_line}) "
            f"[{self.chunk_type}" + (f": {self.name}" if self.name else "") + f"] score={self.score:.2f}\n"
            f"```\n{truncated}\n```"
        )


class CodeRetriever:
    """
    Retrieves relevant code snippets from the indexed codebase.

    Usage:
        retriever = CodeRetriever(qdrant_host="localhost", qdrant_port=6333)
        results = retriever.search("user authentication login JWT")
        context = retriever.format_context_for_llm(results)
    """

    def __init__(
        self,
        qdrant_host: str = "localhost",
        qdrant_port: int = 6333,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        device: str = "cpu",
    ):
        self.qdrant_host = qdrant_host
        self.qdrant_port = qdrant_port
        self.embedding_model_name = embedding_model
        self.device = device
        self._vector_store: Optional[QdrantVectorStore] = None
        self._embedding_model = None

    def _get_vector_store(self) -> QdrantVectorStore:
        if self._vector_store is None:
            config = QdrantConfig(
                host=self.qdrant_host,
                port=self.qdrant_port,
                collection_name=CODE_COLLECTION,
                vector_size=CODE_VECTOR_SIZE,
            )
            self._vector_store = QdrantVectorStore(config)
        return self._vector_store

    def _get_embedding_model(self):
        if self._embedding_model is None:
            from sentence_transformers import SentenceTransformer

            self._embedding_model = SentenceTransformer(self.embedding_model_name, device=self.device)
        return self._embedding_model

    def search(
        self,
        query: str,
        top_k: int = 10,
        filter_module: Optional[str] = None,
        filter_language: Optional[str] = None,
        filter_path_contains: Optional[str] = None,
        filter_chunk_type: Optional[str] = None,
        min_score: float = 0.0,
    ) -> List[RetrievalResult]:
        """
        Search for relevant code chunks.

        Args:
            query: Natural language query about the code
            top_k: Number of results to return
            filter_module: Filter by module path (e.g., 'apps/backend/src/modules/auth')
            filter_language: Filter by programming language
            filter_path_contains: Filter by substring in file path
            filter_chunk_type: Filter by chunk type (function, class, file, etc.)
            min_score: Minimum similarity score threshold

        Returns:
            List of ranked retrieval results
        """
        store = self._get_vector_store()
        model = self._get_embedding_model()

        conditions = {}
        if filter_module:
            conditions["module"] = filter_module
        if filter_language:
            conditions["language"] = filter_language.lower()
        if filter_chunk_type:
            conditions["chunk_type"] = filter_chunk_type.lower()

        raw_results = store.search_by_text(
            query_text=query,
            embedding_service=model,
            top_k=top_k * 3,
            filter_conditions=conditions if conditions else None,
        )

        results = []
        for r in raw_results:
            if filter_path_contains and filter_path_contains not in r.get("metadata", {}).get("file_path", ""):
                continue
            if r["score"] < min_score:
                continue
            meta = r.get("metadata", {})
            results.append(
                RetrievalResult(
                    id=r["id"],
                    content=r["content"],
                    file_path=meta.get("file_path", ""),
                    start_line=meta.get("start_line", 0),
                    end_line=meta.get("end_line", 0),
                    language=meta.get("language", ""),
                    chunk_type=meta.get("chunk_type", ""),
                    name=meta.get("name") or None,
                    module=meta.get("module", ""),
                    score=r["score"],
                )
            )
            if len(results) >= top_k:
                break

        return results

    def get_file_context(self, file_path: str, context_lines: int = 20) -> Optional[Dict[str, Any]]:
        """Get all indexed chunks for a specific file."""
        store = self._get_vector_store()
        results = store.search_by_text(
            query_text=file_path,
            embedding_service=self._get_embedding_model(),
            top_k=50,
            filter_conditions={"file_path": file_path},
        )
        if not results:
            return None

        sorted_results = sorted(results, key=lambda x: x.get("metadata", {}).get("start_line", 0))
        return {
            "file_path": file_path,
            "chunks": sorted_results,
            "total_chunks": len(sorted_results),
            "line_range": (
                min(r["metadata"]["start_line"] for r in sorted_results),
                max(r["metadata"]["end_line"] for r in sorted_results),
            ),
        }

    def get_module_overview(self, module_path: str) -> Dict[str, Any]:
        """Get an overview of a specific module's indexed code."""
        store = self._get_vector_store()
        try:
            info = store.scroll_documents(limit=1000)
            all_docs = info[0]
        except Exception:
            all_docs = []

        module_docs = [d for d in all_docs if d.get("metadata", {}).get("module", "") == module_path]
        if not module_docs:
            return {"module": module_path, "files": [], "total_chunks": 0}

        files = {}
        for doc in module_docs:
            fp = doc.get("metadata", {}).get("file_path", "")
            if fp not in files:
                files[fp] = {"chunks": [], "languages": set()}
            files[fp]["chunks"].append(doc)
            files[fp]["languages"].add(doc.get("metadata", {}).get("language", ""))

        return {
            "module": module_path,
            "total_chunks": len(module_docs),
            "files": {
                fp: {
                    "chunk_count": len(data["chunks"]),
                    "languages": list(data["languages"]),
                    "line_range": (
                        min(c["metadata"]["start_line"] for c in data["chunks"]),
                        max(c["metadata"]["end_line"] for c in data["chunks"]),
                    ),
                }
                for fp, data in files.items()
            },
        }

    def format_context_for_llm(
        self,
        results: List[RetrievalResult],
        include_metadata: bool = True,
        max_total_chars: int = 8000,
    ) -> str:
        """
        Format retrieval results as a context string suitable for LLM prompt injection.

        This is the key method that bridges code RAG to any Cloud LLM.
        """
        if not results:
            return ""

        sections = []
        total_chars = 0
        header = f"# Relevant Code Context ({len(results)} matches found)\n\n"
        sections.append(header)
        total_chars += len(header)

        for i, result in enumerate(results):
            ctx_str = result.to_context_string(max_chars=max_total_chars // max(len(results), 1))
            if total_chars + len(ctx_str) > max_total_chars:
                sections.append(f"\n<!-- Context truncated at {max_total_chars} chars -->")
                break
            sections.append(f"\n### Match {i + 1}\n{ctx_str}\n")
            total_chars += len(ctx_str)

        return "".join(sections)

    def get_project_summary(self) -> Dict[str, Any]:
        """Get a high-level summary of the indexed project."""
        store = self._get_vector_store()
        count = store.count_documents(CODE_COLLECTION)
        collection_info = store.get_collection_info(CODE_COLLECTION)

        languages = {}
        modules = {}
        chunk_types = {}

        try:
            docs, _ = store.scroll_documents(limit=min(count, 5000))
            for doc in docs:
                meta = doc.get("metadata", {})
                lang = meta.get("language", "unknown")
                mod = meta.get("module", "unknown")
                ct = meta.get("chunk_type", "unknown")
                languages[lang] = languages.get(lang, 0) + 1
                modules[mod] = modules.get(mod, 0) + 1
                chunk_types[ct] = chunk_types.get(ct, 0) + 1
        except Exception as e:
            logger.warning(f"Failed to gather summary stats: {e}")

        return {
            "total_code_chunks": count,
            "collection_info": collection_info,
            "languages": dict(sorted(languages.items(), key=lambda x: -x[1])),
            "top_modules": dict(sorted(modules.items(), key=lambda x: -x[1])[:15]),
            "chunk_types": chunk_types,
        }
