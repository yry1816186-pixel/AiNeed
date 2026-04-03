"""
Embedding Service for Fashion RAG
Supports FashionCLIP and other embedding models
2026 Standard Implementation

Features:
- Lazy loading of models
- Global model caching with LRU eviction (singleton pattern)
- Thread-safe model access with proper locking
- GPU memory monitoring and automatic cleanup
"""

import os
import json
import logging
import threading
import time
import weakref
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass, field
from collections import OrderedDict
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)


class LRUCache:
    """Thread-safe LRU cache with memory monitoring"""
    
    def __init__(self, max_size: int = 3, max_memory_gb: float = 4.0):
        self._cache: OrderedDict[str, Any] = OrderedDict()
        self._lock = threading.RLock()
        self._max_size = max_size
        self._max_memory_gb = max_memory_gb
        self._access_times: Dict[str, float] = {}
    
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                self._access_times[key] = time.time()
                return self._cache[key]
            return None
    
    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            else:
                while len(self._cache) >= self._max_size or self._get_gpu_memory_gb() > self._max_memory_gb:
                    if not self._cache:
                        break
                    oldest_key = next(iter(self._cache))
                    self._evict(oldest_key)
            self._cache[key] = value
            self._access_times[key] = time.time()
            logger.info(f"Model cached: {key}, cache size: {len(self._cache)}")
    
    def _evict(self, key: str) -> None:
        if key in self._cache:
            model_data = self._cache[key]
            if isinstance(model_data, dict) and "model" in model_data:
                try:
                    import torch
                    model = model_data["model"]
                    if hasattr(model, "to"):
                        model.to("cpu")
                    del model_data["model"]
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    logger.info(f"Evicted model from cache: {key}")
                except Exception as e:
                    logger.warning(f"Error evicting model {key}: {e}")
            del self._cache[key]
            self._access_times.pop(key, None)
    
    def _get_gpu_memory_gb(self) -> float:
        try:
            import torch
            if torch.cuda.is_available():
                return torch.cuda.memory_allocated() / (1024 ** 3)
        except Exception:
            pass
        return 0.0
    
    def clear(self) -> None:
        with self._lock:
            keys = list(self._cache.keys())
            for key in keys:
                self._evict(key)
            logger.info("Model cache cleared")
    
    def stats(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "cached_models": list(self._cache.keys()),
                "cache_size": len(self._cache),
                "max_cache_size": self._max_size,
                "gpu_memory_gb": self._get_gpu_memory_gb(),
                "max_memory_gb": self._max_memory_gb,
            }


_model_cache = LRUCache(max_size=3, max_memory_gb=4.0)
_model_cache_lock = threading.RLock()
_instance_creation_locks: Dict[str, threading.Lock] = {}


@dataclass
class EmbeddingConfig:
    """Configuration for embedding models"""
    model_name: str = "patrickjohncyh/fashion-clip"
    device: str = "auto"
    max_length: int = 77
    batch_size: int = 32
    normalize: bool = True
    cache_dir: Optional[str] = None
    max_cached_models: int = 3


def get_cached_model(model_name: str, model_class: str = "fashion_clip"):
    cache_key = f"{model_class}:{model_name}"
    return _model_cache.get(cache_key)


def set_cached_model(model_name: str, model_instance: Any, model_class: str = "fashion_clip"):
    cache_key = f"{model_class}:{model_name}"
    _model_cache.set(cache_key, model_instance)


def clear_model_cache():
    _model_cache.clear()
    logger.info("Model cache cleared")


def get_cache_stats() -> Dict[str, Any]:
    return _model_cache.stats()


class BaseEmbeddingModel(ABC):
    """Abstract base class for embedding models"""

    @abstractmethod
    def encode_text(self, texts: List[str]) -> np.ndarray:
        """Encode text to embeddings"""
        pass

    @abstractmethod
    def encode_image(self, images: List[Any]) -> np.ndarray:
        """Encode images to embeddings"""
        pass

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return embedding dimension"""
        pass


class FashionCLIPEmbeddingModel(BaseEmbeddingModel):
    """
    FashionCLIP Embedding Model
    Fashion-domain specific CLIP model for better fashion understanding

    Uses global model caching to avoid reloading models on each request.
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or EmbeddingConfig()
        self._model = None
        self._processor = None
        self._device = self._get_device()
        self._dimension = 512  # FashionCLIP default
        self._loaded = False

    def _get_device(self) -> str:
        if self.config.device == "auto":
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        return self.config.device

    def _load_model(self):
        """Lazy load model on first use with global caching"""
        if self._model is not None and self._processor is not None:
            return

        # Check global cache first
        cache_key_model = f"{self.config.model_name}:model"
        cache_key_processor = f"{self.config.model_name}:processor"

        cached_model = get_cached_model(self.config.model_name, "fashion_clip")
        if cached_model is not None:
            self._model = cached_model.get("model")
            self._processor = cached_model.get("processor")
            self._dimension = cached_model.get("dimension", 512)
            self._loaded = True
            logger.info(f"Using cached FashionCLIP model: {self.config.model_name}")
            return

        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor

            logger.info(f"Loading FashionCLIP model: {self.config.model_name}")

            self._model = CLIPModel.from_pretrained(
                self.config.model_name,
                cache_dir=self.config.cache_dir
            )
            self._processor = CLIPProcessor.from_pretrained(
                self.config.model_name,
                cache_dir=self.config.cache_dir
            )

            self._model.to(self._device)
            self._model.eval()

            # Get actual dimension
            self._dimension = self._model.config.projection_dim

            # Store in global cache
            set_cached_model(
                self.config.model_name,
                {
                    "model": self._model,
                    "processor": self._processor,
                    "dimension": self._dimension,
                    "device": self._device
                },
                "fashion_clip"
            )

            self._loaded = True
            logger.info(f"FashionCLIP loaded on {self._device}, dimension: {self._dimension}")

        except Exception as e:
            logger.error(f"Failed to load FashionCLIP: {e}")
            raise

    def encode_text(self, texts: List[str]) -> np.ndarray:
        """
        Encode text to embeddings

        Args:
            texts: List of text strings

        Returns:
            numpy array of shape (len(texts), dimension)
        """
        self._load_model()

        import torch

        all_embeddings = []

        for i in range(0, len(texts), self.config.batch_size):
            batch_texts = texts[i:i + self.config.batch_size]

            inputs = self._processor(
                text=batch_texts,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=self.config.max_length
            )

            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with torch.no_grad():
                text_features = self._model.get_text_features(**inputs)

                if self.config.normalize:
                    text_features = torch.nn.functional.normalize(text_features, dim=-1)

                all_embeddings.append(text_features.cpu().numpy())

        return np.vstack(all_embeddings)

    def encode_image(self, images: List[Any]) -> np.ndarray:
        """
        Encode images to embeddings

        Args:
            images: List of PIL Images or image paths

        Returns:
            numpy array of shape (len(images), dimension)
        """
        self._load_model()

        import torch
        from PIL import Image

        processed_images = []
        for img in images:
            if isinstance(img, str):
                img = Image.open(img).convert('RGB')
            elif not isinstance(img, Image.Image):
                img = Image.fromarray(img).convert('RGB')
            processed_images.append(img)

        all_embeddings = []

        for i in range(0, len(processed_images), self.config.batch_size):
            batch_images = processed_images[i:i + self.config.batch_size]

            inputs = self._processor(
                images=batch_images,
                return_tensors="pt",
                padding=True
            )

            inputs = {k: v.to(self._device) for k, v in inputs.items() if k != "text"}

            with torch.no_grad():
                image_features = self._model.get_image_features(**inputs)

                if self.config.normalize:
                    image_features = torch.nn.functional.normalize(image_features, dim=-1)

                all_embeddings.append(image_features.cpu().numpy())

        return np.vstack(all_embeddings)

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._loaded


class TextEmbeddingModel(BaseEmbeddingModel):
    """
    Text-only embedding model using sentence-transformers
    Fallback for systems without image support

    Uses global model caching to avoid reloading models on each request.
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or EmbeddingConfig(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        self._model = None
        self._dimension = 384
        self._loaded = False

    def _load_model(self):
        if self._model is not None:
            return

        # Check global cache first
        cached_model = get_cached_model(self.config.model_name, "text")
        if cached_model is not None:
            self._model = cached_model.get("model")
            self._dimension = cached_model.get("dimension", 384)
            self._loaded = True
            logger.info(f"Using cached text embedding model: {self.config.model_name}")
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info(f"Loading text embedding model: {self.config.model_name}")

            self._model = SentenceTransformer(
                self.config.model_name,
                cache_folder=self.config.cache_dir
            )
            self._dimension = self._model.get_sentence_embedding_dimension()

            # Store in global cache
            set_cached_model(
                self.config.model_name,
                {
                    "model": self._model,
                    "dimension": self._dimension
                },
                "text"
            )

            self._loaded = True
            logger.info(f"Text model loaded, dimension: {self._dimension}")

        except Exception as e:
            logger.error(f"Failed to load text model: {e}")
            raise

    def encode_text(self, texts: List[str]) -> np.ndarray:
        self._load_model()

        embeddings = self._model.encode(
            texts,
            batch_size=self.config.batch_size,
            normalize_embeddings=self.config.normalize,
            show_progress_bar=False
        )

        return np.array(embeddings)

    def encode_image(self, images: List[Any]) -> np.ndarray:
        raise NotImplementedError("Text-only model does not support image encoding")

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._loaded


class EmbeddingService:
    """
    Unified Embedding Service
    Manages embedding models and provides a simple interface

    Features:
    - Lazy loading of models
    - Global model caching (singleton pattern)
    - Thread-safe model access
    - Preload function for service startup
    """

    # Global service instance for singleton pattern
    _instance: Optional['EmbeddingService'] = None
    _instance_lock = threading.Lock()
    # Lock for model property access (thread-safe lazy loading)
    _model_lock = threading.Lock()

    def __init__(
        self,
        model_type: str = "fashion_clip",
        config: Optional[EmbeddingConfig] = None
    ):
        """
        Initialize embedding service

        Args:
            model_type: Type of embedding model ('fashion_clip', 'text')
            config: Embedding configuration
        """
        self.config = config or EmbeddingConfig()
        self.model_type = model_type
        self._model: Optional[BaseEmbeddingModel] = None

    @classmethod
    def get_instance(cls, model_type: str = "fashion_clip", config: Optional[EmbeddingConfig] = None) -> 'EmbeddingService':
        """
        Get the global EmbeddingService instance (singleton pattern).
        Thread-safe implementation with double-checked locking.

        Args:
            model_type: Type of embedding model
            config: Embedding configuration

        Returns:
            EmbeddingService instance
        """
        # Double-checked locking pattern for thread safety
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls(model_type, config)
        return cls._instance

    @classmethod
    def reset_instance(cls):
        """
        Reset the singleton instance (useful for testing).
        Thread-safe implementation.
        """
        with cls._instance_lock:
            cls._instance = None

    @classmethod
    def preload_models(cls, config: Optional[EmbeddingConfig] = None):
        """
        Preload all models at service startup.

        Call this function when starting the service to ensure
        models are loaded and cached before handling requests.

        Args:
            config: Embedding configuration
        """
        logger.info("Preloading embedding models...")

        config = config or EmbeddingConfig()

        # Preload FashionCLIP
        fashion_clip = FashionCLIPEmbeddingModel(config)
        fashion_clip._load_model()
        logger.info("FashionCLIP model preloaded")

        # Preload text model
        text_config = EmbeddingConfig(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
        text_model = TextEmbeddingModel(text_config)
        text_model._load_model()
        logger.info("Text embedding model preloaded")

        logger.info("All embedding models preloaded successfully")

    @property
    def model(self) -> BaseEmbeddingModel:
        """
        Lazy load the model with thread-safe access.
        Uses double-checked locking pattern for thread safety.
        """
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    if self.model_type == "fashion_clip":
                        self._model = FashionCLIPEmbeddingModel(self.config)
                    elif self.model_type == "text":
                        self._model = TextEmbeddingModel(self.config)
                    else:
                        raise ValueError(f"Unknown model type: {self.model_type}")
        return self._model

    def encode_texts(self, texts: List[str]) -> np.ndarray:
        """
        Encode multiple texts to embeddings

        Args:
            texts: List of text strings

        Returns:
            numpy array of embeddings
        """
        return self.model.encode_text(texts)

    def encode_text(self, text: str) -> np.ndarray:
        """Encode single text to embedding"""
        return self.model.encode_text([text])[0]

    def encode_images(self, images: List[Any]) -> np.ndarray:
        """
        Encode multiple images to embeddings

        Args:
            images: List of PIL Images or image paths

        Returns:
            numpy array of embeddings
        """
        return self.model.encode_image(images)

    def encode_image(self, image: Any) -> np.ndarray:
        """Encode single image to embedding"""
        return self.model.encode_image([image])[0]

    @property
    def dimension(self) -> int:
        """Get embedding dimension"""
        return self.model.dimension

    def create_knowledge_text(
        self,
        knowledge_item: Dict[str, Any],
        include_metadata: bool = True
    ) -> str:
        """
        Create a text representation of a knowledge item for embedding

        Args:
            knowledge_item: Dictionary containing knowledge data
            include_metadata: Whether to include metadata in the text

        Returns:
            Text representation of the knowledge
        """
        parts = []

        # Main content
        if "name" in knowledge_item:
            parts.append(f"名称: {knowledge_item['name']}")

        if "description" in knowledge_item:
            parts.append(f"描述: {knowledge_item['description']}")

        # Characteristics
        if "characteristics" in knowledge_item:
            chars = knowledge_item["characteristics"]
            if isinstance(chars, list):
                parts.append(f"特征: {', '.join(chars)}")

        # Goals
        if "goals" in knowledge_item:
            goals = knowledge_item["goals"]
            if isinstance(goals, list):
                parts.append(f"目标: {', '.join(goals)}")

        # Styles
        if "suitable_styles" in knowledge_item:
            styles = knowledge_item["suitable_styles"]
            if isinstance(styles, dict):
                for category, items in styles.items():
                    if isinstance(items, list) and category != "avoid":
                        parts.append(f"适合的{category}: {', '.join(items)}")

        # Tips
        if "style_tips" in knowledge_item:
            tips = knowledge_item["style_tips"]
            if isinstance(tips, list):
                parts.append(f"穿搭建议: {'; '.join(tips)}")

        # Colors
        if "best_colors" in knowledge_item:
            colors = knowledge_item["best_colors"]
            if isinstance(colors, list):
                parts.append(f"最佳颜色: {', '.join(colors)}")

        if "avoid_colors" in knowledge_item:
            colors = knowledge_item["avoid_colors"]
            if isinstance(colors, list):
                parts.append(f"避免颜色: {', '.join(colors)}")

        # Keywords
        if "keywords" in knowledge_item:
            keywords = knowledge_item["keywords"]
            if isinstance(keywords, list):
                parts.append(f"关键词: {', '.join(keywords)}")

        # Recommended items
        if "recommended" in knowledge_item:
            rec = knowledge_item["recommended"]
            if isinstance(rec, dict):
                for category, items in rec.items():
                    if isinstance(items, list):
                        parts.append(f"推荐{category}: {', '.join(items)}")

        # Occasions
        if "occasions" in knowledge_item:
            occasions = knowledge_item["occasions"]
            if isinstance(occasions, list):
                parts.append(f"适合场合: {', '.join(occasions)}")

        # Pairing suggestions
        if "pairing" in knowledge_item:
            pairing = knowledge_item["pairing"]
            if isinstance(pairing, list):
                parts.append(f"搭配建议: {', '.join(pairing)}")

        # Additional tips
        if "tips" in knowledge_item:
            tips = knowledge_item["tips"]
            if isinstance(tips, list):
                parts.append(f"小贴士: {'; '.join(tips)}")

        return "\n".join(parts)
