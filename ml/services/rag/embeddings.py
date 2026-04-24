import logging
import os
from typing import List, Optional, Union
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

_CHINESE_FASHION_CLIP_PATH = Path(__file__).parent.parent.parent / "models" / "chinese-fashion-clip" / "best_model"


def _resolve_default_model() -> str:
    if os.getenv("EMBEDDING_MODEL"):
        return os.getenv("EMBEDDING_MODEL")
    if _CHINESE_FASHION_CLIP_PATH.exists() and (_CHINESE_FASHION_CLIP_PATH / "config.json").exists():
        logger.info(f"Auto-detected ChineseFashionCLIP at {_CHINESE_FASHION_CLIP_PATH}")
        return str(_CHINESE_FASHION_CLIP_PATH)
    return "patrickjohncyh/fashion-clip"


_DEFAULT_MODEL = _resolve_default_model()


@dataclass
class EmbeddingConfig:
    model_name: str = ""
    dimension: int = 512
    batch_size: int = 32
    device: str = "auto"
    normalize: bool = True

    def __post_init__(self):
        if not self.model_name:
            self.model_name = _DEFAULT_MODEL


class EmbeddingService:
    def __init__(self, model_name: str = "", config: Optional[EmbeddingConfig] = None, model_type: str = "fashion_clip"):
        self.config = config or EmbeddingConfig(model_name=model_name)
        if not self.config.model_name:
            self.config.model_name = _DEFAULT_MODEL
        if self.config.device == "auto":
            try:
                import torch
                self.config.device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                self.config.device = "cpu"
        self._model = None
        self._processor = None
        model_display = self.config.model_name
        if "chinese-fashion-clip" in model_display:
            model_display = f"ChineseFashionCLIP ({model_display})"
        logger.info(f"EmbeddingService initialized with model={model_display}, device={self.config.device}")

    def _load_model(self):
        if self._model is None:
            try:
                from transformers import CLIPModel, CLIPProcessor
                import torch
                self._model = CLIPModel.from_pretrained(self.config.model_name)
                self._processor = CLIPProcessor.from_pretrained(self.config.model_name)
                self._model.to(self.config.device)
                self._model.eval()
                model_label = "ChineseFashionCLIP" if "chinese-fashion-clip" in self.config.model_name else "FashionCLIP"
                logger.info(f"{model_label} loaded on {self.config.device}")
            except ImportError as e:
                raise RuntimeError(
                    f"FashionCLIP dependencies not available: {e}. "
                    f"Install: pip install transformers torch"
                )
            except Exception as e:
                raise RuntimeError(f"Failed to load FashionCLIP model: {e}")

    def encode_text(self, texts: List[str]) -> List[List[float]]:
        self._load_model()
        import torch
        inputs = self._processor(text=texts, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(self.config.device) for k, v in inputs.items()}
        with torch.no_grad():
            features = self._model.get_text_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().tolist()

    def encode_image(self, images: Union[List[str], List]) -> List[List[float]]:
        self._load_model()
        import torch
        from PIL import Image
        if images and isinstance(images[0], str):
            images = [Image.open(img).convert("RGB") for img in images]
        inputs = self._processor(images=images, return_tensors="pt", padding=True)
        inputs = {k: v.to(self.config.device) for k, v in inputs.items()}
        with torch.no_grad():
            features = self._model.get_image_features(**inputs)
        features = features / features.norm(dim=-1, keepdim=True)
        return features.cpu().tolist()

    def encode(self, texts: List[str], batch_size: int = None) -> List[List[float]]:
        return self.encode_text(texts)

    def encode_query(self, query: str) -> List[float]:
        result = self.encode_text([query])
        return result[0]

    def encode_texts(self, texts: List[str]) -> List[List[float]]:
        return self.encode_text(texts)
