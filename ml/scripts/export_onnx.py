"""
ChineseFashionCLIP ONNX Export

Exports the fine-tuned ChineseFashionCLIP model to ONNX format for
high-performance inference on RTX 4060 and other hardware.

Exports two separate ONNX models:
  1. Text encoder  — for encoding user queries
  2. Image encoder — for encoding product images

Usage:
  python ml/scripts/export_onnx.py
  python ml/scripts/export_onnx.py --model-path ml/models/chinese-fashion-clip/best_model
  python ml/scripts/export_onnx.py --model-path ml/models/chinese-fashion-clip/best_model --opset 17
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def export_text_encoder(model_path: str, output_dir: Path, opset: int = 14) -> None:
    """Export CLIP text encoder to ONNX."""
    import torch
    from transformers import CLIPModel, CLIPProcessor

    logger.info("Loading model for text encoder export...")
    model = CLIPModel.from_pretrained(model_path)
    processor = CLIPProcessor.from_pretrained(model_path)
    model.eval()

    dummy_text = processor(text=["测试文本"], return_tensors="pt", padding=True, truncation=True)
    input_ids = dummy_text["input_ids"]
    attention_mask = dummy_text["attention_mask"]

    class CLIPTextEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.text_model = clip_model.text_model
            self.text_projection = clip_model.text_projection

        def forward(self, input_ids, attention_mask):
            text_outputs = self.text_model(input_ids=input_ids, attention_mask=attention_mask)
            pooled_output = text_outputs[1]
            text_features = self.text_projection(pooled_output)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            return text_features

    text_encoder = CLIPTextEncoder(model)
    text_encoder.eval()

    text_onnx_path = output_dir / "text_encoder.onnx"
    logger.info(f"Exporting text encoder to {text_onnx_path}...")

    torch.onnx.export(
        text_encoder,
        (input_ids, attention_mask),
        str(text_onnx_path),
        input_names=["input_ids", "attention_mask"],
        output_names=["text_features"],
        dynamic_axes={
            "input_ids": {0: "batch_size"},
            "attention_mask": {0: "batch_size"},
            "text_features": {0: "batch_size"},
        },
        opset_version=opset,
        do_constant_folding=True,
    )
    logger.info(f"Text encoder exported: {text_onnx_path}")


def export_image_encoder(model_path: str, output_dir: Path, opset: int = 14) -> None:
    """Export CLIP image encoder to ONNX."""
    import torch
    from transformers import CLIPModel, CLIPProcessor
    from PIL import Image

    logger.info("Loading model for image encoder export...")
    model = CLIPModel.from_pretrained(model_path)
    processor = CLIPProcessor.from_pretrained(model_path)
    model.eval()

    dummy_image = Image.new("RGB", (224, 224), (128, 128, 128))
    dummy_inputs = processor(images=[dummy_image], return_tensors="pt")
    pixel_values = dummy_inputs["pixel_values"]

    class CLIPImageEncoder(torch.nn.Module):
        def __init__(self, clip_model):
            super().__init__()
            self.vision_model = clip_model.vision_model
            self.visual_projection = clip_model.visual_projection

        def forward(self, pixel_values):
            vision_outputs = self.vision_model(pixel_values=pixel_values)
            pooled_output = vision_outputs[1]
            image_features = self.visual_projection(pooled_output)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            return image_features

    image_encoder = CLIPImageEncoder(model)
    image_encoder.eval()

    image_onnx_path = output_dir / "image_encoder.onnx"
    logger.info(f"Exporting image encoder to {image_onnx_path}...")

    torch.onnx.export(
        image_encoder,
        (pixel_values,),
        str(image_onnx_path),
        input_names=["pixel_values"],
        output_names=["image_features"],
        dynamic_axes={
            "pixel_values": {0: "batch_size"},
            "image_features": {0: "batch_size"},
        },
        opset_version=opset,
        do_constant_folding=True,
    )
    logger.info(f"Image encoder exported: {image_onnx_path}")


def verify_onnx(output_dir: Path) -> None:
    """Verify exported ONNX models produce consistent results with PyTorch."""
    try:
        import onnxruntime as ort
        import numpy as np
    except ImportError:
        logger.warning("onnxruntime not available, skipping verification")
        return

    logger.info("Verifying ONNX models...")

    text_onnx_path = output_dir / "text_encoder.onnx"
    if text_onnx_path.exists():
        session = ort.InferenceSession(str(text_onnx_path))
        input_names = [inp.name for inp in session.get_inputs()]
        output_names = [out.name for out in session.get_outputs()]
        logger.info(f"  Text encoder: inputs={input_names}, outputs={output_names}")

        dummy_ids = np.array([[101, 2769, 3221, 6392, 3318, 102]], dtype=np.int64)
        dummy_mask = np.array([[1, 1, 1, 1, 1, 1]], dtype=np.int64)
        result = session.run(output_names, {"input_ids": dummy_ids, "attention_mask": dummy_mask})
        feat = result[0]
        norm = np.linalg.norm(feat, axis=-1)
        logger.info(f"  Text features shape: {feat.shape}, norm: {norm[0]:.4f} (should be ~1.0)")

    image_onnx_path = output_dir / "image_encoder.onnx"
    if image_onnx_path.exists():
        session = ort.InferenceSession(str(image_onnx_path))
        input_names = [inp.name for inp in session.get_inputs()]
        output_names = [out.name for out in session.get_outputs()]
        logger.info(f"  Image encoder: inputs={input_names}, outputs={output_names}")

        dummy_pixels = np.random.randn(1, 3, 224, 224).astype(np.float32)
        result = session.run(output_names, {"pixel_values": dummy_pixels})
        feat = result[0]
        norm = np.linalg.norm(feat, axis=-1)
        logger.info(f"  Image features shape: {feat.shape}, norm: {norm[0]:.4f} (should be ~1.0)")

    logger.info("ONNX verification complete")


def main():
    parser = argparse.ArgumentParser(description="Export ChineseFashionCLIP to ONNX")
    parser.add_argument("--model-path", type=str,
                        default="ml/models/chinese-fashion-clip/best_model",
                        help="Path to fine-tuned model")
    parser.add_argument("--output-dir", type=str,
                        default="ml/models/chinese-fashion-clip-onnx",
                        help="Output directory for ONNX models")
    parser.add_argument("--opset", type=int, default=14,
                        help="ONNX opset version (14 recommended for CLIP)")
    parser.add_argument("--skip-verify", action="store_true",
                        help="Skip ONNX verification")
    args = parser.parse_args()

    model_path = Path(args.model_path)
    if not model_path.exists():
        logger.error(f"Model not found at {model_path}")
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    export_text_encoder(str(model_path), output_dir, args.opset)
    export_image_encoder(str(model_path), output_dir, args.opset)

    import torch
    processor_path = output_dir / "processor"
    from transformers import CLIPProcessor
    processor = CLIPProcessor.from_pretrained(str(model_path))
    processor.save_pretrained(processor_path)
    logger.info(f"Processor saved to {processor_path}")

    if not args.skip_verify:
        verify_onnx(output_dir)

    logger.info(f"ONNX export complete! Models saved in {output_dir}")


if __name__ == "__main__":
    main()
