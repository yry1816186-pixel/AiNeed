"""
BM25 Sparse Retriever for Hybrid RAG
Implements Okapi BM25 algorithm for keyword-based retrieval
2026 Standard Implementation
"""

import os
import json
import logging
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from collections import Counter
import re
import math
import jieba

logger = logging.getLogger(__name__)


@dataclass
class BM25Config:
    """Configuration for BM25 retriever"""
    k1: float = 1.5  # Term frequency saturation parameter
    b: float = 0.75  # Length normalization parameter
    epsilon: float = 0.25  # IDF floor for rare terms
    index_path: Optional[str] = None


@dataclass
class BM25Document:
    """Document representation for BM25"""
    doc_id: str
    content: str
    tokens: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    term_freqs: Dict[str, int] = field(default_factory=dict)
    doc_length: int = 0


class ChineseTokenizer:
    """
    Chinese text tokenizer using jieba
    Supports mixed Chinese and English text
    """

    def __init__(self):
        # Load custom fashion vocabulary
        self._load_fashion_vocab()

    def _load_fashion_vocab(self):
        """Load fashion-specific vocabulary for better segmentation"""
        fashion_words = [
            "收腰", "V领", "A字裙", "高腰", "阔腿裤", "垫肩",
            "泡泡袖", "荷叶边", "百褶裙", "铅笔裙", "鱼尾裙",
            "裹身裙", "直筒", "休闲", "正式", "职场", "约会",
            "春季型", "夏季型", "秋季型", "冬季型", "色彩季型",
            "H型", "X型", "A型", "Y型", "O型", "沙漏", "梨形",
            "椭圆", "倒三角", "矩形", "针织衫", "衬衫", "西装",
            "牛仔裤", "连衣裙", "风衣", "开衫", "卫衣",
            "极简风", "法式慵懒", "韩系", "街头潮流", "学院风",
            "珊瑚色", "桃粉色", "薰衣草紫", "玫瑰粉", "薄荷绿",
            "驼色", "芥末黄", "砖红色", "墨绿色", "宝蓝色"
        ]

        for word in fashion_words:
            jieba.add_word(word)

    def tokenize(self, text: str) -> List[str]:
        """
        Tokenize text into tokens

        Args:
            text: Input text

        Returns:
            List of tokens
        """
        # Remove punctuation and special characters
        text = re.sub(r'[^\w\s\u4e00-\u9fff]', ' ', text)

        # Segment Chinese text
        tokens = jieba.lcut(text)

        # Filter short tokens and convert to lowercase
        tokens = [
            token.lower().strip()
            for token in tokens
            if token.strip() and len(token.strip()) > 1
        ]

        return tokens


class BM25Retriever:
    """
    BM25 Sparse Retriever

    Implements Okapi BM25 algorithm for document retrieval
    Supports Chinese text with jieba tokenization
    """

    def __init__(self, config: Optional[BM25Config] = None):
        """
        Initialize BM25 retriever

        Args:
            config: BM25 configuration
        """
        self.config = config or BM25Config()
        self.tokenizer = ChineseTokenizer()

        # Document storage
        self.documents: Dict[str, BM25Document] = {}
        self.doc_ids: List[str] = []

        # Index structures
        self.inverted_index: Dict[str, List[str]] = {}  # term -> doc_ids
        self.doc_lengths: Dict[str, int] = {}  # doc_id -> length
        self.term_doc_freqs: Dict[str, int] = {}  # term -> number of docs containing term
        self.avg_doc_length: float = 0.0
        self.total_docs: int = 0

        # IDF cache
        self._idf_cache: Dict[str, float] = {}

    def add_documents(
        self,
        documents: List[Dict[str, Any]],
        id_field: str = "id",
        content_field: str = "content"
    ) -> None:
        """
        Add documents to the index

        Args:
            documents: List of document dictionaries
            id_field: Field name for document ID
            content_field: Field name for document content
        """
        for doc in documents:
            doc_id = str(doc.get(id_field, len(self.documents)))
            content = doc.get(content_field, "")
            metadata = {k: v for k, v in doc.items() if k not in [id_field, content_field]}

            self.add_document(doc_id, content, metadata)

        self._update_avg_doc_length()
        self._calculate_idf()

        logger.info(f"Added {len(documents)} documents. Total: {self.total_docs}")

    def add_document(
        self,
        doc_id: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add a single document to the index

        Args:
            doc_id: Unique document identifier
            content: Document content
            metadata: Optional metadata dictionary
        """
        # Tokenize
        tokens = self.tokenizer.tokenize(content)

        # Create document
        doc = BM25Document(
            doc_id=doc_id,
            content=content,
            tokens=tokens,
            metadata=metadata or {},
            term_freqs=dict(Counter(tokens)),
            doc_length=len(tokens)
        )

        self.documents[doc_id] = doc
        self.doc_ids.append(doc_id)
        self.doc_lengths[doc_id] = doc.doc_length

        # Update inverted index
        for term in set(tokens):
            if term not in self.inverted_index:
                self.inverted_index[term] = []
            self.inverted_index[term].append(doc_id)

        # Update term document frequencies
        for term in set(tokens):
            self.term_doc_freqs[term] = self.term_doc_freqs.get(term, 0) + 1

        self.total_docs += 1

    def _update_avg_doc_length(self):
        """Update average document length"""
        if self.total_docs > 0:
            self.avg_doc_length = sum(self.doc_lengths.values()) / self.total_docs

    def _calculate_idf(self):
        """Calculate IDF values for all terms"""
        self._idf_cache = {}

        for term, doc_freq in self.term_doc_freqs.items():
            # Standard BM25 IDF formula
            idf = math.log((self.total_docs - doc_freq + 0.5) / (doc_freq + 0.5) + 1)

            # Apply epsilon floor for rare terms
            if idf < self.config.epsilon:
                idf = self.config.epsilon

            self._idf_cache[term] = idf

    def get_idf(self, term: str) -> float:
        """Get IDF value for a term"""
        return self._idf_cache.get(term, self.config.epsilon)

    def _score_document(self, doc_id: str, query_terms: List[str]) -> float:
        """
        Calculate BM25 score for a document given query terms

        Args:
            doc_id: Document ID
            query_terms: Tokenized query terms

        Returns:
            BM25 score
        """
        doc = self.documents.get(doc_id)
        if doc is None:
            return 0.0

        score = 0.0
        doc_length = doc.doc_length
        k1 = self.config.k1
        b = self.config.b

        for term in query_terms:
            if term not in doc.term_freqs:
                continue

            tf = doc.term_freqs[term]
            idf = self.get_idf(term)

            # BM25 term score formula
            numerator = tf * (k1 + 1)
            denominator = tf + k1 * (1 - b + b * (doc_length / self.avg_doc_length))

            score += idf * (numerator / denominator)

        return score

    def search(
        self,
        query: str,
        top_k: int = 10,
        filter_fn: Optional[callable] = None
    ) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        Search for documents matching the query

        Args:
            query: Search query
            top_k: Number of results to return
            filter_fn: Optional filter function(doc_id, metadata) -> bool

        Returns:
            List of (doc_id, score, metadata) tuples
        """
        if not query or self.total_docs == 0:
            return []

        # Tokenize query
        query_terms = self.tokenizer.tokenize(query)

        if not query_terms:
            return []

        # Find candidate documents (documents containing at least one query term)
        candidate_docs = set()
        for term in query_terms:
            if term in self.inverted_index:
                candidate_docs.update(self.inverted_index[term])

        if not candidate_docs:
            return []

        # Score candidates
        scored_docs = []
        for doc_id in candidate_docs:
            # Apply filter if provided
            if filter_fn:
                doc = self.documents.get(doc_id)
                if doc and not filter_fn(doc_id, doc.metadata):
                    continue

            score = self._score_document(doc_id, query_terms)

            if score > 0:
                metadata = self.documents[doc_id].metadata
                scored_docs.append((doc_id, score, metadata))

        # Sort by score and return top_k
        scored_docs.sort(key=lambda x: x[1], reverse=True)

        return scored_docs[:top_k]

    def get_document(self, doc_id: str) -> Optional[BM25Document]:
        """Get a document by ID"""
        return self.documents.get(doc_id)

    def get_document_content(self, doc_id: str) -> Optional[str]:
        """Get document content by ID"""
        doc = self.documents.get(doc_id)
        return doc.content if doc else None

    def save(self, path: Optional[str] = None) -> None:
        """
        Save index to disk

        Args:
            path: Path to save index (uses config.index_path if not provided)
        """
        path = path or self.config.index_path
        if path is None:
            raise ValueError("No index path specified")

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "config": self.config,
            "documents": {
                doc_id: {
                    "doc_id": doc.doc_id,
                    "content": doc.content,
                    "tokens": doc.tokens,
                    "metadata": doc.metadata,
                    "term_freqs": doc.term_freqs,
                    "doc_length": doc.doc_length
                }
                for doc_id, doc in self.documents.items()
            },
            "inverted_index": self.inverted_index,
            "doc_lengths": self.doc_lengths,
            "term_doc_freqs": self.term_doc_freqs,
            "avg_doc_length": self.avg_doc_length,
            "total_docs": self.total_docs,
            "idf_cache": self._idf_cache
        }

        with open(path, "wb") as f:
            pickle.dump(data, f)

        logger.info(f"BM25 index saved to {path}")

    def load(self, path: Optional[str] = None) -> None:
        """
        Load index from disk

        Args:
            path: Path to load index from (uses config.index_path if not provided)
        """
        path = path or self.config.index_path
        if path is None:
            raise ValueError("No index path specified")

        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Index file not found: {path}")

        with open(path, "rb") as f:
            import collections

            class RestrictedUnpickler(pickle.Unpickler):
                """Only allow safe data types from pickle."""
                SAFE_TYPES = {
                    "dict", "list", "tuple", "str", "int", "float",
                    "bool", "NoneType", "bytes", "set", "frozenset",
                }

                def find_class(self, module, name):
                    if f"{module}.{name}" in self.SAFE_TYPES or name in self.SAFE_TYPES:
                        return super().find_class(module, name)
                    raise pickle.UnpicklingError(
                        f"Global '{module}.{name}' is not allowed for security reasons"
                    )

            data = RestrictedUnpickler(f).load()

        self.config = data["config"]

        self.documents = {
            doc_id: BM25Document(**doc_data)
            for doc_id, doc_data in data["documents"].items()
        }
        self.doc_ids = list(self.documents.keys())
        self.inverted_index = data["inverted_index"]
        self.doc_lengths = data["doc_lengths"]
        self.term_doc_freqs = data["term_doc_freqs"]
        self.avg_doc_length = data["avg_doc_length"]
        self.total_docs = data["total_docs"]
        self._idf_cache = data["idf_cache"]

        logger.info(f"BM25 index loaded from {path}: {self.total_docs} documents")

    def get_stats(self) -> Dict[str, Any]:
        """Get index statistics"""
        return {
            "total_documents": self.total_docs,
            "total_terms": len(self.inverted_index),
            "avg_document_length": round(self.avg_doc_length, 2),
            "vocab_size": len(self.term_doc_freqs)
        }


class BM25RetrieverFactory:
    """Factory for creating BM25 retrievers"""

    @staticmethod
    def create_from_documents(
        documents: List[Dict[str, Any]],
        config: Optional[BM25Config] = None,
        id_field: str = "id",
        content_field: str = "content"
    ) -> BM25Retriever:
        """
        Create a BM25 retriever from a list of documents

        Args:
            documents: List of document dictionaries
            config: BM25 configuration
            id_field: Field name for document ID
            content_field: Field name for document content

        Returns:
            BM25Retriever instance
        """
        retriever = BM25Retriever(config)
        retriever.add_documents(documents, id_field, content_field)
        return retriever

    @staticmethod
    def load_or_create(
        path: str,
        documents: Optional[List[Dict[str, Any]]] = None,
        config: Optional[BM25Config] = None
    ) -> BM25Retriever:
        """
        Load existing index or create new one

        Args:
            path: Path to index file
            documents: Documents to index if creating new
            config: BM25 configuration

        Returns:
            BM25Retriever instance
        """
        config = config or BM25Config(index_path=path)
        retriever = BM25Retriever(config)

        try:
            retriever.load(path)
        except FileNotFoundError:
            if documents:
                retriever.add_documents(documents)
                retriever.save(path)
            else:
                logger.warning(f"No existing index at {path} and no documents provided")

        return retriever
