"""
模型版本管理系统
支持模型版本控制、A/B测试、回滚、部署管理

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os

# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
# This workaround was causing runtime instability.

import json
import hashlib
import shutil
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
import threading
import numpy as np


class ModelStatus(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"


class DeploymentStrategy(Enum):
    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    ROLLING = "rolling"
    SHADOW = "shadow"


@dataclass
class ModelVersion:
    model_id: str
    version: str
    status: ModelStatus
    created_at: datetime
    created_by: str
    description: str
    file_path: str
    file_size_mb: float
    checksum: str
    metrics: Dict[str, float] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    parent_version: Optional[str] = None
    deployed_at: Optional[datetime] = None
    deployment_config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ABTestConfig:
    test_id: str
    model_a_version: str
    model_b_version: str
    traffic_split: float
    start_time: datetime
    end_time: Optional[datetime]
    metrics_to_track: List[str]
    status: str = "running"


@dataclass
class DeploymentRecord:
    deployment_id: str
    model_id: str
    version: str
    strategy: DeploymentStrategy
    status: str
    deployed_at: datetime
    deployed_by: str
    config: Dict[str, Any]
    rollback_version: Optional[str] = None


class ModelRegistry:
    """模型注册表"""

    def __init__(self, storage_path: str = "models/registry"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self._versions: Dict[str, Dict[str, ModelVersion]] = {}
        self._lock = threading.Lock()
        self._load_registry()

    def register_model(
        self,
        model_id: str,
        version: str,
        file_path: str,
        created_by: str = "system",
        description: str = "",
        metrics: Dict[str, float] = None,
        tags: List[str] = None,
        parent_version: str = None
    ) -> ModelVersion:
        with self._lock:
            if model_id not in self._versions:
                self._versions[model_id] = {}

            if version in self._versions[model_id]:
                raise ValueError(f"Version {version} already exists for model {model_id}")

            model_file = Path(file_path)
            if not model_file.exists():
                raise FileNotFoundError(f"Model file not found: {file_path}")

            file_size_mb = model_file.stat().st_size / (1024 * 1024)
            checksum = self._compute_checksum(file_path)

            stored_path = self._store_model_file(model_id, version, file_path)

            model_version = ModelVersion(
                model_id=model_id,
                version=version,
                status=ModelStatus.DEVELOPMENT,
                created_at=datetime.now(),
                created_by=created_by,
                description=description,
                file_path=str(stored_path),
                file_size_mb=file_size_mb,
                checksum=checksum,
                metrics=metrics or {},
                tags=tags or [],
                parent_version=parent_version
            )

            self._versions[model_id][version] = model_version
            self._save_registry()

            return model_version

    def get_version(
        self,
        model_id: str,
        version: str
    ) -> Optional[ModelVersion]:
        with self._lock:
            return self._versions.get(model_id, {}).get(version)

    def get_latest_version(self, model_id: str) -> Optional[ModelVersion]:
        with self._lock:
            if model_id not in self._versions:
                return None

            versions = list(self._versions[model_id].values())
            if not versions:
                return None

            return max(versions, key=lambda v: v.created_at)

    def get_production_version(self, model_id: str) -> Optional[ModelVersion]:
        with self._lock:
            if model_id not in self._versions:
                return None

            for version in self._versions[model_id].values():
                if version.status == ModelStatus.PRODUCTION:
                    return version

            return None

    def list_versions(
        self,
        model_id: str,
        status: Optional[ModelStatus] = None
    ) -> List[ModelVersion]:
        with self._lock:
            if model_id not in self._versions:
                return []

            versions = list(self._versions[model_id].values())

            if status:
                versions = [v for v in versions if v.status == status]

            return sorted(versions, key=lambda v: v.created_at, reverse=True)

    def update_status(
        self,
        model_id: str,
        version: str,
        new_status: ModelStatus
    ) -> bool:
        with self._lock:
            if model_id not in self._versions or version not in self._versions[model_id]:
                return False

            self._versions[model_id][version].status = new_status

            if new_status == ModelStatus.PRODUCTION:
                self._versions[model_id][version].deployed_at = datetime.now()

            self._save_registry()
            return True

    def update_metrics(
        self,
        model_id: str,
        version: str,
        metrics: Dict[str, float]
    ) -> bool:
        with self._lock:
            if model_id not in self._versions or version not in self._versions[model_id]:
                return False

            self._versions[model_id][version].metrics.update(metrics)
            self._save_registry()
            return True

    def _store_model_file(
        self,
        model_id: str,
        version: str,
        source_path: str
    ) -> Path:
        model_dir = self.storage_path / model_id / version
        model_dir.mkdir(parents=True, exist_ok=True)

        dest_path = model_dir / Path(source_path).name
        shutil.copy2(source_path, dest_path)

        return dest_path

    def _compute_checksum(self, file_path: str) -> str:
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hasher.update(chunk)
        return hasher.hexdigest()[:16]

    def _save_registry(self):
        registry_file = self.storage_path / "registry.json"
        data = {}

        for model_id, versions in self._versions.items():
            data[model_id] = {}
            for version, model_version in versions.items():
                data[model_id][version] = {
                    "model_id": model_version.model_id,
                    "version": model_version.version,
                    "status": model_version.status.value,
                    "created_at": model_version.created_at.isoformat(),
                    "created_by": model_version.created_by,
                    "description": model_version.description,
                    "file_path": model_version.file_path,
                    "file_size_mb": model_version.file_size_mb,
                    "checksum": model_version.checksum,
                    "metrics": model_version.metrics,
                    "tags": model_version.tags,
                    "parent_version": model_version.parent_version,
                    "deployed_at": model_version.deployed_at.isoformat() if model_version.deployed_at else None,
                }

        with open(registry_file, "w") as f:
            json.dump(data, f, indent=2)

    def _load_registry(self):
        registry_file = self.storage_path / "registry.json"
        if not registry_file.exists():
            return

        try:
            with open(registry_file, "r") as f:
                data = json.load(f)

            for model_id, versions in data.items():
                self._versions[model_id] = {}
                for version, vdata in versions.items():
                    self._versions[model_id][version] = ModelVersion(
                        model_id=vdata["model_id"],
                        version=vdata["version"],
                        status=ModelStatus(vdata["status"]),
                        created_at=datetime.fromisoformat(vdata["created_at"]),
                        created_by=vdata["created_by"],
                        description=vdata["description"],
                        file_path=vdata["file_path"],
                        file_size_mb=vdata["file_size_mb"],
                        checksum=vdata["checksum"],
                        metrics=vdata.get("metrics", {}),
                        tags=vdata.get("tags", []),
                        parent_version=vdata.get("parent_version"),
                        deployed_at=datetime.fromisoformat(vdata["deployed_at"]) if vdata.get("deployed_at") else None,
                    )
        except Exception as e:
            print(f"Error loading registry: {e}")


class ABTestManager:
    """A/B测试管理器"""

    def __init__(self):
        self._tests: Dict[str, ABTestConfig] = {}
        self._results: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_test(
        self,
        model_id: str,
        version_a: str,
        version_b: str,
        traffic_split: float = 0.5,
        duration_hours: int = 24,
        metrics_to_track: List[str] = None
    ) -> ABTestConfig:
        with self._lock:
            test_id = f"{model_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

            test_config = ABTestConfig(
                test_id=test_id,
                model_a_version=version_a,
                model_b_version=version_b,
                traffic_split=traffic_split,
                start_time=datetime.now(),
                end_time=datetime.now() + timedelta(hours=duration_hours),
                metrics_to_track=metrics_to_track or ["accuracy", "latency_ms"]
            )

            self._tests[test_id] = test_config
            self._results[test_id] = {
                "model_a": {"requests": 0, "metrics": {}},
                "model_b": {"requests": 0, "metrics": {}}
            }

            return test_config

    def get_test(self, test_id: str) -> Optional[ABTestConfig]:
        with self._lock:
            return self._tests.get(test_id)

    def record_result(
        self,
        test_id: str,
        model_version: str,
        metrics: Dict[str, float]
    ):
        with self._lock:
            if test_id not in self._results:
                return

            if "model_a" in test_id or model_version == self._tests[test_id].model_a_version:
                key = "model_a"
            else:
                key = "model_b"

            self._results[test_id][key]["requests"] += 1

            for metric_name, value in metrics.items():
                if metric_name not in self._results[test_id][key]["metrics"]:
                    self._results[test_id][key]["metrics"][metric_name] = []
                self._results[test_id][key]["metrics"][metric_name].append(value)

    def get_results(self, test_id: str) -> Dict[str, Any]:
        with self._lock:
            if test_id not in self._results:
                return {}

            results = self._results[test_id]
            summary = {}

            for model_key in ["model_a", "model_b"]:
                model_results = results[model_key]
                summary[model_key] = {
                    "total_requests": model_results["requests"],
                    "avg_metrics": {}
                }

                for metric, values in model_results["metrics"].items():
                    if values:
                        summary[model_key]["avg_metrics"][metric] = np.mean(values)

            return summary

    def end_test(self, test_id: str) -> Optional[str]:
        with self._lock:
            if test_id not in self._tests:
                return None

            test = self._tests[test_id]
            test.status = "completed"
            test.end_time = datetime.now()

            results = self.get_results(test_id)

            winner = None
            if results:
                metric_name = test.metrics_to_track[0] if test.metrics_to_track else "accuracy"

                a_score = results.get("model_a", {}).get("avg_metrics", {}).get(metric_name, 0)
                b_score = results.get("model_b", {}).get("avg_metrics", {}).get(metric_name, 0)

                if a_score > b_score:
                    winner = test.model_a_version
                elif b_score > a_score:
                    winner = test.model_b_version

            return winner

    def list_active_tests(self) -> List[ABTestConfig]:
        with self._lock:
            return [
                test for test in self._tests.values()
                if test.status == "running" and (test.end_time is None or datetime.now() < test.end_time)
            ]


class DeploymentManager:
    """部署管理器"""

    def __init__(self, registry: ModelRegistry):
        self.registry = registry
        self._deployments: List[DeploymentRecord] = []
        self._lock = threading.Lock()

    def deploy(
        self,
        model_id: str,
        version: str,
        strategy: DeploymentStrategy = DeploymentStrategy.ROLLING,
        deployed_by: str = "system",
        config: Dict[str, Any] = None
    ) -> DeploymentRecord:
        with self._lock:
            model_version = self.registry.get_version(model_id, version)
            if not model_version:
                raise ValueError(f"Model version not found: {model_id}@{version}")

            current_production = self.registry.get_production_version(model_id)
            rollback_version = current_production.version if current_production else None

            deployment_id = f"deploy_{datetime.now().strftime('%Y%m%d%H%M%S')}"

            deployment = DeploymentRecord(
                deployment_id=deployment_id,
                model_id=model_id,
                version=version,
                strategy=strategy,
                status="deploying",
                deployed_at=datetime.now(),
                deployed_by=deployed_by,
                config=config or {},
                rollback_version=rollback_version
            )

            self._deployments.append(deployment)

            if strategy == DeploymentStrategy.BLUE_GREEN:
                self._deploy_blue_green(model_id, version, rollback_version)
            elif strategy == DeploymentStrategy.CANARY:
                self._deploy_canary(model_id, version, config)
            else:
                self._deploy_rolling(model_id, version)

            deployment.status = "deployed"
            self.registry.update_status(model_id, version, ModelStatus.PRODUCTION)

            if rollback_version:
                self.registry.update_status(model_id, rollback_version, ModelStatus.DEPRECATED)

            return deployment

    def rollback(
        self,
        model_id: str,
        target_version: Optional[str] = None
    ) -> Optional[DeploymentRecord]:
        with self._lock:
            current_production = self.registry.get_production_version(model_id)
            if not current_production:
                return None

            if target_version is None:
                last_deployment = next(
                    (d for d in reversed(self._deployments)
                     if d.model_id == model_id and d.rollback_version),
                    None
                )
                if last_deployment:
                    target_version = last_deployment.rollback_version
                else:
                    return None

            target_model = self.registry.get_version(model_id, target_version)
            if not target_model:
                return None

            self.registry.update_status(model_id, current_production.version, ModelStatus.DEPRECATED)
            self.registry.update_status(model_id, target_version, ModelStatus.PRODUCTION)

            rollback_deployment = DeploymentRecord(
                deployment_id=f"rollback_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                model_id=model_id,
                version=target_version,
                strategy=DeploymentStrategy.ROLLING,
                status="rolled_back",
                deployed_at=datetime.now(),
                deployed_by="system",
                config={"rollback_from": current_production.version}
            )

            self._deployments.append(rollback_deployment)

            return rollback_deployment

    def _deploy_blue_green(
        self,
        model_id: str,
        version: str,
        old_version: Optional[str]
    ):
        pass

    def _deploy_canary(
        self,
        model_id: str,
        version: str,
        config: Dict[str, Any]
    ):
        pass

    def _deploy_rolling(
        self,
        model_id: str,
        version: str
    ):
        pass

    def get_deployment_history(
        self,
        model_id: str,
        limit: int = 10
    ) -> List[DeploymentRecord]:
        with self._lock:
            deployments = [
                d for d in self._deployments
                if d.model_id == model_id
            ]
            return sorted(deployments, key=lambda d: d.deployed_at, reverse=True)[:limit]


class ModelVersionManager:
    """模型版本管理主类"""

    def __init__(self, storage_path: str = "models/registry"):
        self.registry = ModelRegistry(storage_path)
        self.ab_test_manager = ABTestManager()
        self.deployment_manager = DeploymentManager(self.registry)

    def register_model(
        self,
        model_id: str,
        version: str,
        file_path: str,
        **kwargs
    ) -> ModelVersion:
        return self.registry.register_model(
            model_id=model_id,
            version=version,
            file_path=file_path,
            **kwargs
        )

    def deploy_model(
        self,
        model_id: str,
        version: str,
        strategy: DeploymentStrategy = DeploymentStrategy.ROLLING,
        **kwargs
    ) -> DeploymentRecord:
        return self.deployment_manager.deploy(
            model_id=model_id,
            version=version,
            strategy=strategy,
            **kwargs
        )

    def rollback(
        self,
        model_id: str,
        target_version: str = None
    ) -> Optional[DeploymentRecord]:
        return self.deployment_manager.rollback(model_id, target_version)

    def create_ab_test(
        self,
        model_id: str,
        version_a: str,
        version_b: str,
        **kwargs
    ) -> ABTestConfig:
        return self.ab_test_manager.create_test(
            model_id=model_id,
            version_a=version_a,
            version_b=version_b,
            **kwargs
        )

    def get_model_version(
        self,
        model_id: str,
        version: str = None
    ) -> Optional[ModelVersion]:
        if version:
            return self.registry.get_version(model_id, version)
        return self.registry.get_production_version(model_id)

    def list_model_versions(
        self,
        model_id: str,
        status: ModelStatus = None
    ) -> List[ModelVersion]:
        return self.registry.list_versions(model_id, status)

    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        versions = self.registry.list_versions(model_id)
        production = self.registry.get_production_version(model_id)
        latest = self.registry.get_latest_version(model_id)
        deployments = self.deployment_manager.get_deployment_history(model_id)

        return {
            "model_id": model_id,
            "total_versions": len(versions),
            "production_version": production.version if production else None,
            "latest_version": latest.version if latest else None,
            "versions": [
                {
                    "version": v.version,
                    "status": v.status.value,
                    "created_at": v.created_at.isoformat(),
                    "metrics": v.metrics
                }
                for v in versions
            ],
            "recent_deployments": [
                {
                    "deployment_id": d.deployment_id,
                    "version": d.version,
                    "status": d.status,
                    "deployed_at": d.deployed_at.isoformat()
                }
                for d in deployments[:5]
            ]
        }


def create_version_manager(storage_path: str = "models/registry") -> ModelVersionManager:
    return ModelVersionManager(storage_path)


if __name__ == "__main__":
    from datetime import timedelta

    manager = create_version_manager("models/registry")

    print("\n" + "="*60)
    print("模型版本管理系统已初始化")
    print("="*60)

    print("\n注册模型版本:")
    model_file = "models/style_classifier_v1.pt"
    Path("models").mkdir(exist_ok=True)
    Path(model_file).touch()

    v1 = manager.register_model(
        model_id="style_classifier",
        version="1.0.0",
        file_path=model_file,
        created_by="developer",
        description="Initial style classifier model",
        metrics={"accuracy": 0.85, "f1_score": 0.83},
        tags=["production", "stable"]
    )
    print(f"  注册版本: {v1.version}, 状态: {v1.status.value}")

    v2 = manager.register_model(
        model_id="style_classifier",
        version="1.1.0",
        file_path=model_file,
        created_by="developer",
        description="Improved style classifier",
        metrics={"accuracy": 0.88, "f1_score": 0.86},
        tags=["candidate"],
        parent_version="1.0.0"
    )
    print(f"  注册版本: {v2.version}, 状态: {v2.status.value}")

    print("\n部署模型:")
    deployment = manager.deploy_model(
        model_id="style_classifier",
        version="1.0.0",
        strategy=DeploymentStrategy.ROLLING,
        deployed_by="admin"
    )
    print(f"  部署ID: {deployment.deployment_id}")
    print(f"  状态: {deployment.status}")

    print("\n创建A/B测试:")
    ab_test = manager.create_ab_test(
        model_id="style_classifier",
        version_a="1.0.0",
        version_b="1.1.0",
        traffic_split=0.3,
        duration_hours=48
    )
    print(f"  测试ID: {ab_test.test_id}")
    print(f"  版本A: {ab_test.model_a_version}")
    print(f"  版本B: {ab_test.model_b_version}")

    print("\n记录测试结果:")
    manager.ab_test_manager.record_result(
        ab_test.test_id,
        "1.0.0",
        {"accuracy": 0.84, "latency_ms": 45}
    )
    manager.ab_test_manager.record_result(
        ab_test.test_id,
        "1.1.0",
        {"accuracy": 0.89, "latency_ms": 48}
    )

    results = manager.ab_test_manager.get_results(ab_test.test_id)
    print(f"  测试结果: {json.dumps(results, indent=4)}")

    print("\n模型信息:")
    info = manager.get_model_info("style_classifier")
    print(json.dumps(info, indent=2, default=str))
