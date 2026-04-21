import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class EvaluationSample:
    query: str
    expected_doc_ids: List[str]
    retrieved_doc_ids: List[str] = field(default_factory=list)


@dataclass
class RAGMetrics:
    precision: float = 0.0
    recall: float = 0.0
    f1: float = 0.0
    mrr: float = 0.0
    ndcg: float = 0.0


class RAGEvaluator:
    def __init__(self, **kwargs):
        logger.info("RAGEvaluator initialized")

    def evaluate(self, samples: List[EvaluationSample]) -> RAGMetrics:
        if not samples:
            return RAGMetrics()
        total_precision = 0.0
        total_recall = 0.0
        total_mrr = 0.0
        for sample in samples:
            expected = set(sample.expected_doc_ids)
            retrieved = set(sample.retrieved_doc_ids)
            if retrieved:
                total_precision += len(expected & retrieved) / len(retrieved)
            if expected:
                total_recall += len(expected & retrieved) / len(expected)
            for rank, doc_id in enumerate(sample.retrieved_doc_ids):
                if doc_id in expected:
                    total_mrr += 1.0 / (rank + 1)
                    break
        n = len(samples)
        precision = total_precision / n
        recall = total_recall / n
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        mrr = total_mrr / n
        return RAGMetrics(precision=precision, recall=recall, f1=f1, mrr=mrr)
