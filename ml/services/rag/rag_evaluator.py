"""
RAG Evaluation Module using RAGAS framework
Implements faithfulness, answer relevancy, context recall, and context precision
2026 Standard Implementation
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class RAGMetrics:
    """RAG evaluation metrics"""
    faithfulness: float = 0.0
    answer_relevancy: float = 0.0
    context_recall: float = 0.0
    context_precision: float = 0.0
    answer_similarity: float = 0.0
    answer_correctness: float = 0.0

    # Additional metrics
    retrieval_latency: float = 0.0
    generation_latency: float = 0.0
    total_latency: float = 0.0

    def to_dict(self) -> Dict[str, float]:
        return {
            "faithfulness": self.faithfulness,
            "answer_relevancy": self.answer_relevancy,
            "context_recall": self.context_recall,
            "context_precision": self.context_precision,
            "answer_similarity": self.answer_similarity,
            "answer_correctness": self.answer_correctness,
            "retrieval_latency_ms": self.retrieval_latency,
            "generation_latency_ms": self.generation_latency,
            "total_latency_ms": self.total_latency
        }

    @property
    def harmonic_mean(self) -> float:
        """Calculate harmonic mean of main metrics"""
        main_metrics = [
            self.faithfulness,
            self.answer_relevancy,
            self.context_recall,
            self.context_precision
        ]

        # Filter out zeros
        valid_metrics = [m for m in main_metrics if m > 0]

        if not valid_metrics:
            return 0.0

        n = len(valid_metrics)
        return n / sum(1.0 / m for m in valid_metrics)


@dataclass
class EvaluationSample:
    """Single evaluation sample"""
    question: str
    answer: str
    contexts: List[str]
    ground_truth: Optional[str] = None
    retrieved_doc_ids: List[str] = field(default_factory=list)
    relevant_doc_ids: List[str] = field(default_factory=list)


class BaseMetric(ABC):
    """Abstract base class for RAG metrics"""

    @abstractmethod
    def compute(
        self,
        sample: EvaluationSample,
        **kwargs
    ) -> float:
        """Compute metric for a sample"""
        pass


class FaithfulnessMetric(BaseMetric):
    """
    Faithfulness Metric

    Measures how faithfully the answer is generated from the retrieved context.
    Higher score means the answer is well-grounded in the context.
    """

    def __init__(self, llm_client=None, threshold: float = 0.5):
        """
        Args:
            llm_client: LLM client for NLI-based evaluation
            threshold: Threshold for statement verification
        """
        self.llm_client = llm_client
        self.threshold = threshold

    def compute(
        self,
        sample: EvaluationSample,
        **kwargs
    ) -> float:
        """
        Compute faithfulness score

        Steps:
        1. Extract statements from the answer
        2. Verify each statement against context
        3. Calculate ratio of verified statements
        """
        if not sample.answer or not sample.contexts:
            return 0.0

        # If LLM available, use NLI-based evaluation
        if self.llm_client:
            return self._compute_with_llm(sample)

        # Fallback: keyword-based verification
        return self._compute_keyword_based(sample)

    def _compute_with_llm(self, sample: EvaluationSample) -> float:
        """Compute using LLM for statement verification"""
        try:
            # Extract statements from answer
            prompt = f"""请从以下回答中提取出所有陈述性语句，每行一条：

回答：{sample.answer}

陈述语句："""

            response = self.llm_client.generate(prompt)
            statements = [s.strip() for s in response.split("\n") if s.strip()]

            if not statements:
                return 1.0  # No statements to verify

            # Verify each statement
            verified_count = 0
            context_text = "\n".join(sample.contexts)

            for statement in statements:
                verify_prompt = f"""判断以下陈述是否能从给定上下文中推导出来。

上下文：{context_text}

陈述：{statement}

如果能从上下文推导，回答"是"；否则回答"否"。只回答"是"或"否"。"""

                result = self.llm_client.generate(verify_prompt).strip()
                if "是" in result:
                    verified_count += 1

            return verified_count / len(statements)

        except Exception as e:
            logger.error(f"LLM-based faithfulness computation failed: {e}")
            return self._compute_keyword_based(sample)

    def _compute_keyword_based(self, sample: EvaluationSample) -> float:
        """Compute using keyword overlap (fallback)"""
        import jieba

        # Tokenize
        answer_tokens = set(jieba.lcut(sample.answer))
        context_tokens = set()

        for context in sample.contexts:
            context_tokens.update(jieba.lcut(context))

        # Filter stop words and short tokens
        answer_tokens = {t for t in answer_tokens if len(t) > 1}
        context_tokens = {t for t in context_tokens if len(t) > 1}

        if not answer_tokens:
            return 1.0

        # Calculate overlap
        overlap = answer_tokens & context_tokens
        return len(overlap) / len(answer_tokens)


class AnswerRelevancyMetric(BaseMetric):
    """
    Answer Relevancy Metric

    Measures how relevant the answer is to the question.
    Uses embedding similarity or LLM evaluation.
    """

    def __init__(self, embedding_service=None, llm_client=None):
        """
        Args:
            embedding_service: Service for computing embeddings
            llm_client: LLM client for evaluation
        """
        self.embedding_service = embedding_service
        self.llm_client = llm_client

    def compute(
        self,
        sample: EvaluationSample,
        **kwargs
    ) -> float:
        """Compute answer relevancy"""
        if not sample.answer or not sample.question:
            return 0.0

        if self.embedding_service:
            return self._compute_with_embeddings(sample)

        if self.llm_client:
            return self._compute_with_llm(sample)

        return self._compute_keyword_based(sample)

    def _compute_with_embeddings(self, sample: EvaluationSample) -> float:
        """Compute using embedding similarity"""
        try:
            import numpy as np

            question_emb = self.embedding_service.encode_text(sample.question)
            answer_emb = self.embedding_service.encode_text(sample.answer)

            # Cosine similarity
            similarity = np.dot(question_emb, answer_emb) / (
                np.linalg.norm(question_emb) * np.linalg.norm(answer_emb)
            )

            # Normalize to [0, 1]
            return (similarity + 1) / 2

        except Exception as e:
            logger.error(f"Embedding-based relevancy failed: {e}")
            return self._compute_keyword_based(sample)

    def _compute_with_llm(self, sample: EvaluationSample) -> float:
        """Compute using LLM scoring"""
        try:
            prompt = f"""请评估以下回答与问题的相关程度，给出0-10的分数。

问题：{sample.question}

回答：{sample.answer}

相关程度分数（0-10）："""

            response = self.llm_client.generate(prompt)

            # Extract score
            import re
            match = re.search(r'(\d+(?:\.\d+)?)', response)
            if match:
                score = float(match.group(1))
                return min(score / 10, 1.0)

            return 0.5

        except Exception as e:
            logger.error(f"LLM-based relevancy failed: {e}")
            return 0.5

    def _compute_keyword_based(self, sample: EvaluationSample) -> float:
        """Compute using keyword overlap"""
        import jieba

        question_tokens = set(jieba.lcut(sample.question))
        answer_tokens = set(jieba.lcut(sample.answer))

        # Filter short tokens
        question_tokens = {t for t in question_tokens if len(t) > 1}
        answer_tokens = {t for t in answer_tokens if len(t) > 1}

        if not question_tokens:
            return 0.5

        overlap = question_tokens & answer_tokens
        return len(overlap) / len(question_tokens)


class ContextRecallMetric(BaseMetric):
    """
    Context Recall Metric

    Measures how much of the ground truth is covered by retrieved contexts.
    Requires ground truth to be provided.
    """

    def __init__(self, llm_client=None):
        self.llm_client = llm_client

    def compute(
        self,
        sample: EvaluationSample,
        **kwargs
    ) -> float:
        """Compute context recall"""
        if not sample.ground_truth or not sample.contexts:
            return 0.0

        if self.llm_client:
            return self._compute_with_llm(sample)

        return self._compute_keyword_based(sample)

    def _compute_with_llm(self, sample: EvaluationSample) -> float:
        """Compute using LLM"""
        try:
            context_text = "\n".join(sample.contexts)

            prompt = f"""请评估参考信息在检索上下文中的覆盖程度。

参考信息（正确答案）：{sample.ground_truth}

检索上下文：{context_text}

请给出0-1之间的覆盖分数（0=完全不覆盖，1=完全覆盖）："""

            response = self.llm_client.generate(prompt)

            import re
            match = re.search(r'(\d+(?:\.\d+)?)', response)
            if match:
                score = float(match.group(1))
                return min(max(score, 0), 1)

            return 0.5

        except Exception as e:
            logger.error(f"LLM-based context recall failed: {e}")
            return self._compute_keyword_based(sample)

    def _compute_keyword_based(self, sample: EvaluationSample) -> float:
        """Compute using keyword overlap"""
        import jieba

        truth_tokens = set(jieba.lcut(sample.ground_truth))
        context_tokens = set()

        for context in sample.contexts:
            context_tokens.update(jieba.lcut(context))

        # Filter
        truth_tokens = {t for t in truth_tokens if len(t) > 1}
        context_tokens = {t for t in context_tokens if len(t) > 1}

        if not truth_tokens:
            return 0.5

        overlap = truth_tokens & context_tokens
        return len(overlap) / len(truth_tokens)


class ContextPrecisionMetric(BaseMetric):
    """
    Context Precision Metric

    Measures the precision of retrieved contexts.
    Uses retrieved and relevant document IDs.
    """

    def compute(
        self,
        sample: EvaluationSample,
        **kwargs
    ) -> float:
        """Compute context precision"""
        if not sample.retrieved_doc_ids:
            return 0.0

        if sample.relevant_doc_ids:
            # Use document IDs for calculation
            retrieved_set = set(sample.retrieved_doc_ids)
            relevant_set = set(sample.relevant_doc_ids)

            true_positives = len(retrieved_set & relevant_set)
            return true_positives / len(retrieved_set)

        # Fallback: estimate from contexts
        return self._estimate_precision(sample)

    def _estimate_precision(self, sample: EvaluationSample) -> float:
        """Estimate precision when relevant docs are not specified"""
        # Simple heuristic: non-empty contexts with meaningful content
        if not sample.contexts:
            return 0.0

        meaningful_contexts = 0
        for context in sample.contexts:
            # Check if context has meaningful content
            if len(context.strip()) > 20:
                meaningful_contexts += 1

        return meaningful_contexts / len(sample.contexts)


class RAGEvaluator:
    """
    RAG System Evaluator

    Implements RAGAS-style evaluation for RAG systems
    """

    def __init__(
        self,
        embedding_service=None,
        llm_client=None,
        config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize RAG evaluator

        Args:
            embedding_service: Service for embeddings
            llm_client: LLM client for evaluation
            config: Optional configuration
        """
        self.embedding_service = embedding_service
        self.llm_client = llm_client
        self.config = config or {}

        # Initialize metrics
        self.metrics = {
            "faithfulness": FaithfulnessMetric(llm_client),
            "answer_relevancy": AnswerRelevancyMetric(embedding_service, llm_client),
            "context_recall": ContextRecallMetric(llm_client),
            "context_precision": ContextPrecisionMetric()
        }

        # Evaluation history
        self.evaluation_history: List[Dict[str, Any]] = []

    def evaluate_sample(
        self,
        sample: EvaluationSample,
        metrics: Optional[List[str]] = None
    ) -> RAGMetrics:
        """
        Evaluate a single sample

        Args:
            sample: Evaluation sample
            metrics: List of metrics to compute (all if None)

        Returns:
            RAGMetrics object with computed values
        """
        metrics = metrics or list(self.metrics.keys())
        result = RAGMetrics()

        for metric_name in metrics:
            if metric_name in self.metrics:
                try:
                    score = self.metrics[metric_name].compute(sample)
                    setattr(result, metric_name, score)
                except Exception as e:
                    logger.error(f"Failed to compute {metric_name}: {e}")

        return result

    def evaluate_batch(
        self,
        samples: List[EvaluationSample],
        metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a batch of samples

        Args:
            samples: List of evaluation samples
            metrics: Metrics to compute

        Returns:
            Dictionary with aggregate metrics and per-sample results
        """
        all_metrics = []

        for sample in samples:
            sample_metrics = self.evaluate_sample(sample, metrics)
            all_metrics.append(sample_metrics)

        # Calculate aggregate metrics
        aggregate = RAGMetrics()

        if all_metrics:
            aggregate.faithfulness = np.mean([m.faithfulness for m in all_metrics])
            aggregate.answer_relevancy = np.mean([m.answer_relevancy for m in all_metrics])
            aggregate.context_recall = np.mean([m.context_recall for m in all_metrics])
            aggregate.context_precision = np.mean([m.context_precision for m in all_metrics])

        # Record evaluation
        evaluation_record = {
            "timestamp": datetime.now().isoformat(),
            "num_samples": len(samples),
            "aggregate_metrics": aggregate.to_dict(),
            "per_sample_metrics": [m.to_dict() for m in all_metrics]
        }

        self.evaluation_history.append(evaluation_record)

        return {
            "aggregate": aggregate.to_dict(),
            "per_sample": [m.to_dict() for m in all_metrics],
            "harmonic_mean": aggregate.harmonic_mean
        }

    def evaluate_rag_response(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        ground_truth: Optional[str] = None,
        retrieved_doc_ids: Optional[List[str]] = None,
        relevant_doc_ids: Optional[List[str]] = None,
        latency_info: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a RAG response

        Args:
            question: User question
            answer: Generated answer
            contexts: Retrieved contexts
            ground_truth: Optional ground truth answer
            retrieved_doc_ids: IDs of retrieved documents
            relevant_doc_ids: IDs of actually relevant documents
            latency_info: Latency information

        Returns:
            Evaluation results
        """
        sample = EvaluationSample(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth,
            retrieved_doc_ids=retrieved_doc_ids or [],
            relevant_doc_ids=relevant_doc_ids or []
        )

        metrics = self.evaluate_sample(sample)

        # Add latency info
        if latency_info:
            metrics.retrieval_latency = latency_info.get("retrieval_ms", 0)
            metrics.generation_latency = latency_info.get("generation_ms", 0)
            metrics.total_latency = latency_info.get("total_ms", 0)

        return {
            "metrics": metrics.to_dict(),
            "harmonic_mean": metrics.harmonic_mean
        }

    def generate_evaluation_report(
        self,
        save_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive evaluation report

        Args:
            save_path: Optional path to save report

        Returns:
            Report dictionary
        """
        if not self.evaluation_history:
            return {"error": "No evaluation history available"}

        # Aggregate all evaluations
        all_aggregates = [e["aggregate_metrics"] for e in self.evaluation_history]

        report = {
            "report_timestamp": datetime.now().isoformat(),
            "total_evaluations": len(self.evaluation_history),
            "total_samples": sum(e["num_samples"] for e in self.evaluation_history),
            "overall_metrics": {
                "avg_faithfulness": np.mean([m["faithfulness"] for m in all_aggregates]),
                "avg_answer_relevancy": np.mean([m["answer_relevancy"] for m in all_aggregates]),
                "avg_context_recall": np.mean([m["context_recall"] for m in all_aggregates]),
                "avg_context_precision": np.mean([m["context_precision"] for m in all_aggregates])
            },
            "evaluation_history": self.evaluation_history
        }

        if save_path:
            with open(save_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)

        return report

    def clear_history(self):
        """Clear evaluation history"""
        self.evaluation_history = []


class OnlineEvaluator:
    """
    Online Evaluation for production RAG systems

    Collects and evaluates RAG responses in real-time
    """

    def __init__(
        self,
        evaluator: RAGEvaluator,
        sample_rate: float = 1.0,
        max_samples: int = 1000
    ):
        """
        Args:
            evaluator: RAG evaluator instance
            sample_rate: Rate at which to sample requests (0-1)
            max_samples: Maximum samples to keep in memory
        """
        self.evaluator = evaluator
        self.sample_rate = sample_rate
        self.max_samples = max_samples

        self.samples: List[EvaluationSample] = []
        self.metrics_buffer: List[RAGMetrics] = []

    def should_evaluate(self) -> bool:
        """Determine if current request should be evaluated"""
        import random
        return random.random() < self.sample_rate

    def record_and_evaluate(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Record and optionally evaluate a RAG response

        Args:
            question: User question
            answer: Generated answer
            contexts: Retrieved contexts
            **kwargs: Additional arguments

        Returns:
            Evaluation results if sampled, None otherwise
        """
        if not self.should_evaluate():
            return None

        sample = EvaluationSample(
            question=question,
            answer=answer,
            contexts=contexts,
            **kwargs
        )

        self.samples.append(sample)

        # Trim if over limit
        if len(self.samples) > self.max_samples:
            self.samples = self.samples[-self.max_samples:]

        metrics = self.evaluator.evaluate_sample(sample)
        self.metrics_buffer.append(metrics)

        return {
            "metrics": metrics.to_dict(),
            "harmonic_mean": metrics.harmonic_mean
        }

    def get_online_metrics(self) -> Dict[str, float]:
        """Get aggregate online metrics"""
        if not self.metrics_buffer:
            return {}

        return {
            "samples_collected": len(self.samples),
            "avg_faithfulness": np.mean([m.faithfulness for m in self.metrics_buffer]),
            "avg_answer_relevancy": np.mean([m.answer_relevancy for m in self.metrics_buffer]),
            "avg_context_recall": np.mean([m.context_recall for m in self.metrics_buffer]),
            "avg_context_precision": np.mean([m.context_precision for m in self.metrics_buffer]),
            "avg_harmonic_mean": np.mean([m.harmonic_mean for m in self.metrics_buffer])
        }


# ============================================================================
# 检索质量评估指标
# ============================================================================

@dataclass
class RetrievalMetrics:
    """检索质量评估指标"""
    # 命中率 (Hit Rate)
    hit_rate_at_k: Dict[int, float] = field(default_factory=dict)

    # 平均倒数排名 (Mean Reciprocal Rank)
    mrr: float = 0.0
    mrr_at_k: Dict[int, float] = field(default_factory=dict)

    # 归一化折损累积增益 (Normalized Discounted Cumulative Gain)
    ndcg_at_k: Dict[int, float] = field(default_factory=dict)

    # 平均精度 (Mean Average Precision)
    map_score: float = 0.0

    # 召回率
    recall_at_k: Dict[int, float] = field(default_factory=dict)

    # 精确率
    precision_at_k: Dict[int, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hit_rate_at_k": self.hit_rate_at_k,
            "mrr": self.mrr,
            "mrr_at_k": self.mrr_at_k,
            "ndcg_at_k": self.ndcg_at_k,
            "map": self.map_score,
            "recall_at_k": self.recall_at_k,
            "precision_at_k": self.precision_at_k
        }


class HitRateMetric:
    """
    命中率 (Hit Rate) 指标

    衡量在前 K 个检索结果中是否至少有一个相关文档。
    Hit@K = 1 if any relevant doc in top K, else 0

    适用于评估检索系统是否能够找到至少一个相关结果。
    """

    def __init__(self, k_values: Optional[List[int]] = None):
        """
        Args:
            k_values: 要计算的 K 值列表，默认 [1, 3, 5, 10]
        """
        self.k_values = k_values or [1, 3, 5, 10]

    def compute(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str]
    ) -> Dict[int, float]:
        """
        计算不同 K 值下的命中率

        Args:
            retrieved_ids: 检索返回的文档 ID 列表（按排名顺序）
            relevant_ids: 相关文档 ID 列表

        Returns:
            {k: hit_rate} 字典
        """
        if not retrieved_ids or not relevant_ids:
            return {k: 0.0 for k in self.k_values}

        relevant_set = set(relevant_ids)
        results = {}

        for k in self.k_values:
            top_k = set(retrieved_ids[:k])
            # 如果 top K 中有任何一个相关文档，则命中
            hit = 1.0 if bool(top_k & relevant_set) else 0.0
            results[k] = hit

        return results

    def compute_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevant: List[List[str]]
    ) -> Dict[int, float]:
        """
        计算批量样本的平均命中率

        Args:
            all_retrieved: 每个样本的检索结果列表
            all_relevant: 每个样本的相关文档列表

        Returns:
            {k: avg_hit_rate} 字典
        """
        if not all_retrieved:
            return {k: 0.0 for k in self.k_values}

        all_hits = {k: [] for k in self.k_values}

        for retrieved, relevant in zip(all_retrieved, all_relevant):
            hits = self.compute(retrieved, relevant)
            for k, hit in hits.items():
                all_hits[k].append(hit)

        return {k: np.mean(hits) for k, hits in all_hits.items()}


class MRRMetric:
    """
    平均倒数排名 (Mean Reciprocal Rank) 指标

    衡量第一个相关文档的排名位置。
    MRR = 1 / rank_of_first_relevant_doc

    适用于评估检索系统将相关结果排在前面的能力。
    """

    def __init__(self, k_values: Optional[List[int]] = None):
        """
        Args:
            k_values: 要计算的 K 值列表，默认 [1, 3, 5, 10]
        """
        self.k_values = k_values or [1, 3, 5, 10]

    def compute(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str]
    ) -> Tuple[float, Dict[int, float]]:
        """
        计算倒数排名

        Args:
            retrieved_ids: 检索返回的文档 ID 列表（按排名顺序）
            relevant_ids: 相关文档 ID 列表

        Returns:
            (mrr, {k: mrr_at_k}) 元组
        """
        if not retrieved_ids or not relevant_ids:
            return 0.0, {k: 0.0 for k in self.k_values}

        relevant_set = set(relevant_ids)

        # 找到第一个相关文档的排名
        first_relevant_rank = None
        for rank, doc_id in enumerate(retrieved_ids, start=1):
            if doc_id in relevant_set:
                first_relevant_rank = rank
                break

        # 计算全局 MRR
        if first_relevant_rank is None:
            mrr = 0.0
        else:
            mrr = 1.0 / first_relevant_rank

        # 计算 MRR@K
        mrr_at_k = {}
        for k in self.k_values:
            if first_relevant_rank is not None and first_relevant_rank <= k:
                mrr_at_k[k] = 1.0 / first_relevant_rank
            else:
                mrr_at_k[k] = 0.0

        return mrr, mrr_at_k

    def compute_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevant: List[List[str]]
    ) -> Tuple[float, Dict[int, float]]:
        """
        计算批量样本的平均倒数排名

        Args:
            all_retrieved: 每个样本的检索结果列表
            all_relevant: 每个样本的相关文档列表

        Returns:
            (avg_mrr, {k: avg_mrr_at_k}) 元组
        """
        if not all_retrieved:
            return 0.0, {k: 0.0 for k in self.k_values}

        all_mrr = []
        all_mrr_at_k = {k: [] for k in self.k_values}

        for retrieved, relevant in zip(all_retrieved, all_relevant):
            mrr, mrr_k = self.compute(retrieved, relevant)
            all_mrr.append(mrr)
            for k, val in mrr_k.items():
                all_mrr_at_k[k].append(val)

        avg_mrr = np.mean(all_mrr)
        avg_mrr_at_k = {k: np.mean(vals) for k, vals in all_mrr_at_k.items()}

        return avg_mrr, avg_mrr_at_k


class NDCGMetric:
    """
    归一化折损累积增益 (Normalized Discounted Cumulative Gain) 指标

    衡量检索结果的整体排序质量，考虑了文档的相关性程度和位置。
    NDCG@K = DCG@K / IDCG@K

    DCG@K = sum(rel_i / log2(i+1)) for i in 1..K
    IDCG@K = DCG of ideal ranking

    适用于评估检索结果的排序质量，特别是当文档有不同程度的相关性时。
    """

    def __init__(self, k_values: Optional[List[int]] = None):
        """
        Args:
            k_values: 要计算的 K 值列表，默认 [1, 3, 5, 10]
        """
        self.k_values = k_values or [1, 3, 5, 10]

    def compute(
        self,
        retrieved_ids: List[str],
        relevance_scores: Dict[str, float]
    ) -> Dict[int, float]:
        """
        计算 NDCG

        Args:
            retrieved_ids: 检索返回的文档 ID 列表（按排名顺序）
            relevance_scores: 文档相关性分数字典 {doc_id: relevance_score}

        Returns:
            {k: ndcg_at_k} 字典
        """
        if not retrieved_ids or not relevance_scores:
            return {k: 0.0 for k in self.k_values}

        results = {}

        for k in self.k_values:
            top_k = retrieved_ids[:k]

            # 计算 DCG@K
            dcg = 0.0
            for i, doc_id in enumerate(top_k, start=1):
                rel = relevance_scores.get(doc_id, 0.0)
                # DCG 公式: rel / log2(i+1)
                dcg += rel / np.log2(i + 1)

            # 计算 IDCG@K (理想情况下的 DCG)
            ideal_scores = sorted(relevance_scores.values(), reverse=True)[:k]
            idcg = 0.0
            for i, rel in enumerate(ideal_scores, start=1):
                idcg += rel / np.log2(i + 1)

            # 计算 NDCG
            if idcg > 0:
                ndcg = dcg / idcg
            else:
                ndcg = 0.0

            results[k] = ndcg

        return results

    def compute_binary(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str]
    ) -> Dict[int, float]:
        """
        计算二值相关性的 NDCG

        Args:
            retrieved_ids: 检索返回的文档 ID 列表
            relevant_ids: 相关文档 ID 列表（二值相关性）

        Returns:
            {k: ndcg_at_k} 字典
        """
        # 转换为二值相关性分数
        relevance_scores = {doc_id: 1.0 for doc_id in relevant_ids}
        return self.compute(retrieved_ids, relevance_scores)

    def compute_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevance: List[Dict[str, float]]
    ) -> Dict[int, float]:
        """
        计算批量样本的平均 NDCG

        Args:
            all_retrieved: 每个样本的检索结果列表
            all_relevance: 每个样本的相关性分数字典

        Returns:
            {k: avg_ndcg_at_k} 字典
        """
        if not all_retrieved:
            return {k: 0.0 for k in self.k_values}

        all_ndcg = {k: [] for k in self.k_values}

        for retrieved, relevance in zip(all_retrieved, all_relevance):
            ndcg_k = self.compute(retrieved, relevance)
            for k, val in ndcg_k.items():
                all_ndcg[k].append(val)

        return {k: np.mean(vals) for k, vals in all_ndcg.items()}


class MAPMetric:
    """
    平均精度 (Mean Average Precision) 指标

    衡量所有相关文档的排名质量。
    AP = sum(P@k * rel_k) / R for k where doc_k is relevant

    适用于评估检索系统在所有相关文档上的整体表现。
    """

    def compute(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str]
    ) -> float:
        """
        计算单个查询的平均精度 (AP)

        Args:
            retrieved_ids: 检索返回的文档 ID 列表
            relevant_ids: 相关文档 ID 列表

        Returns:
            AP 分数
        """
        if not retrieved_ids or not relevant_ids:
            return 0.0

        relevant_set = set(relevant_ids)
        num_relevant = len(relevant_set)

        if num_relevant == 0:
            return 0.0

        # 计算每个相关文档位置的精度
        precision_sum = 0.0
        relevant_count = 0

        for rank, doc_id in enumerate(retrieved_ids, start=1):
            if doc_id in relevant_set:
                relevant_count += 1
                precision_at_rank = relevant_count / rank
                precision_sum += precision_at_rank

        # AP = 精度之和 / 相关文档总数
        return precision_sum / num_relevant

    def compute_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevant: List[List[str]]
    ) -> float:
        """
        计算批量样本的 MAP

        Args:
            all_retrieved: 每个样本的检索结果列表
            all_relevant: 每个样本的相关文档列表

        Returns:
            MAP 分数
        """
        if not all_retrieved:
            return 0.0

        ap_scores = []
        for retrieved, relevant in zip(all_retrieved, all_relevant):
            ap = self.compute(retrieved, relevant)
            ap_scores.append(ap)

        return np.mean(ap_scores)


class RecallMetric:
    """
    召回率 (Recall) 指标

    衡量在前 K 个检索结果中找到了多少相关文档。
    Recall@K = |relevant ∩ retrieved_k| / |relevant|

    适用于评估检索系统的覆盖能力。
    """

    def __init__(self, k_values: Optional[List[int]] = None):
        """
        Args:
            k_values: 要计算的 K 值列表，默认 [1, 3, 5, 10]
        """
        self.k_values = k_values or [1, 3, 5, 10]

    def compute(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str]
    ) -> Dict[int, float]:
        """
        计算不同 K 值下的召回率

        Args:
            retrieved_ids: 检索返回的文档 ID 列表
            relevant_ids: 相关文档 ID 列表

        Returns:
            {k: recall} 字典
        """
        if not retrieved_ids or not relevant_ids:
            return {k: 0.0 for k in self.k_values}

        relevant_set = set(relevant_ids)
        num_relevant = len(relevant_set)

        if num_relevant == 0:
            return {k: 0.0 for k in self.k_values}

        results = {}
        for k in self.k_values:
            top_k = set(retrieved_ids[:k])
            found = len(top_k & relevant_set)
            results[k] = found / num_relevant

        return results

    def compute_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevant: List[List[str]]
    ) -> Dict[int, float]:
        """
        计算批量样本的平均召回率

        Args:
            all_retrieved: 每个样本的检索结果列表
            all_relevant: 每个样本的相关文档列表

        Returns:
            {k: avg_recall} 字典
        """
        if not all_retrieved:
            return {k: 0.0 for k in self.k_values}

        all_recall = {k: [] for k in self.k_values}

        for retrieved, relevant in zip(all_retrieved, all_relevant):
            recall_k = self.compute(retrieved, relevant)
            for k, val in recall_k.items():
                all_recall[k].append(val)

        return {k: np.mean(vals) for k, vals in all_recall.items()}


class PrecisionMetric:
    """
    精确率 (Precision) 指标

    衡量前 K 个检索结果中有多少是相关的。
    Precision@K = |relevant ∩ retrieved_k| / K

    适用于评估检索结果的准确性。
    """

    def __init__(self, k_values: Optional[List[int]] = None):
        """
        Args:
            k_values: 要计算的 K 值列表，默认 [1, 3, 5, 10]
        """
        self.k_values = k_values or [1, 3, 5, 10]

    def compute(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str]
    ) -> Dict[int, float]:
        """
        计算不同 K 值下的精确率

        Args:
            retrieved_ids: 检索返回的文档 ID 列表
            relevant_ids: 相关文档 ID 列表

        Returns:
            {k: precision} 字典
        """
        if not retrieved_ids:
            return {k: 0.0 for k in self.k_values}

        relevant_set = set(relevant_ids) if relevant_ids else set()

        results = {}
        for k in self.k_values:
            top_k = retrieved_ids[:k]
            if not top_k:
                results[k] = 0.0
            else:
                found = sum(1 for doc_id in top_k if doc_id in relevant_set)
                results[k] = found / len(top_k)

        return results

    def compute_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevant: List[List[str]]
    ) -> Dict[int, float]:
        """
        计算批量样本的平均精确率

        Args:
            all_retrieved: 每个样本的检索结果列表
            all_relevant: 每个样本的相关文档列表

        Returns:
            {k: avg_precision} 字典
        """
        if not all_retrieved:
            return {k: 0.0 for k in self.k_values}

        all_precision = {k: [] for k in self.k_values}

        for retrieved, relevant in zip(all_retrieved, all_relevant):
            precision_k = self.compute(retrieved, relevant)
            for k, val in precision_k.items():
                all_precision[k].append(val)

        return {k: np.mean(vals) for k, vals in all_precision.items()}


class RetrievalEvaluator:
    """
    检索系统评估器

    综合评估检索系统的各项指标：
    - Hit Rate
    - MRR
    - NDCG
    - MAP
    - Recall
    - Precision
    """

    def __init__(
        self,
        k_values: Optional[List[int]] = None
    ):
        """
        初始化检索评估器

        Args:
            k_values: 要计算的 K 值列表
        """
        self.k_values = k_values or [1, 3, 5, 10]

        # 初始化各指标计算器
        self.hit_rate = HitRateMetric(self.k_values)
        self.mrr = MRRMetric(self.k_values)
        self.ndcg = NDCGMetric(self.k_values)
        self.map = MAPMetric()
        self.recall = RecallMetric(self.k_values)
        self.precision = PrecisionMetric(self.k_values)

        # 评估历史
        self.evaluation_history: List[Dict[str, Any]] = []

    def evaluate_single(
        self,
        retrieved_ids: List[str],
        relevant_ids: List[str],
        relevance_scores: Optional[Dict[str, float]] = None,
        query: Optional[str] = None
    ) -> RetrievalMetrics:
        """
        评估单个查询的检索结果

        Args:
            retrieved_ids: 检索返回的文档 ID 列表
            relevant_ids: 相关文档 ID 列表
            relevance_scores: 可选的相关性分数字典
            query: 可选的查询文本

        Returns:
            RetrievalMetrics 对象
        """
        metrics = RetrievalMetrics()

        # Hit Rate
        metrics.hit_rate_at_k = self.hit_rate.compute(retrieved_ids, relevant_ids)

        # MRR
        mrr, mrr_at_k = self.mrr.compute(retrieved_ids, relevant_ids)
        metrics.mrr = mrr
        metrics.mrr_at_k = mrr_at_k

        # NDCG
        if relevance_scores:
            metrics.ndcg_at_k = self.ndcg.compute(retrieved_ids, relevance_scores)
        else:
            metrics.ndcg_at_k = self.ndcg.compute_binary(retrieved_ids, relevant_ids)

        # MAP
        metrics.map_score = self.map.compute(retrieved_ids, relevant_ids)

        # Recall
        metrics.recall_at_k = self.recall.compute(retrieved_ids, relevant_ids)

        # Precision
        metrics.precision_at_k = self.precision.compute(retrieved_ids, relevant_ids)

        return metrics

    def evaluate_batch(
        self,
        all_retrieved: List[List[str]],
        all_relevant: List[List[str]],
        all_relevance_scores: Optional[List[Dict[str, float]]] = None,
        queries: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        批量评估检索结果

        Args:
            all_retrieved: 每个查询的检索结果列表
            all_relevant: 每个查询的相关文档列表
            all_relevance_scores: 可选的每个查询的相关性分数
            queries: 可选的查询文本列表

        Returns:
            包含聚合指标和详细结果的字典
        """
        if not all_retrieved:
            return {"error": "No retrieval results provided"}

        # 计算聚合指标
        hit_rate_avg = self.hit_rate.compute_batch(all_retrieved, all_relevant)
        mrr_avg, mrr_at_k_avg = self.mrr.compute_batch(all_retrieved, all_relevant)
        map_avg = self.map.compute_batch(all_retrieved, all_relevant)
        recall_avg = self.recall.compute_batch(all_retrieved, all_relevant)
        precision_avg = self.precision.compute_batch(all_retrieved, all_relevant)

        # NDCG
        if all_relevance_scores:
            ndcg_avg = self.ndcg.compute_batch(all_retrieved, all_relevance_scores)
        else:
            # 使用二值相关性
            all_binary_rel = [{doc_id: 1.0 for doc_id in relevant} for relevant in all_relevant]
            ndcg_avg = self.ndcg.compute_batch(all_retrieved, all_binary_rel)

        # 计算每个样本的指标
        per_sample_metrics = []
        for i, (retrieved, relevant) in enumerate(zip(all_retrieved, all_relevant)):
            rel_scores = all_relevance_scores[i] if all_relevance_scores else None
            sample_metrics = self.evaluate_single(retrieved, relevant, rel_scores)
            per_sample_metrics.append({
                "sample_idx": i,
                "query": queries[i] if queries else None,
                **sample_metrics.to_dict()
            })

        # 构建结果
        result = {
            "num_queries": len(all_retrieved),
            "aggregate_metrics": {
                "hit_rate_at_k": hit_rate_avg,
                "mrr": mrr_avg,
                "mrr_at_k": mrr_at_k_avg,
                "ndcg_at_k": ndcg_avg,
                "map": map_avg,
                "recall_at_k": recall_avg,
                "precision_at_k": precision_avg
            },
            "per_sample_metrics": per_sample_metrics
        }

        # 记录历史
        self.evaluation_history.append({
            "timestamp": datetime.now().isoformat(),
            **result
        })

        return result

    def generate_report(
        self,
        save_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        生成评估报告

        Args:
            save_path: 可选的保存路径

        Returns:
            报告字典
        """
        if not self.evaluation_history:
            return {"error": "No evaluation history available"}

        # 汇总所有评估
        all_aggregates = [e["aggregate_metrics"] for e in self.evaluation_history]

        report = {
            "report_timestamp": datetime.now().isoformat(),
            "total_evaluations": len(self.evaluation_history),
            "total_queries": sum(e["num_queries"] for e in self.evaluation_history),
            "overall_metrics": {
                "avg_hit_rate_at_10": np.mean([m["hit_rate_at_k"].get(10, 0) for m in all_aggregates]),
                "avg_mrr": np.mean([m["mrr"] for m in all_aggregates]),
                "avg_ndcg_at_10": np.mean([m["ndcg_at_k"].get(10, 0) for m in all_aggregates]),
                "avg_map": np.mean([m["map"] for m in all_aggregates]),
                "avg_recall_at_10": np.mean([m["recall_at_k"].get(10, 0) for m in all_aggregates]),
                "avg_precision_at_10": np.mean([m["precision_at_k"].get(10, 0) for m in all_aggregates])
            },
            "evaluation_history": self.evaluation_history
        }

        if save_path:
            with open(save_path, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)

        return report

    def clear_history(self):
        """清空评估历史"""
        self.evaluation_history = []


class CombinedRAGEvaluator:
    """
    综合RAG评估器

    结合生成质量评估和检索质量评估
    """

    def __init__(
        self,
        embedding_service=None,
        llm_client=None,
        k_values: Optional[List[int]] = None
    ):
        """
        初始化综合评估器

        Args:
            embedding_service: 嵌入服务
            llm_client: LLM 客户端
            k_values: 检索评估的 K 值列表
        """
        self.generation_evaluator = RAGEvaluator(
            embedding_service=embedding_service,
            llm_client=llm_client
        )
        self.retrieval_evaluator = RetrievalEvaluator(k_values=k_values)

    def evaluate(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        retrieved_ids: List[str],
        relevant_ids: List[str],
        ground_truth: Optional[str] = None,
        relevance_scores: Optional[Dict[str, float]] = None,
        latency_info: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        综合评估 RAG 系统

        Args:
            question: 用户问题
            answer: 生成的答案
            contexts: 检索的上下文
            retrieved_ids: 检索返回的文档 ID
            relevant_ids: 相关文档 ID
            ground_truth: 可选的标准答案
            relevance_scores: 可选的相关性分数
            latency_info: 可选的延迟信息

        Returns:
            综合评估结果
        """
        # 生成质量评估
        gen_result = self.generation_evaluator.evaluate_rag_response(
            question=question,
            answer=answer,
            contexts=contexts,
            ground_truth=ground_truth,
            retrieved_doc_ids=retrieved_ids,
            relevant_doc_ids=relevant_ids,
            latency_info=latency_info
        )

        # 检索质量评估
        retrieval_metrics = self.retrieval_evaluator.evaluate_single(
            retrieved_ids=retrieved_ids,
            relevant_ids=relevant_ids,
            relevance_scores=relevance_scores,
            query=question
        )

        return {
            "question": question,
            "generation_metrics": gen_result["metrics"],
            "generation_harmonic_mean": gen_result["harmonic_mean"],
            "retrieval_metrics": retrieval_metrics.to_dict(),
            "combined_score": self._compute_combined_score(
                gen_result["harmonic_mean"],
                retrieval_metrics
            )
        }

    def _compute_combined_score(
        self,
        gen_harmonic_mean: float,
        retrieval_metrics: RetrievalMetrics
    ) -> float:
        """
        计算综合得分

        Args:
            gen_harmonic_mean: 生成质量的调和平均
            retrieval_metrics: 检索质量指标

        Returns:
            综合得分
        """
        # 检索质量得分（使用 MRR 和 NDCG@10 的平均）
        retrieval_score = (
            retrieval_metrics.mrr +
            retrieval_metrics.ndcg_at_k.get(10, 0) +
            retrieval_metrics.map_score
        ) / 3

        # 综合得分（生成和检索的加权平均）
        combined = 0.6 * gen_harmonic_mean + 0.4 * retrieval_score

        return combined
