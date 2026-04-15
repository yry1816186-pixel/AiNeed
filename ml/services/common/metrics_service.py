"""
Prometheus Metrics Module for AI Service
Collects LLM, vector search, and model inference metrics

A-P2-14: Added sampling rate control to prevent metrics collection
from becoming a performance bottleneck under high concurrency.
"""

from prometheus_client import Counter, Histogram, Gauge, Info, CollectorRegistry
import time
import random
import os
from functools import wraps
from typing import Callable, Any, Optional


# A-P2-14: 全局采样率控制
# 采样率 0.0-1.0，1.0 表示 100% 采集，0.1 表示 10% 采集
# 可通过环境变量 METRICS_SAMPLE_RATE 配置
_global_sample_rate: float = float(os.getenv("METRICS_SAMPLE_RATE", "1.0"))

# 各类别指标的独立采样率，优先级高于全局采样率
_category_sample_rates: dict = {}

# 是否启用采样率控制（默认启用）
_sampling_enabled: bool = os.getenv("METRICS_SAMPLING_ENABLED", "true").lower() in ("true", "1", "yes")


def set_sample_rate(rate: float, category: Optional[str] = None):
    """
    A-P2-14: 设置指标采样率

    Args:
        rate: 采样率 0.0-1.0
        category: 可选的指标类别。如果指定，仅设置该类别的采样率；
                  如果不指定，设置全局采样率。

    类别列表：
    - llm: LLM 调用指标
    - vector_search: 向量搜索指标
    - model_inference: 模型推理指标
    - try_on: 虚拟试衣指标
    - style_analysis: 风格分析指标
    - body_analysis: 身体分析指标
    - hallucination: 幻觉检测指标
    """
    rate = max(0.0, min(1.0, rate))
    if category:
        _category_sample_rates[category] = rate
    else:
        global _global_sample_rate
        _global_sample_rate = rate


def get_sample_rate(category: Optional[str] = None) -> float:
    """
    A-P2-14: 获取指标采样率

    Args:
        category: 可选的指标类别

    Returns:
        采样率 0.0-1.0
    """
    if category and category in _category_sample_rates:
        return _category_sample_rates[category]
    return _global_sample_rate


def should_sample(category: Optional[str] = None) -> bool:
    """
    A-P2-14: 判断当前请求是否应该采集指标

    使用随机采样决定是否采集，避免高并发时指标收集成为瓶颈。

    Args:
        category: 可选的指标类别

    Returns:
        True 如果应该采集，False 如果应该跳过
    """
    if not _sampling_enabled:
        return True

    rate = get_sample_rate(category)
    if rate >= 1.0:
        return True
    if rate <= 0.0:
        return False
    return random.random() < rate


def set_sampling_enabled(enabled: bool):
    """A-P2-14: 启用或禁用采样率控制"""
    global _sampling_enabled
    _sampling_enabled = enabled

# ===================
# LLM Metrics
# ===================

# LLM 调用计数
llm_calls_total = Counter(
    'llm_calls_total',
    'Total number of LLM API calls',
    ['model', 'provider', 'endpoint']
)

# LLM 错误计数
llm_errors_total = Counter(
    'llm_errors_total',
    'Total number of LLM API errors',
    ['model', 'provider', 'error_type']
)

# LLM Token 消耗
llm_tokens_total = Counter(
    'llm_tokens_total',
    'Total number of tokens used',
    ['model', 'type']  # type: prompt, completion
)

# LLM 调用延迟
llm_call_duration_seconds = Histogram(
    'llm_call_duration_seconds',
    'Duration of LLM API calls in seconds',
    ['model', 'provider'],
    buckets=[0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120]
)

# LLM 成本
llm_cost_dollars_total = Counter(
    'llm_cost_dollars_total',
    'Total cost of LLM API calls in dollars',
    ['model', 'provider']
)

# ===================
# Vector Search Metrics
# ===================

# 向量搜索计数
vector_search_total = Counter(
    'vector_search_total',
    'Total number of vector searches',
    ['collection', 'status']
)

# 向量搜索延迟
vector_search_duration_seconds = Histogram(
    'vector_search_duration_seconds',
    'Duration of vector searches in seconds',
    ['collection'],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
)

# 向量搜索结果数
vector_search_results = Histogram(
    'vector_search_results_count',
    'Number of results returned from vector search',
    ['collection'],
    buckets=[1, 5, 10, 20, 50, 100]
)

# ===================
# Model Inference Metrics
# ===================

# 模型推理计数
model_inference_total = Counter(
    'model_inference_total',
    'Total number of model inferences',
    ['model_name', 'model_type', 'status']
)

# 模型推理延迟
model_inference_duration_seconds = Histogram(
    'model_inference_duration_seconds',
    'Duration of model inference in seconds',
    ['model_name', 'model_type'],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)

# GPU 内存使用
gpu_memory_used_bytes = Gauge(
    'gpu_memory_used_bytes',
    'GPU memory used in bytes',
    ['gpu_id']
)

gpu_memory_total_bytes = Gauge(
    'gpu_memory_total_bytes',
    'Total GPU memory in bytes',
    ['gpu_id']
)

# GPU 利用率
gpu_utilization = Gauge(
    'gpu_utilization_percent',
    'GPU utilization percentage',
    ['gpu_id']
)

# ===================
# Try-On Metrics
# ===================

# 虚拟试衣计数
try_on_requests_total = Counter(
    'try_on_requests_total',
    'Total number of virtual try-on requests',
    ['status']
)

# 虚拟试衣延迟
try_on_duration_seconds = Histogram(
    'try_on_duration_seconds',
    'Duration of virtual try-on processing in seconds',
    ['status'],
    buckets=[1, 2, 5, 10, 20, 30, 60, 120, 300]
)

# ===================
# Style Analysis Metrics
# ===================

# 风格分析计数
style_analysis_total = Counter(
    'style_analysis_total',
    'Total number of style analyses',
    ['type', 'status']
)

# 风格分析延迟
style_analysis_duration_seconds = Histogram(
    'style_analysis_duration_seconds',
    'Duration of style analysis in seconds',
    ['type'],
    buckets=[0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)

# ===================
# Body Analysis Metrics
# ===================

# 身体分析计数
body_analysis_total = Counter(
    'body_analysis_total',
    'Total number of body analyses',
    ['status']
)

# 身体分析延迟
body_analysis_duration_seconds = Histogram(
    'body_analysis_duration_seconds',
    'Duration of body analysis in seconds',
    buckets=[0.5, 1, 2, 5, 10, 20]
)

# ===================
# Service Info
# ===================

service_info = Info(
    'ai_service',
    'AI service information'
)

# 设置服务信息
service_info.info({
    'version': os.getenv('SERVICE_VERSION', '1.0.0'),
    'environment': os.getenv('ENVIRONMENT', 'development'),
})

# ===================
# Helper Functions
# ===================

def track_llm_call(model: str, provider: str = 'openai'):
    """
    Decorator to track LLM API calls

    A-P2-14: 支持采样率控制，默认使用 llm 类别采样率
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # A-P2-14: 采样率检查
            do_sample = should_sample("llm")
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                if do_sample:
                    llm_calls_total.labels(model=model, provider=provider, endpoint=func.__name__).inc()

                    # Track tokens if available in response
                    if hasattr(result, 'usage'):
                        if hasattr(result.usage, 'prompt_tokens'):
                            llm_tokens_total.labels(model=model, type='prompt').inc(result.usage.prompt_tokens)
                        if hasattr(result.usage, 'completion_tokens'):
                            llm_tokens_total.labels(model=model, type='completion').inc(result.usage.completion_tokens)

                return result
            except Exception as e:
                if do_sample:
                    llm_errors_total.labels(model=model, provider=provider, error_type=type(e).__name__).inc()
                raise
            finally:
                if do_sample:
                    duration = time.time() - start_time
                    llm_call_duration_seconds.labels(model=model, provider=provider).observe(duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # A-P2-14: 采样率检查
            do_sample = should_sample("llm")
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                if do_sample:
                    llm_calls_total.labels(model=model, provider=provider, endpoint=func.__name__).inc()
                return result
            except Exception as e:
                if do_sample:
                    llm_errors_total.labels(model=model, provider=provider, error_type=type(e).__name__).inc()
                raise
            finally:
                if do_sample:
                    duration = time.time() - start_time
                    llm_call_duration_seconds.labels(model=model, provider=provider).observe(duration)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def track_vector_search(collection: str):
    """
    Decorator to track vector search operations

    A-P2-14: 支持采样率控制，默认使用 vector_search 类别采样率
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # A-P2-14: 采样率检查
            do_sample = should_sample("vector_search")
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                if do_sample:
                    vector_search_total.labels(collection=collection, status='success').inc()

                    # Track result count
                    if result is not None:
                        if isinstance(result, list):
                            vector_search_results.labels(collection=collection).observe(len(result))
                        elif hasattr(result, '__len__'):
                            vector_search_results.labels(collection=collection).observe(len(result))

                return result
            except Exception as e:
                if do_sample:
                    vector_search_total.labels(collection=collection, status='error').inc()
                raise
            finally:
                if do_sample:
                    duration = time.time() - start_time
                    vector_search_duration_seconds.labels(collection=collection).observe(duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # A-P2-14: 采样率检查
            do_sample = should_sample("vector_search")
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                if do_sample:
                    vector_search_total.labels(collection=collection, status='success').inc()
                return result
            except Exception as e:
                if do_sample:
                    vector_search_total.labels(collection=collection, status='error').inc()
                raise
            finally:
                if do_sample:
                    duration = time.time() - start_time
                    vector_search_duration_seconds.labels(collection=collection).observe(duration)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


def track_model_inference(model_name: str, model_type: str):
    """
    Decorator to track model inference

    A-P2-14: 支持采样率控制，默认使用 model_inference 类别采样率
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # A-P2-14: 采样率检查
            do_sample = should_sample("model_inference")
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                if do_sample:
                    model_inference_total.labels(
                        model_name=model_name,
                        model_type=model_type,
                        status='success'
                    ).inc()
                return result
            except Exception as e:
                if do_sample:
                    model_inference_total.labels(
                        model_name=model_name,
                        model_type=model_type,
                        status='error'
                    ).inc()
                raise
            finally:
                if do_sample:
                    duration = time.time() - start_time
                    model_inference_duration_seconds.labels(
                        model_name=model_name,
                        model_type=model_type
                    ).observe(duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # A-P2-14: 采样率检查
            do_sample = should_sample("model_inference")
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                if do_sample:
                    model_inference_total.labels(
                        model_name=model_name,
                        model_type=model_type,
                        status='success'
                    ).inc()
                return result
            except Exception as e:
                if do_sample:
                    model_inference_total.labels(
                        model_name=model_name,
                        model_type=model_type,
                        status='error'
                    ).inc()
                raise
            finally:
                if do_sample:
                    duration = time.time() - start_time
                    model_inference_duration_seconds.labels(
                        model_name=model_name,
                        model_type=model_type
                    ).observe(duration)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator


class MetricsContext:
    """
    Context manager for tracking metrics
    """
    def __init__(
        self,
        metric_type: str,
        labels: dict,
        duration_histogram: Optional[Histogram] = None,
        counter: Optional[Counter] = None
    ):
        self.metric_type = metric_type
        self.labels = labels
        self.duration_histogram = duration_histogram
        self.counter = counter
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            if self.duration_histogram:
                self.duration_histogram.labels(**self.labels).observe(duration)

        if self.counter:
            status = 'error' if exc_type else 'success'
            labels_with_status = {**self.labels, 'status': status}
            self.counter.labels(**labels_with_status).inc()

        return False  # Don't suppress exceptions

    async def __aenter__(self):
        self.start_time = time.time()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            if self.duration_histogram:
                self.duration_histogram.labels(**self.labels).observe(duration)

        if self.counter:
            status = 'error' if exc_type else 'success'
            labels_with_status = {**self.labels, 'status': status}
            self.counter.labels(**labels_with_status).inc()

        return False


# Convenience functions
def record_llm_tokens(model: str, prompt_tokens: int, completion_tokens: int):
    """Record token usage for LLM calls"""
    if should_sample("llm"):
        llm_tokens_total.labels(model=model, type='prompt').inc(prompt_tokens)
        llm_tokens_total.labels(model=model, type='completion').inc(completion_tokens)


def record_llm_cost(model: str, provider: str, cost: float):
    """Record cost for LLM calls"""
    if should_sample("llm"):
        llm_cost_dollars_total.labels(model=model, provider=provider).inc(cost)


def update_gpu_memory(gpu_id: int, used_bytes: int, total_bytes: int):
    """Update GPU memory metrics"""
    # GPU 指标通常不频繁，始终采集
    gpu_memory_used_bytes.labels(gpu_id=str(gpu_id)).set(used_bytes)
    gpu_memory_total_bytes.labels(gpu_id=str(gpu_id)).set(total_bytes)


def update_gpu_utilization(gpu_id: int, utilization_percent: float):
    """Update GPU utilization metric"""
    # GPU 指标通常不频繁，始终采集
    gpu_utilization.labels(gpu_id=str(gpu_id)).set(utilization_percent)


def record_try_on(status: str, duration: float):
    """Record virtual try-on metrics"""
    if should_sample("try_on"):
        try_on_requests_total.labels(status=status).inc()
        try_on_duration_seconds.labels(status=status).observe(duration)


def record_style_analysis(analysis_type: str, duration: float, status: str = 'success'):
    """Record style analysis metrics"""
    if should_sample("style_analysis"):
        style_analysis_total.labels(type=analysis_type, status=status).inc()
        style_analysis_duration_seconds.labels(type=analysis_type).observe(duration)


def record_body_analysis(duration: float, status: str = 'success'):
    """Record body analysis metrics"""
    if should_sample("body_analysis"):
        body_analysis_total.labels(status=status).inc()
        body_analysis_duration_seconds.observe(duration)


# ===================
# Hallucination Detection Metrics
# ===================

# 幻觉检测总次数
hallucination_detection_total = Counter(
    'hallucination_detection_total',
    'Total number of hallucination detections',
    ['status', 'occasion']
)

# 幻觉率
hallucination_rate = Gauge(
    'hallucination_rate',
    'Current hallucination rate',
    ['occasion']
)

# 验证延迟
validation_latency_seconds = Histogram(
    'validation_latency_seconds',
    'Duration of response validation in seconds',
    ['status'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
)

# 幻觉类型统计
hallucination_by_type = Counter(
    'hallucination_by_type',
    'Hallucination detections by type',
    ['type', 'severity']
)

# 置信度分数分布
confidence_score_distribution = Histogram(
    'confidence_score_distribution',
    'Distribution of confidence scores',
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# 问题数量分布
issues_per_detection = Histogram(
    'issues_per_detection',
    'Number of issues per detection',
    buckets=[0, 1, 2, 3, 5, 10, 20]
)


# ===================
# Hallucination Detection Helper Functions
# ===================

def record_hallucination_detection(
    is_hallucination: bool,
    confidence_score: float,
    issue_count: int,
    occasion: str = 'unknown'
):
    """
    Record hallucination detection metrics

    Args:
        is_hallucination: Whether hallucination was detected
        confidence_score: Confidence score (0.0 to 1.0)
        issue_count: Number of issues found
        occasion: The occasion context
    """
    status = 'hallucination' if is_hallucination else 'valid'

    hallucination_detection_total.labels(
        status=status,
        occasion=occasion
    ).inc()

    confidence_score_distribution.observe(confidence_score)
    issues_per_detection.observe(issue_count)


def record_hallucination_issue(issue_type: str, severity: str):
    """
    Record individual hallucination issue

    Args:
        issue_type: Type of the issue
        severity: Severity level (error, warning, info)
    """
    hallucination_by_type.labels(
        type=issue_type,
        severity=severity
    ).inc()


def record_validation_latency(duration_seconds: float, status: str = 'success'):
    """
    Record validation latency

    Args:
        duration_seconds: Duration in seconds
        status: Validation status
    """
    validation_latency_seconds.labels(status=status).observe(duration_seconds)


def update_hallucination_rate(rate: float, occasion: str = 'all'):
    """
    Update the hallucination rate gauge

    Args:
        rate: Current hallucination rate (0.0 to 1.0)
        occasion: The occasion context
    """
    hallucination_rate.labels(occasion=occasion).set(rate)


def track_hallucination_detection(occasion: str = 'unknown'):
    """
    Decorator to track hallucination detection operations
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)

                # Extract result info if available
                if hasattr(result, 'is_hallucination'):
                    is_hall = result.is_hallucination
                    conf = getattr(result, 'confidence_score', 1.0)
                    issues = getattr(result, 'issues', [])
                    record_hallucination_detection(
                        is_hallucination=is_hall,
                        confidence_score=conf,
                        issue_count=len(issues) if issues else 0,
                        occasion=occasion
                    )
                else:
                    hallucination_detection_total.labels(
                        status='success',
                        occasion=occasion
                    ).inc()

                return result
            except Exception as e:
                hallucination_detection_total.labels(
                    status='error',
                    occasion=occasion
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                validation_latency_seconds.labels(status='success').observe(duration)

        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                result = func(*args, **kwargs)

                if hasattr(result, 'is_hallucination'):
                    is_hall = result.is_hallucination
                    conf = getattr(result, 'confidence_score', 1.0)
                    issues = getattr(result, 'issues', [])
                    record_hallucination_detection(
                        is_hallucination=is_hall,
                        confidence_score=conf,
                        issue_count=len(issues) if issues else 0,
                        occasion=occasion
                    )
                else:
                    hallucination_detection_total.labels(
                        status='success',
                        occasion=occasion
                    ).inc()

                return result
            except Exception as e:
                hallucination_detection_total.labels(
                    status='error',
                    occasion=occasion
                ).inc()
                raise
            finally:
                duration = time.time() - start_time
                validation_latency_seconds.labels(status='error').observe(duration)

        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper

    return decorator
