"""
算法部署架构配置
定义本地、边缘、云端三层部署策略
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime


class DeploymentTier(Enum):
    LOCAL = "local"
    EDGE = "edge"
    CLOUD = "cloud"
    HYBRID = "hybrid"


class AlgorithmCategory(Enum):
    BODY_METRICS = "body_metrics"
    BODY_DETECTION = "body_detection"
    STYLE_RECOGNITION = "style_recognition"
    CLOTHING_SEGMENTATION = "clothing_segmentation"
    COLLABORATIVE_FILTERING = "collaborative_filtering"
    RECOMMENDATION = "recommendation"
    TREND_PREDICTION = "trend_prediction"
    AESTHETIC_SCORING = "aesthetic_scoring"
    VIRTUAL_TRYON = "virtual_tryon"
    VISUAL_SEARCH = "visual_search"
    PREFERENCE_TRACKING = "preference_tracking"


class ComputeRequirement(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class LatencyRequirement(Enum):
    REALTIME = "realtime"
    INTERACTIVE = "interactive"
    BATCH = "batch"


@dataclass
class AlgorithmConfig:
    name: str
    category: AlgorithmCategory
    deployment_tier: DeploymentTier
    compute_requirement: ComputeRequirement
    latency_requirement: LatencyRequirement
    model_size_mb: float
    offline_capable: bool
    privacy_sensitive: bool
    requires_global_data: bool
    fallback_algorithm: Optional[str] = None
    cache_ttl_seconds: int = 3600
    priority: int = 5
    tags: List[str] = field(default_factory=list)


@dataclass
class DeploymentConfig:
    tier: DeploymentTier
    max_model_size_mb: float
    max_latency_ms: int
    available_compute: str
    network_required: bool
    gpu_available: bool
    memory_limit_mb: int


ALGORITHM_DEPLOYMENT_CONFIG: Dict[str, AlgorithmConfig] = {
    "body_metrics_calculation": AlgorithmConfig(
        name="body_metrics_calculation",
        category=AlgorithmCategory.BODY_METRICS,
        deployment_tier=DeploymentTier.LOCAL,
        compute_requirement=ComputeRequirement.LOW,
        latency_requirement=LatencyRequirement.REALTIME,
        model_size_mb=0,
        offline_capable=True,
        privacy_sensitive=True,
        requires_global_data=False,
        cache_ttl_seconds=86400,
        priority=10,
        tags=["privacy", "realtime", "lightweight"]
    ),
    "body_shape_detection": AlgorithmConfig(
        name="body_shape_detection",
        category=AlgorithmCategory.BODY_DETECTION,
        deployment_tier=DeploymentTier.HYBRID,
        compute_requirement=ComputeRequirement.MEDIUM,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=150,
        offline_capable=True,
        privacy_sensitive=True,
        requires_global_data=False,
        fallback_algorithm="rule_based_body_detection",
        cache_ttl_seconds=3600,
        priority=9,
        tags=["privacy", "vision", "mediapipe"]
    ),
    "style_recognition": AlgorithmConfig(
        name="style_recognition",
        category=AlgorithmCategory.STYLE_RECOGNITION,
        deployment_tier=DeploymentTier.HYBRID,
        compute_requirement=ComputeRequirement.MEDIUM,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=300,
        offline_capable=True,
        privacy_sensitive=False,
        requires_global_data=False,
        fallback_algorithm="rule_based_style",
        cache_ttl_seconds=7200,
        priority=8,
        tags=["vision", "clip", "fashion"]
    ),
    "clothing_segmentation": AlgorithmConfig(
        name="clothing_segmentation",
        category=AlgorithmCategory.CLOTHING_SEGMENTATION,
        deployment_tier=DeploymentTier.CLOUD,
        compute_requirement=ComputeRequirement.HIGH,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=500,
        offline_capable=False,
        privacy_sensitive=False,
        requires_global_data=False,
        fallback_algorithm="grabcut_segmentation",
        cache_ttl_seconds=1800,
        priority=7,
        tags=["vision", "segmentation", "gpu"]
    ),
    "collaborative_filtering": AlgorithmConfig(
        name="collaborative_filtering",
        category=AlgorithmCategory.COLLABORATIVE_FILTERING,
        deployment_tier=DeploymentTier.CLOUD,
        compute_requirement=ComputeRequirement.HIGH,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=1000,
        offline_capable=False,
        privacy_sensitive=False,
        requires_global_data=True,
        fallback_algorithm="popular_items",
        cache_ttl_seconds=300,
        priority=8,
        tags=["recommendation", "matrix_factorization", "global_data"]
    ),
    "personalized_recommendation": AlgorithmConfig(
        name="personalized_recommendation",
        category=AlgorithmCategory.RECOMMENDATION,
        deployment_tier=DeploymentTier.CLOUD,
        compute_requirement=ComputeRequirement.HIGH,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=2000,
        offline_capable=False,
        privacy_sensitive=False,
        requires_global_data=True,
        fallback_algorithm="cached_recommendations",
        cache_ttl_seconds=600,
        priority=9,
        tags=["recommendation", "personalization", "ml"]
    ),
    "trend_prediction": AlgorithmConfig(
        name="trend_prediction",
        category=AlgorithmCategory.TREND_PREDICTION,
        deployment_tier=DeploymentTier.CLOUD,
        compute_requirement=ComputeRequirement.HIGH,
        latency_requirement=LatencyRequirement.BATCH,
        model_size_mb=500,
        offline_capable=False,
        privacy_sensitive=False,
        requires_global_data=True,
        cache_ttl_seconds=86400,
        priority=5,
        tags=["prediction", "timeseries", "global_data"]
    ),
    "aesthetic_scoring": AlgorithmConfig(
        name="aesthetic_scoring",
        category=AlgorithmCategory.AESTHETIC_SCORING,
        deployment_tier=DeploymentTier.CLOUD,
        compute_requirement=ComputeRequirement.MEDIUM,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=200,
        offline_capable=False,
        privacy_sensitive=False,
        requires_global_data=False,
        fallback_algorithm="rule_based_aesthetic",
        cache_ttl_seconds=3600,
        priority=6,
        tags=["aesthetic", "scoring", "vision"]
    ),
    "virtual_tryon": AlgorithmConfig(
        name="virtual_tryon",
        category=AlgorithmCategory.VIRTUAL_TRYON,
        deployment_tier=DeploymentTier.CLOUD,
        compute_requirement=ComputeRequirement.VERY_HIGH,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=5000,
        offline_capable=False,
        privacy_sensitive=True,
        requires_global_data=False,
        fallback_algorithm="overlay_preview",
        cache_ttl_seconds=0,
        priority=10,
        tags=["tryon", "gpu", "heavy_compute"]
    ),
    "visual_search": AlgorithmConfig(
        name="visual_search",
        category=AlgorithmCategory.VISUAL_SEARCH,
        deployment_tier=DeploymentTier.HYBRID,
        compute_requirement=ComputeRequirement.MEDIUM,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=300,
        offline_capable=True,
        privacy_sensitive=False,
        requires_global_data=True,
        fallback_algorithm="attribute_search",
        cache_ttl_seconds=1800,
        priority=7,
        tags=["search", "embedding", "clip"]
    ),
    "preference_tracking": AlgorithmConfig(
        name="preference_tracking",
        category=AlgorithmCategory.PREFERENCE_TRACKING,
        deployment_tier=DeploymentTier.LOCAL,
        compute_requirement=ComputeRequirement.LOW,
        latency_requirement=LatencyRequirement.REALTIME,
        model_size_mb=0,
        offline_capable=True,
        privacy_sensitive=True,
        requires_global_data=False,
        cache_ttl_seconds=60,
        priority=10,
        tags=["privacy", "tracking", "lightweight"]
    ),
    "color_analysis": AlgorithmConfig(
        name="color_analysis",
        category=AlgorithmCategory.STYLE_RECOGNITION,
        deployment_tier=DeploymentTier.LOCAL,
        compute_requirement=ComputeRequirement.LOW,
        latency_requirement=LatencyRequirement.REALTIME,
        model_size_mb=5,
        offline_capable=True,
        privacy_sensitive=False,
        requires_global_data=False,
        cache_ttl_seconds=7200,
        priority=8,
        tags=["color", "lightweight", "realtime"]
    ),
    "size_recommendation": AlgorithmConfig(
        name="size_recommendation",
        category=AlgorithmCategory.BODY_METRICS,
        deployment_tier=DeploymentTier.LOCAL,
        compute_requirement=ComputeRequirement.LOW,
        latency_requirement=LatencyRequirement.REALTIME,
        model_size_mb=0,
        offline_capable=True,
        privacy_sensitive=True,
        requires_global_data=False,
        cache_ttl_seconds=86400,
        priority=9,
        tags=["privacy", "sizing", "lightweight"]
    ),
    "outfit_compatibility": AlgorithmConfig(
        name="outfit_compatibility",
        category=AlgorithmCategory.RECOMMENDATION,
        deployment_tier=DeploymentTier.HYBRID,
        compute_requirement=ComputeRequirement.MEDIUM,
        latency_requirement=LatencyRequirement.INTERACTIVE,
        model_size_mb=200,
        offline_capable=True,
        privacy_sensitive=False,
        requires_global_data=False,
        fallback_algorithm="rule_based_compatibility",
        cache_ttl_seconds=1800,
        priority=7,
        tags=["outfit", "compatibility", "embedding"]
    ),
}

DEPLOYMENT_TIER_CONFIGS: Dict[DeploymentTier, DeploymentConfig] = {
    DeploymentTier.LOCAL: DeploymentConfig(
        tier=DeploymentTier.LOCAL,
        max_model_size_mb=100,
        max_latency_ms=100,
        available_compute="cpu",
        network_required=False,
        gpu_available=False,
        memory_limit_mb=512
    ),
    DeploymentTier.EDGE: DeploymentConfig(
        tier=DeploymentTier.EDGE,
        max_model_size_mb=500,
        max_latency_ms=500,
        available_compute="cpu_gpu",
        network_required=True,
        gpu_available=True,
        memory_limit_mb=2048
    ),
    DeploymentTier.CLOUD: DeploymentConfig(
        tier=DeploymentTier.CLOUD,
        max_model_size_mb=10000,
        max_latency_ms=5000,
        available_compute="cpu_gpu_tpu",
        network_required=True,
        gpu_available=True,
        memory_limit_mb=32768
    ),
    DeploymentTier.HYBRID: DeploymentConfig(
        tier=DeploymentTier.HYBRID,
        max_model_size_mb=300,
        max_latency_ms=300,
        available_compute="cpu_gpu",
        network_required=True,
        gpu_available=False,
        memory_limit_mb=1024
    ),
}


class AlgorithmDeploymentManager:
    """算法部署管理器"""

    def __init__(self):
        self.algorithm_configs = ALGORITHM_DEPLOYMENT_CONFIG
        self.tier_configs = DEPLOYMENT_TIER_CONFIGS
        self._deployment_status: Dict[str, Dict] = {}

    def get_algorithm_config(self, algorithm_name: str) -> Optional[AlgorithmConfig]:
        return self.algorithm_configs.get(algorithm_name)

    def get_deployment_tier(self, algorithm_name: str) -> DeploymentTier:
        config = self.get_algorithm_config(algorithm_name)
        return config.deployment_tier if config else DeploymentTier.CLOUD

    def should_run_locally(self, algorithm_name: str) -> bool:
        config = self.get_algorithm_config(algorithm_name)
        if not config:
            return False
        return config.deployment_tier in [DeploymentTier.LOCAL, DeploymentTier.HYBRID]

    def should_run_in_cloud(self, algorithm_name: str) -> bool:
        config = self.get_algorithm_config(algorithm_name)
        if not config:
            return True
        return config.deployment_tier in [DeploymentTier.CLOUD, DeploymentTier.HYBRID]

    def get_fallback_algorithm(self, algorithm_name: str) -> Optional[str]:
        config = self.get_algorithm_config(algorithm_name)
        return config.fallback_algorithm if config else None

    def can_run_offline(self, algorithm_name: str) -> bool:
        config = self.get_algorithm_config(algorithm_name)
        return config.offline_capable if config else False

    def get_algorithms_by_tier(self, tier: DeploymentTier) -> List[str]:
        return [
            name for name, config in self.algorithm_configs.items()
            if config.deployment_tier == tier
        ]

    def get_algorithms_by_category(self, category: AlgorithmCategory) -> List[str]:
        return [
            name for name, config in self.algorithm_configs.items()
            if config.category == category
        ]

    def get_local_algorithms(self) -> List[str]:
        return self.get_algorithms_by_tier(DeploymentTier.LOCAL)

    def get_cloud_algorithms(self) -> List[str]:
        return self.get_algorithms_by_tier(DeploymentTier.CLOUD)

    def get_hybrid_algorithms(self) -> List[str]:
        return self.get_algorithms_by_tier(DeploymentTier.HYBRID)

    def get_privacy_sensitive_algorithms(self) -> List[str]:
        return [
            name for name, config in self.algorithm_configs.items()
            if config.privacy_sensitive
        ]

    def get_realtime_algorithms(self) -> List[str]:
        return [
            name for name, config in self.algorithm_configs.items()
            if config.latency_requirement == LatencyRequirement.REALTIME
        ]

    def check_deployment_feasibility(
        self,
        algorithm_name: str,
        available_tier: DeploymentTier
    ) -> Dict[str, Any]:
        config = self.get_algorithm_config(algorithm_name)
        if not config:
            return {"feasible": False, "reason": "Algorithm not found"}

        tier_config = self.tier_configs.get(available_tier)

        issues = []

        if config.model_size_mb > tier_config.max_model_size_mb:
            issues.append(f"Model size {config.model_size_mb}MB exceeds limit {tier_config.max_model_size_mb}MB")

        if config.compute_requirement == ComputeRequirement.VERY_HIGH and available_tier == DeploymentTier.LOCAL:
            issues.append("Very high compute requirement not suitable for local deployment")

        if config.requires_global_data and available_tier == DeploymentTier.LOCAL:
            issues.append("Algorithm requires global data, cannot run locally")

        return {
            "feasible": len(issues) == 0,
            "issues": issues,
            "algorithm": algorithm_name,
            "requested_tier": available_tier.value,
            "recommended_tier": config.deployment_tier.value
        }

    def get_deployment_report(self) -> Dict[str, Any]:
        local = self.get_local_algorithms()
        cloud = self.get_cloud_algorithms()
        hybrid = self.get_hybrid_algorithms()

        return {
            "summary": {
                "total_algorithms": len(self.algorithm_configs),
                "local_count": len(local),
                "cloud_count": len(cloud),
                "hybrid_count": len(hybrid),
            },
            "by_tier": {
                "local": local,
                "cloud": cloud,
                "hybrid": hybrid,
            },
            "by_category": {
                category.value: self.get_algorithms_by_category(category)
                for category in AlgorithmCategory
            },
            "privacy_sensitive": self.get_privacy_sensitive_algorithms(),
            "realtime_capable": self.get_realtime_algorithms(),
            "offline_capable": [
                name for name, config in self.algorithm_configs.items()
                if config.offline_capable
            ],
        }


def get_deployment_manager() -> AlgorithmDeploymentManager:
    return AlgorithmDeploymentManager()


if __name__ == "__main__":
    manager = get_deployment_manager()

    print("\n" + "="*60)
    print("算法部署架构配置")
    print("="*60)

    report = manager.get_deployment_report()
    print(f"\n算法总数: {report['summary']['total_algorithms']}")
    print(f"本地部署: {report['summary']['local_count']} 个")
    print(f"云端部署: {report['summary']['cloud_count']} 个")
    print(f"混合部署: {report['summary']['hybrid_count']} 个")

    print("\n本地部署算法:")
    for alg in report['by_tier']['local']:
        config = manager.get_algorithm_config(alg)
        print(f"  - {alg}: {config.category.value}")

    print("\n云端部署算法:")
    for alg in report['by_tier']['cloud']:
        config = manager.get_algorithm_config(alg)
        print(f"  - {alg}: {config.category.value}")

    print("\n混合部署算法:")
    for alg in report['by_tier']['hybrid']:
        config = manager.get_algorithm_config(alg)
        print(f"  - {alg}: {config.category.value}")

    print("\n隐私敏感算法:")
    for alg in report['privacy_sensitive']:
        print(f"  - {alg}")

    print("\n可离线运行算法:")
    for alg in report['offline_capable']:
        print(f"  - {alg}")
