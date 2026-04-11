"""
系统监控和反馈收集
监控系统性能、收集用户反馈、生成报告
"""

import os
import sys
import json
import asyncio
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
import logging
from collections import defaultdict
import statistics

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MetricRecord:
    timestamp: str
    metric_name: str
    value: float
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class UserFeedback:
    feedback_id: str
    user_id: str
    item_id: str
    feedback_type: str  # positive, negative, neutral
    rating: Optional[int] = None  # 1-5
    comment: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class SystemHealth:
    status: str  # healthy, degraded, unhealthy
    model_loaded: bool
    last_inference_time: float
    avg_inference_time: float
    total_requests: int
    error_rate: float
    memory_usage: float
    gpu_usage: Optional[float]
    uptime_seconds: float


class MetricsCollector:
    def __init__(self, metrics_dir: str = "./data/metrics"):
        self.metrics_dir = Path(metrics_dir)
        self.metrics_dir.mkdir(parents=True, exist_ok=True)
        
        self.metrics: Dict[str, List[MetricRecord]] = defaultdict(list)
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = {}
        
        self.start_time = time.time()

    def record_metric(
        self,
        name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None
    ):
        record = MetricRecord(
            timestamp=datetime.now().isoformat(),
            metric_name=name,
            value=value,
            tags=tags or {}
        )
        
        self.metrics[name].append(record)
        
        if len(self.metrics[name]) > 10000:
            self.metrics[name] = self.metrics[name][-5000:]

    def increment_counter(self, name: str, delta: int = 1):
        self.counters[name] += delta

    def set_gauge(self, name: str, value: float):
        self.gauges[name] = value

    def get_metric_stats(
        self,
        name: str,
        time_window_hours: int = 24
    ) -> Dict[str, float]:
        if name not in self.metrics:
            return {}
        
        cutoff = datetime.now() - timedelta(hours=time_window_hours)
        
        recent_values = [
            r.value for r in self.metrics[name]
            if datetime.fromisoformat(r.timestamp) > cutoff
        ]
        
        if not recent_values:
            return {}
        
        return {
            "count": len(recent_values),
            "mean": statistics.mean(recent_values),
            "median": statistics.median(recent_values),
            "min": min(recent_values),
            "max": max(recent_values),
            "std": statistics.stdev(recent_values) if len(recent_values) > 1 else 0
        }

    def get_summary(self) -> Dict[str, Any]:
        return {
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "metrics_summary": {
                name: self.get_metric_stats(name)
                for name in list(self.metrics.keys())[:20]
            },
            "uptime_seconds": time.time() - self.start_time
        }

    def save_metrics(self):
        output_path = self.metrics_dir / f"metrics_{datetime.now().strftime('%Y%m%d')}.json"
        
        data = {
            "metrics": {
                name: [asdict(r) for r in records]
                for name, records in self.metrics.items()
            },
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "saved_at": datetime.now().isoformat()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


class FeedbackStore:
    def __init__(self, feedback_dir: str = "./data/feedback"):
        self.feedback_dir = Path(feedback_dir)
        self.feedback_dir.mkdir(parents=True, exist_ok=True)
        
        self.feedbacks: List[UserFeedback] = []
        self.load_feedback()

    def load_feedback(self):
        feedback_file = self.feedback_dir / "feedback_store.json"
        if feedback_file.exists():
            with open(feedback_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.feedbacks = [UserFeedback(**fb) for fb in data.get("feedbacks", [])]

    def save_feedback(self):
        feedback_file = self.feedback_dir / "feedback_store.json"
        with open(feedback_file, 'w', encoding='utf-8') as f:
            json.dump({
                "feedbacks": [asdict(fb) for fb in self.feedbacks],
                "total": len(self.feedbacks),
                "updated_at": datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)

    def add_feedback(self, feedback: UserFeedback):
        self.feedbacks.append(feedback)
        self.save_feedback()

    def get_feedback_by_item(self, item_id: str) -> List[UserFeedback]:
        return [fb for fb in self.feedbacks if fb.item_id == item_id]

    def get_feedback_by_user(self, user_id: str) -> List[UserFeedback]:
        return [fb for fb in self.feedbacks if fb.user_id == user_id]

    def get_feedback_stats(self) -> Dict[str, Any]:
        if not self.feedbacks:
            return {"total": 0}
        
        type_counts = defaultdict(int)
        ratings = []
        
        for fb in self.feedbacks:
            type_counts[fb.feedback_type] += 1
            if fb.rating:
                ratings.append(fb.rating)
        
        return {
            "total": len(self.feedbacks),
            "by_type": dict(type_counts),
            "avg_rating": statistics.mean(ratings) if ratings else None,
            "rating_distribution": {
                str(i): ratings.count(i) for i in range(1, 6)
            }
        }

    def get_training_samples(self) -> Dict[str, List[Dict]]:
        positive = [
            {
                "item_id": fb.item_id,
                "context": fb.context,
                "rating": fb.rating
            }
            for fb in self.feedbacks
            if fb.feedback_type == "positive"
        ]
        
        negative = [
            {
                "item_id": fb.item_id,
                "context": fb.context,
                "rating": fb.rating
            }
            for fb in self.feedbacks
            if fb.feedback_type == "negative"
        ]
        
        return {"positive": positive, "negative": negative}


class SystemMonitor:
    def __init__(self):
        self.metrics = MetricsCollector()
        self.feedback_store = FeedbackStore()
        
        self.health_status = SystemHealth(
            status="healthy",
            model_loaded=False,
            last_inference_time=0,
            avg_inference_time=0,
            total_requests=0,
            error_rate=0,
            memory_usage=0,
            gpu_usage=None,
            uptime_seconds=0
        )

    def record_inference(
        self,
        inference_time: float,
        success: bool,
        model_name: str = "default"
    ):
        self.metrics.record_metric(
            "inference_time",
            inference_time,
            {"model": model_name, "success": str(success)}
        )
        
        self.metrics.increment_counter("total_requests")
        
        if not success:
            self.metrics.increment_counter("errors")

    def record_user_feedback(
        self,
        user_id: str,
        item_id: str,
        feedback_type: str,
        rating: Optional[int] = None,
        comment: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> UserFeedback:
        feedback = UserFeedback(
            feedback_id=f"fb_{int(time.time() * 1000)}",
            user_id=user_id,
            item_id=item_id,
            feedback_type=feedback_type,
            rating=rating,
            comment=comment,
            context=context or {}
        )
        
        self.feedback_store.add_feedback(feedback)
        
        self.metrics.increment_counter(f"feedback_{feedback_type}")
        
        return feedback

    def update_health_status(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self.health_status, key):
                setattr(self.health_status, key, value)

    def check_health(self) -> SystemHealth:
        stats = self.metrics.get_summary()
        
        inference_stats = self.metrics.get_metric_stats("inference_time")
        
        total_requests = stats["counters"].get("total_requests", 0)
        errors = stats["counters"].get("errors", 0)
        
        error_rate = errors / total_requests if total_requests > 0 else 0
        
        avg_inference = inference_stats.get("mean", 0)
        
        if error_rate > 0.1:
            status = "unhealthy"
        elif avg_inference > 5.0:
            status = "degraded"
        else:
            status = "healthy"
        
        self.health_status.status = status
        self.health_status.total_requests = total_requests
        self.health_status.error_rate = error_rate
        self.health_status.avg_inference_time = avg_inference
        self.health_status.uptime_seconds = stats["uptime_seconds"]
        
        return self.health_status

    def generate_report(self, time_window_hours: int = 24) -> Dict[str, Any]:
        health = self.check_health()
        feedback_stats = self.feedback_store.get_feedback_stats()
        metrics_summary = self.metrics.get_summary()
        
        return {
            "generated_at": datetime.now().isoformat(),
            "time_window_hours": time_window_hours,
            "health": asdict(health),
            "feedback": feedback_stats,
            "metrics": metrics_summary,
            "recommendations": self._generate_recommendations(health, feedback_stats)
        }

    def _generate_recommendations(
        self,
        health: SystemHealth,
        feedback_stats: Dict
    ) -> List[str]:
        recommendations = []
        
        if health.error_rate > 0.05:
            recommendations.append("错误率较高，建议检查模型加载和推理流程")
        
        if health.avg_inference_time > 2.0:
            recommendations.append("推理时间较长，建议考虑模型优化或GPU加速")
        
        total_feedback = feedback_stats.get("total", 0)
        if total_feedback < 10:
            recommendations.append("用户反馈数据较少，建议增加反馈收集入口")
        
        avg_rating = feedback_stats.get("avg_rating")
        if avg_rating and avg_rating < 3.5:
            recommendations.append("用户评分较低，建议分析负面反馈优化推荐质量")
        
        return recommendations


class MonitoringAPI:
    def __init__(self):
        self.monitor = SystemMonitor()

    def record_inference(self, inference_time: float, success: bool):
        self.monitor.record_inference(inference_time, success)

    async def submit_feedback(
        self,
        user_id: str,
        item_id: str,
        feedback_type: str,
        rating: Optional[int] = None,
        comment: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Dict:
        feedback = self.monitor.record_user_feedback(
            user_id=user_id,
            item_id=item_id,
            feedback_type=feedback_type,
            rating=rating,
            comment=comment,
            context=context
        )
        return {"status": "success", "feedback_id": feedback.feedback_id}

    def get_health(self) -> Dict:
        health = self.monitor.check_health()
        return asdict(health)

    def get_report(self) -> Dict:
        return self.monitor.generate_report()

    def get_feedback_for_training(self) -> Dict:
        return self.monitor.feedback_store.get_training_samples()


def test_monitoring():
    monitor = SystemMonitor()
    
    print("="*60)
    print("系统监控测试")
    print("="*60)
    
    for i in range(10):
        inference_time = 0.5 + (i % 3) * 0.3
        success = i % 5 != 0
        monitor.record_inference(inference_time, success)
    
    monitor.record_user_feedback(
        user_id="user_001",
        item_id="item_001",
        feedback_type="positive",
        rating=5,
        comment="很好看！"
    )
    
    monitor.record_user_feedback(
        user_id="user_002",
        item_id="item_002",
        feedback_type="negative",
        rating=2,
        comment="不太适合"
    )
    
    print("\n健康状态:")
    health = monitor.check_health()
    print(json.dumps(asdict(health), indent=2, ensure_ascii=False))
    
    print("\n反馈统计:")
    feedback_stats = monitor.feedback_store.get_feedback_stats()
    print(json.dumps(feedback_stats, indent=2, ensure_ascii=False))
    
    print("\n系统报告:")
    report = monitor.generate_report()
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    test_monitoring()
