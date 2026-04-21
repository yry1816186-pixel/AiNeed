import json
import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class BM25Document:
    doc_id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BM25Config:
    index_path: str = ""
    k1: float = 1.5
    b: float = 0.75


class BM25Retriever:
    def __init__(self, config: Optional[BM25Config] = None):
        self.config = config or BM25Config()
        self._documents: List[BM25Document] = []
        self._doc_freq: Counter = Counter()
        self._avg_dl: float = 0.0
        self._tokenized: Dict[str, List[str]] = {}
        logger.info("BM25Retriever initialized")

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\w+', text.lower())

    def index(self, documents: List[BM25Document]):
        self._documents = documents
        total_len = 0
        for doc in documents:
            tokens = self._tokenize(doc.content)
            self._tokenized[doc.doc_id] = tokens
            total_len += len(tokens)
            self._doc_freq.update(set(tokens))
        self._avg_dl = total_len / max(len(documents), 1)
        logger.info(f"Indexed {len(documents)} documents, avg_dl={self._avg_dl:.1f}")

    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        query_tokens = self._tokenize(query)
        scores = []
        N = len(self._documents)
        for doc in self._documents:
            doc_tokens = self._tokenized.get(doc.doc_id, [])
            dl = len(doc_tokens)
            score = 0.0
            token_counts = Counter(doc_tokens)
            for qt in query_tokens:
                if qt in token_counts:
                    tf = token_counts[qt]
                    df = self._doc_freq.get(qt, 0)
                    idf = math.log((N - df + 0.5) / (df + 0.5) + 1)
                    numerator = tf * (self.config.k1 + 1)
                    denominator = tf + self.config.k1 * (1 - self.config.b + self.config.b * dl / max(self._avg_dl, 1))
                    score += idf * numerator / denominator
            if score > 0:
                scores.append({"doc_id": doc.doc_id, "score": score, "content": doc.content, "metadata": doc.metadata})
        scores.sort(key=lambda x: x["score"], reverse=True)
        return scores[:top_k]
