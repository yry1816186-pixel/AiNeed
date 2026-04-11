"""
联邦学习框架
保护隐私的分布式机器学习训练
支持客户端本地训练、安全聚合、差分隐私

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import numpy as np
from typing import Dict, List, Optional, Any, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib
import json
import threading
from collections import defaultdict


class AggregationStrategy(Enum):
    FED_AVG = "fed_avg"
    FED_PROX = "fed_prox"
    FED_SGD = "fed_sgd"
    FED_ADAM = "fed_adam"
    SCAFFOLD = "scaffold"


class PrivacyMechanism(Enum):
    NONE = "none"
    DIFFERENTIAL_PRIVACY = "differential_privacy"
    SECURE_AGGREGATION = "secure_aggregation"
    HOMOMORPHIC_ENCRYPTION = "homomorphic_encryption"


@dataclass
class FederatedConfig:
    num_rounds: int = 100
    min_clients_per_round: int = 10
    max_clients_per_round: int = 100
    client_fraction: float = 0.1
    local_epochs: int = 5
    learning_rate: float = 0.01
    aggregation_strategy: AggregationStrategy = AggregationStrategy.FED_AVG
    privacy_mechanism: PrivacyMechanism = PrivacyMechanism.DIFFERENTIAL_PRIVACY
    dp_epsilon: float = 1.0
    dp_delta: float = 1e-5
    dp_clip_norm: float = 1.0
    proximal_term: float = 0.01


@dataclass
class ClientUpdate:
    client_id: str
    round_number: int
    model_weights: Dict[str, np.ndarray]
    num_samples: int
    local_loss: float
    computation_time: float
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class AggregationResult:
    round_number: int
    aggregated_weights: Dict[str, np.ndarray]
    num_participants: int
    avg_loss: float
    privacy_budget_spent: float
    convergence_metric: float


@dataclass
class ClientInfo:
    client_id: str
    data_size: int
    last_update: datetime
    total_rounds: int = 0
    avg_loss: float = 0.0
    reliability_score: float = 1.0


class DifferentialPrivacy:
    """差分隐私机制"""

    def __init__(self, epsilon: float = 1.0, delta: float = 1e-5, clip_norm: float = 1.0):
        self.epsilon = epsilon
        self.delta = delta
        self.clip_norm = clip_norm
        self._privacy_budget_spent = 0.0

    def clip_gradients(
        self,
        gradients: Dict[str, np.ndarray]
    ) -> Dict[str, np.ndarray]:
        clipped = {}
        for name, grad in gradients.items():
            grad_norm = np.linalg.norm(grad)
            if grad_norm > self.clip_norm:
                clipped[name] = grad * (self.clip_norm / grad_norm)
            else:
                clipped[name] = grad
        return clipped

    def add_noise(
        self,
        weights: Dict[str, np.ndarray],
        sensitivity: float = 1.0
    ) -> Dict[str, np.ndarray]:
        noise_scale = sensitivity * np.sqrt(2 * np.log(1.25 / self.delta)) / self.epsilon

        noisy_weights = {}
        for name, weight in weights.items():
            noise = np.random.normal(0, noise_scale, weight.shape)
            noisy_weights[name] = weight + noise

        self._privacy_budget_spent += self.epsilon
        return noisy_weights

    def get_privacy_budget_spent(self) -> float:
        return self._privacy_budget_spent

    def compute_noise_scale(self, sensitivity: float = 1.0) -> float:
        return sensitivity * np.sqrt(2 * np.log(1.25 / self.delta)) / self.epsilon


class SecureAggregation:
    """安全聚合协议"""

    def __init__(self, num_clients: int = 100):
        self.num_clients = num_clients
        self._client_keys: Dict[str, np.ndarray] = {}
        self._pairwise_masks: Dict[Tuple[str, str], np.ndarray] = {}

    def generate_client_keys(self, client_id: str, weight_shapes: Dict[str, Tuple]):
        np.random.seed(hash(client_id) % (2**32))
        keys = {}
        for name, shape in weight_shapes.items():
            keys[name] = np.random.randn(*shape) * 0.01
        self._client_keys[client_id] = keys
        return keys

    def create_pairwise_masks(
        self,
        client_id: str,
        other_clients: List[str],
        weight_shapes: Dict[str, Tuple]
    ) -> Dict[str, Dict[str, np.ndarray]]:
        masks = {}
        for other_id in other_clients:
            if client_id < other_id:
                seed = hash(f"{client_id}:{other_id}") % (2**32)
                np.random.seed(seed)
                pair_masks = {}
                for name, shape in weight_shapes.items():
                    pair_masks[name] = np.random.randn(*shape) * 0.01
                masks[other_id] = pair_masks
            else:
                seed = hash(f"{other_id}:{client_id}") % (2**32)
                np.random.seed(seed)
                pair_masks = {}
                for name, shape in weight_shapes.items():
                    pair_masks[name] = -np.random.randn(*shape) * 0.01
                masks[other_id] = pair_masks

        return masks

    def mask_weights(
        self,
        weights: Dict[str, np.ndarray],
        client_id: str,
        pairwise_masks: Dict[str, Dict[str, np.ndarray]]
    ) -> Dict[str, np.ndarray]:
        masked = {name: w.copy() for name, w in weights.items()}

        for other_id, masks in pairwise_masks.items():
            for name, mask in masks.items():
                if name in masked:
                    masked[name] = masked[name] + mask

        return masked

    def verify_aggregation(
        self,
        aggregated: Dict[str, np.ndarray],
        expected_shape: Dict[str, Tuple]
    ) -> bool:
        for name, shape in expected_shape.items():
            if name not in aggregated:
                return False
            if aggregated[name].shape != shape:
                return False
        return True


class FederatedAggregator:
    """联邦聚合器"""

    def __init__(self, config: FederatedConfig):
        self.config = config
        self._global_weights: Dict[str, np.ndarray] = {}
        self._round_number = 0
        self._client_updates: List[ClientUpdate] = []
        self._aggregation_history: List[AggregationResult] = []

        if config.privacy_mechanism == PrivacyMechanism.DIFFERENTIAL_PRIVACY:
            self.dp = DifferentialPrivacy(
                epsilon=config.dp_epsilon,
                delta=config.dp_delta,
                clip_norm=config.dp_clip_norm
            )
        else:
            self.dp = None

        self.secure_agg = SecureAggregation()

    def initialize_global_model(self, weights: Dict[str, np.ndarray]):
        self._global_weights = {name: w.copy() for name, w in weights.items()}

    def receive_update(self, update: ClientUpdate):
        self._client_updates.append(update)

    def aggregate(self) -> AggregationResult:
        if not self._client_updates:
            return AggregationResult(
                round_number=self._round_number,
                aggregated_weights=self._global_weights,
                num_participants=0,
                avg_loss=0,
                privacy_budget_spent=0,
                convergence_metric=0
            )

        self._round_number += 1

        if self.config.aggregation_strategy == AggregationStrategy.FED_AVG:
            aggregated = self._fed_avg()
        elif self.config.aggregation_strategy == AggregationStrategy.FED_PROX:
            aggregated = self._fed_prox()
        else:
            aggregated = self._fed_avg()

        if self.dp:
            aggregated = self.dp.add_noise(aggregated)

        total_samples = sum(u.num_samples for u in self._client_updates)
        avg_loss = sum(u.local_loss * u.num_samples for u in self._client_updates) / total_samples

        convergence = self._compute_convergence(aggregated)

        result = AggregationResult(
            round_number=self._round_number,
            aggregated_weights=aggregated,
            num_participants=len(self._client_updates),
            avg_loss=avg_loss,
            privacy_budget_spent=self.dp.get_privacy_budget_spent() if self.dp else 0,
            convergence_metric=convergence
        )

        self._aggregation_history.append(result)
        self._global_weights = aggregated
        self._client_updates = []

        return result

    def _fed_avg(self) -> Dict[str, np.ndarray]:
        total_samples = sum(u.num_samples for u in self._client_updates)

        aggregated = {}
        for name in self._global_weights.keys():
            weighted_sum = np.zeros_like(self._global_weights[name])
            for update in self._client_updates:
                if name in update.model_weights:
                    weight = update.num_samples / total_samples
                    weighted_sum += weight * update.model_weights[name]
            aggregated[name] = weighted_sum

        return aggregated

    def _fed_prox(self) -> Dict[str, np.ndarray]:
        aggregated = self._fed_avg()

        for name in aggregated.keys():
            proximal_update = self.config.proximal_term * (
                aggregated[name] - self._global_weights[name]
            )
            aggregated[name] = aggregated[name] - proximal_update

        return aggregated

    def _compute_convergence(self, new_weights: Dict[str, np.ndarray]) -> float:
        if not self._global_weights:
            return 0

        total_diff = 0
        total_params = 0

        for name in new_weights.keys():
            if name in self._global_weights:
                diff = np.linalg.norm(new_weights[name] - self._global_weights[name])
                total_diff += diff
                total_params += new_weights[name].size

        return total_diff / max(total_params, 1)

    def get_global_weights(self) -> Dict[str, np.ndarray]:
        return {name: w.copy() for name, w in self._global_weights.items()}

    def get_history(self) -> List[AggregationResult]:
        return self._aggregation_history.copy()


class FederatedClient:
    """联邦学习客户端"""

    def __init__(
        self,
        client_id: str,
        config: FederatedConfig
    ):
        self.client_id = client_id
        self.config = config
        self._local_weights: Dict[str, np.ndarray] = {}
        self._local_data: Optional[Tuple[np.ndarray, np.ndarray]] = None
        self._round_number = 0
        self._training_history: List[Dict] = []

    def set_local_data(self, X: np.ndarray, y: np.ndarray):
        self._local_data = (X, y)

    def receive_global_weights(self, weights: Dict[str, np.ndarray]):
        self._local_weights = {name: w.copy() for name, w in weights.items()}

    def train_local_model(
        self,
        train_fn: Optional[Callable] = None
    ) -> ClientUpdate:
        if self._local_data is None:
            raise ValueError("No local data available")

        start_time = datetime.now()
        X, y = self._local_data
        num_samples = len(X)

        if train_fn:
            weights, loss = train_fn(
                self._local_weights,
                X, y,
                epochs=self.config.local_epochs,
                learning_rate=self.config.learning_rate
            )
        else:
            weights, loss = self._mock_train()

        computation_time = (datetime.now() - start_time).total_seconds()

        self._round_number += 1

        update = ClientUpdate(
            client_id=self.client_id,
            round_number=self._round_number,
            model_weights=weights,
            num_samples=num_samples,
            local_loss=loss,
            computation_time=computation_time
        )

        self._training_history.append({
            "round": self._round_number,
            "loss": loss,
            "samples": num_samples,
            "time": computation_time
        })

        return update

    def _mock_train(self) -> Tuple[Dict[str, np.ndarray], float]:
        weights = {}
        for name, w in self._local_weights.items():
            noise = np.random.randn(*w.shape) * 0.01
            weights[name] = w - self.config.learning_rate * noise

        loss = np.random.uniform(0.1, 0.5)

        return weights, loss


class FederatedCoordinator:
    """联邦学习协调器"""

    def __init__(self, config: FederatedConfig):
        self.config = config
        self.aggregator = FederatedAggregator(config)
        self._clients: Dict[str, FederatedClient] = {}
        self._client_info: Dict[str, ClientInfo] = {}
        self._round_in_progress = False
        self._lock = threading.Lock()

    def register_client(self, client_id: str, data_size: int) -> FederatedClient:
        client = FederatedClient(client_id, self.config)
        self._clients[client_id] = client
        self._client_info[client_id] = ClientInfo(
            client_id=client_id,
            data_size=data_size,
            last_update=datetime.now()
        )
        return client

    def initialize_model(self, model_weights: Dict[str, np.ndarray]):
        self.aggregator.initialize_global_model(model_weights)

    def select_clients(self) -> List[str]:
        num_clients = int(len(self._clients) * self.config.client_fraction)
        num_clients = max(
            self.config.min_clients_per_round,
            min(num_clients, self.config.max_clients_per_round)
        )

        sorted_clients = sorted(
            self._client_info.items(),
            key=lambda x: x[1].reliability_score,
            reverse=True
        )

        selected = [c[0] for c in sorted_clients[:num_clients]]

        if len(selected) < num_clients:
            remaining = [c for c in self._clients.keys() if c not in selected]
            np.random.shuffle(remaining)
            selected.extend(remaining[:num_clients - len(selected)])

        return selected

    async def run_round(self) -> AggregationResult:
        with self._lock:
            if self._round_in_progress:
                raise RuntimeError("Round already in progress")
            self._round_in_progress = True

        try:
            selected_clients = self.select_clients()
            global_weights = self.aggregator.get_global_weights()

            for client_id in selected_clients:
                client = self._clients[client_id]
                client.receive_global_weights(global_weights)

            for client_id in selected_clients:
                client = self._clients[client_id]
                update = client.train_local_model()
                self.aggregator.receive_update(update)

                self._client_info[client_id].last_update = datetime.now()
                self._client_info[client_id].total_rounds += 1

            result = self.aggregator.aggregate()

            self._update_client_reliability(selected_clients, result)

            return result

        finally:
            with self._lock:
                self._round_in_progress = False

    def _update_client_reliability(
        self,
        participants: List[str],
        result: AggregationResult
    ):
        for client_id in participants:
            info = self._client_info[client_id]
            if result.avg_loss > 0:
                reliability = 1.0 / (1.0 + result.avg_loss)
                info.reliability_score = (
                    0.9 * info.reliability_score + 0.1 * reliability
                )

    def get_global_weights(self) -> Dict[str, np.ndarray]:
        return self.aggregator.get_global_weights()

    def get_client_stats(self) -> Dict[str, Any]:
        return {
            "total_clients": len(self._clients),
            "active_clients": sum(
                1 for info in self._client_info.values()
                if (datetime.now() - info.last_update).total_seconds() < 3600
            ),
            "avg_data_size": np.mean([info.data_size for info in self._client_info.values()])
            if self._client_info else 0,
            "avg_reliability": np.mean([info.reliability_score for info in self._client_info.values()])
            if self._client_info else 0,
        }

    def get_training_progress(self) -> Dict[str, Any]:
        history = self.aggregator.get_history()
        if not history:
            return {"progress": "no_rounds_completed"}

        return {
            "rounds_completed": len(history),
            "latest_round": history[-1].round_number,
            "latest_loss": history[-1].avg_loss,
            "latest_participants": history[-1].num_participants,
            "convergence_trend": [h.convergence_metric for h in history[-10:]],
            "loss_trend": [h.avg_loss for h in history[-10:]],
            "privacy_budget_spent": history[-1].privacy_budget_spent,
        }


class FederatedLearningService:
    """联邦学习服务"""

    def __init__(self, config: FederatedConfig = None):
        self.config = config or FederatedConfig()
        self.coordinator = FederatedCoordinator(self.config)

    def initialize(self, initial_weights: Dict[str, np.ndarray]):
        self.coordinator.initialize_model(initial_weights)

    def register_client(self, client_id: str, data_size: int) -> str:
        self.coordinator.register_client(client_id, data_size)
        return client_id

    async def train_round(self) -> Dict[str, Any]:
        result = await self.coordinator.run_round()
        return {
            "round": result.round_number,
            "participants": result.num_participants,
            "avg_loss": result.avg_loss,
            "convergence": result.convergence_metric,
            "privacy_budget": result.privacy_budget_spent,
        }

    def get_model(self) -> Dict[str, np.ndarray]:
        return self.coordinator.get_global_weights()

    def get_status(self) -> Dict[str, Any]:
        return {
            "config": {
                "aggregation_strategy": self.config.aggregation_strategy.value,
                "privacy_mechanism": self.config.privacy_mechanism.value,
                "num_rounds": self.config.num_rounds,
            },
            "clients": self.coordinator.get_client_stats(),
            "progress": self.coordinator.get_training_progress(),
        }


def create_federated_service(
    aggregation_strategy: AggregationStrategy = AggregationStrategy.FED_AVG,
    privacy_mechanism: PrivacyMechanism = PrivacyMechanism.DIFFERENTIAL_PRIVACY,
    epsilon: float = 1.0
) -> FederatedLearningService:
    config = FederatedConfig(
        aggregation_strategy=aggregation_strategy,
        privacy_mechanism=privacy_mechanism,
        dp_epsilon=epsilon
    )
    return FederatedLearningService(config)


if __name__ == "__main__":
    import asyncio

    async def main():
        service = create_federated_service(
            aggregation_strategy=AggregationStrategy.FED_AVG,
            privacy_mechanism=PrivacyMechanism.DIFFERENTIAL_PRIVACY,
            epsilon=1.0
        )

        print("\n" + "="*60)
        print("联邦学习框架已初始化")
        print("="*60)

        initial_weights = {
            "layer1.weight": np.random.randn(64, 32).astype(np.float32) * 0.1,
            "layer1.bias": np.zeros(32, dtype=np.float32),
            "layer2.weight": np.random.randn(32, 16).astype(np.float32) * 0.1,
            "layer2.bias": np.zeros(16, dtype=np.float32),
        }

        service.initialize(initial_weights)
        print("\n全局模型已初始化")

        print("\n注册客户端:")
        for i in range(10):
            client_id = f"client_{i}"
            data_size = np.random.randint(100, 1000)
            service.register_client(client_id, data_size)
            print(f"  - {client_id}: {data_size} 样本")

        print("\n开始联邦训练:")
        for round_num in range(5):
            result = await service.train_round()
            print(f"\n轮次 {result['round']}:")
            print(f"  参与客户端: {result['participants']}")
            print(f"  平均损失: {result['avg_loss']:.4f}")
            print(f"  收敛指标: {result['convergence']:.6f}")
            print(f"  隐私预算消耗: {result['privacy_budget']:.4f}")

        print("\n训练状态:")
        status = service.get_status()
        print(json.dumps(status, indent=2, default=str))

    asyncio.run(main())
