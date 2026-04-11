"""
Code RAG System for AiNeed Project
Enables cloud AI to understand local codebase through semantic search

Architecture:
  Local Codebase → Code Chunker → Embedding → Qdrant → REST API → Cloud LLM Context
"""

from .code_indexer import CodeIndexer, CodeIndexerConfig
from .code_chunker import CodeChunker, CodeChunk, ChunkStrategy
from .code_retriever import CodeRetriever, RetrievalResult

__all__ = [
    "CodeIndexer",
    "CodeIndexerConfig",
    "CodeChunker",
    "CodeChunk",
    "ChunkStrategy",
    "CodeRetriever",
    "RetrievalResult",
]
