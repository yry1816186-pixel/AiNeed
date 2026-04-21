import logging
from typing import List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingConfig:
    model_name: str = "BAAI/bge-small-zh-v1.5"
    dimension: int = 512
    batch_size: int = 32
    device: str = "cpu"
    normalize: bool = True


class EmbeddingService:
    def __init__(self, model_name: str = "BAAI/bge-small-zh-v1.5", config: Optional[EmbeddingConfig] = None):
        self.config = config or EmbeddingConfig(model_name=model_name)
        self._model = None
        logger.info(f"EmbeddingService initialized with model={self.config.model_name}")

    def _load_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.config.model_name, device=self.config.device)
                logger.info(f"Loaded embedding model: {self.config.model_name}")
            except ImportError:
                logger.warning("sentence_transformers not available, using random embeddings")
                self._model = "fallback"

    def encode(self, texts: List[str], batch_size: int = None) -> List[List[float]]:
        self._load_model()
        bs = batch_size or self.config.batch_size
        if self._model == "fallback":
            import numpy as np
            return [np.random.randn(self.config.dimension).tolist() for _ in texts]
        embeddings = self._model.encode(texts, batch_size=bs, normalize_embeddings=self.config.normalize)
        return embeddings.tolist()

    def encode_query(self, query: str) -> List[float]:
        result = self.encode([query])
        return result[0]
