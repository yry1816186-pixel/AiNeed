"""
服装分割服务
使用深度学习模型进行服装图像分割
支持语义分割、实例分割、以及服装部件分割

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from pathlib import Path
from PIL import Image
import cv2
from enum import Enum


class ClothingPart(Enum):
    UPPER_BODY = "upper_body"
    LOWER_BODY = "lower_body"
    FULL_BODY = "full_body"
    OUTERWEAR = "outerwear"
    DRESS = "dress"
    FOOTWEAR = "footwear"
    ACCESSORY = "accessory"


@dataclass
class SegmentationResult:
    mask: np.ndarray
    bbox: Tuple[int, int, int, int]
    category: str
    confidence: float
    area_ratio: float
    contour_points: List[Tuple[int, int]]


@dataclass
class ClothingSegmentation:
    original_image: np.ndarray
    segmentation_mask: np.ndarray
    clothing_items: List[SegmentationResult]
    background_mask: np.ndarray
    person_mask: Optional[np.ndarray]
    parsed_result: Dict[str, Any]


class ClothingSegmenter:
    """
    服装分割器
    支持多种分割方法：
    1. 基于语义分割的服装解析
    2. 基于实例分割的多服装检测
    3. 基于GrabCut的前景分割
    """

    CLOTHING_CATEGORIES = {
        'top': ['shirt', 'blouse', 't-shirt', 'sweater', 'hoodie', 'jacket', 'coat'],
        'bottom': ['pants', 'jeans', 'shorts', 'skirt', 'trousers'],
        'dress': ['dress', 'gown', 'jumpsuit'],
        'outerwear': ['jacket', 'coat', 'blazer', 'cardigan', 'vest'],
        'footwear': ['shoes', 'boots', 'sneakers', 'heels', 'sandals'],
        'accessory': ['bag', 'hat', 'scarf', 'belt', 'glasses', 'watch'],
    }

    SEMANTIC_LABELS = {
        0: 'background',
        1: 'hat',
        2: 'hair',
        3: 'sunglasses',
        4: 'upper_clothes',
        5: 'skirt',
        6: 'pants',
        7: 'dress',
        8: 'belt',
        9: 'left_shoe',
        10: 'right_shoe',
        11: 'face',
        12: 'left_leg',
        13: 'right_leg',
        14: 'left_arm',
        15: 'right_arm',
        16: 'bag',
        17: 'scarf',
    }

    def __init__(self, device: str = "auto"):
        if device == "auto":
            import torch
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        self.segmentation_model = None
        self.sam_model = None
        self._load_models()

    def _load_models(self):
        self._load_schp()
        self._load_sam()

    def _load_schp(self):
        try:
            print("Loading SCHP (Self-Correction Human Parsing) model...")
            from transformers import AutoImageProcessor, AutoModelForSemanticSegmentation

            model_name = "mattmdjaga/segformer_b2_clothes"
            self.segmentation_model = {
                'processor': AutoImageProcessor.from_pretrained(model_name),
                'model': AutoModelForSemanticSegmentation.from_pretrained(model_name)
            }
            self.segmentation_model['model'].to(self.device)
            self.segmentation_model['model'].eval()
            print("SCHP model loaded successfully")
        except Exception as e:
            print(f"Failed to load SCHP model: {e}")
            self.segmentation_model = None

    def _load_sam(self):
        try:
            print("Loading SAM (Segment Anything) model...")
            from segment_anything import sam_model_registry, SamPredictor

            sam_checkpoint = Path("models/sam/sam_vit_h_4b8939.pth")
            if sam_checkpoint.exists():
                sam = sam_model_registry["vit_h"](checkpoint=str(sam_checkpoint))
                sam.to(device=self.device)
                self.sam_model = SamPredictor(sam)
                print("SAM model loaded successfully")
            else:
                print("SAM checkpoint not found, using alternative method")
                self.sam_model = None
        except Exception as e:
            print(f"Failed to load SAM model: {e}")
            self.sam_model = None

    def segment_clothing(
        self,
        image: Image.Image,
        return_parts: bool = True,
        min_area_ratio: float = 0.01
    ) -> ClothingSegmentation:
        image_array = np.array(image)

        if self.segmentation_model is not None:
            return self._semantic_segmentation(image_array, return_parts, min_area_ratio)
        else:
            return self._fallback_segmentation(image_array, min_area_ratio)

    def _semantic_segmentation(
        self,
        image: np.ndarray,
        return_parts: bool,
        min_area_ratio: float
    ) -> ClothingSegmentation:
        import torch

        h, w = image.shape[:2]

        pil_image = Image.fromarray(image)
        inputs = self.segmentation_model['processor'](
            images=pil_image, return_tensors="pt"
        )
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.segmentation_model['model'](**inputs)
            logits = outputs.logits

        logits = torch.nn.functional.interpolate(
            logits,
            size=(h, w),
            mode="bilinear",
            align_corners=False,
        )

        seg_map = logits.argmax(dim=1)[0].cpu().numpy()

        clothing_items = []
        total_area = h * w

        clothing_labels = [4, 5, 6, 7, 8, 9, 10, 16, 17]

        for label in clothing_labels:
            mask = (seg_map == label).astype(np.uint8)

            if mask.sum() / total_area < min_area_ratio:
                continue

            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for contour in contours:
                area = cv2.contourArea(contour)
                if area / total_area < min_area_ratio:
                    continue

                x, y, bw, bh = cv2.boundingRect(contour)

                item_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(item_mask, [contour], -1, 1, -1)

                category = self._map_label_to_category(label)

                clothing_items.append(SegmentationResult(
                    mask=item_mask,
                    bbox=(x, y, x + bw, y + bh),
                    category=category,
                    confidence=0.9,
                    area_ratio=area / total_area,
                    contour_points=[tuple(pt[0]) for pt in contour]
                ))

        person_mask = self._extract_person_mask(seg_map)
        background_mask = (seg_map == 0).astype(np.uint8)

        parsed_result = self._parse_segmentation_result(seg_map, image)

        return ClothingSegmentation(
            original_image=image,
            segmentation_mask=seg_map,
            clothing_items=clothing_items,
            background_mask=background_mask,
            person_mask=person_mask,
            parsed_result=parsed_result
        )

    def _map_label_to_category(self, label: int) -> str:
        label_category_map = {
            4: 'top',
            5: 'skirt',
            6: 'pants',
            7: 'dress',
            8: 'belt',
            9: 'shoes',
            10: 'shoes',
            16: 'bag',
            17: 'scarf',
        }
        return label_category_map.get(label, 'unknown')

    def _extract_person_mask(self, seg_map: np.ndarray) -> np.ndarray:
        person_labels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        person_mask = np.isin(seg_map, person_labels).astype(np.uint8)
        return person_mask

    def _parse_segmentation_result(self, seg_map: np.ndarray, image: np.ndarray) -> Dict[str, Any]:
        h, w = seg_map.shape
        parsed = {}

        for label_id, label_name in self.SEMANTIC_LABELS.items():
            mask = (seg_map == label_id)
            if mask.sum() > 0:
                color = self._get_dominant_color(image, mask)
                area_ratio = mask.sum() / (h * w)
                parsed[label_name] = {
                    'present': True,
                    'area_ratio': float(area_ratio),
                    'dominant_color': color
                }

        return parsed

    def _get_dominant_color(self, image: np.ndarray, mask: np.ndarray) -> List[int]:
        masked_pixels = image[mask]
        if len(masked_pixels) == 0:
            return [128, 128, 128]

        try:
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=1, random_state=42, n_init=10)
            kmeans.fit(masked_pixels)
            return kmeans.cluster_centers_[0].astype(int).tolist()
        except (ImportError, ValueError, RuntimeError):
            return list(masked_pixels.mean(axis=0).astype(int))

    def _fallback_segmentation(
        self,
        image: np.ndarray,
        min_area_ratio: float
    ) -> ClothingSegmentation:
        h, w = image.shape[:2]

        if self.sam_model is not None:
            return self._sam_segmentation(image, min_area_ratio)

        return self._grabcut_segmentation(image, min_area_ratio)

    def _sam_segmentation(self, image: np.ndarray, min_area_ratio: float) -> ClothingSegmentation:
        h, w = image.shape[:2]

        self.sam_model.set_image(image)

        input_point = np.array([[w // 2, h // 2]])
        input_label = np.array([1])

        masks, scores, _ = self.sam_model.predict(
            point_coords=input_point,
            point_labels=input_label,
            multimask_output=True,
        )

        best_mask = masks[np.argmax(scores)]

        clothing_items = []
        contours, _ = cv2.findContours(
            best_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        total_area = h * w
        for contour in contours:
            area = cv2.contourArea(contour)
            if area / total_area < min_area_ratio:
                continue

            x, y, bw, bh = cv2.boundingRect(contour)

            item_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(item_mask, [contour], -1, 1, -1)

            clothing_items.append(SegmentationResult(
                mask=item_mask,
                bbox=(x, y, x + bw, y + bh),
                category='clothing',
                confidence=float(np.max(scores)),
                area_ratio=area / total_area,
                contour_points=[tuple(pt[0]) for pt in contour]
            ))

        return ClothingSegmentation(
            original_image=image,
            segmentation_mask=best_mask.astype(np.int32),
            clothing_items=clothing_items,
            background_mask=(1 - best_mask).astype(np.uint8),
            person_mask=best_mask.astype(np.uint8),
            parsed_result={'clothing': {'present': True}}
        )

    def _grabcut_segmentation(self, image: np.ndarray, min_area_ratio: float) -> ClothingSegmentation:
        h, w = image.shape[:2]

        mask = np.zeros((h, w), np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)

        margin = 0.1
        rect = (
            int(w * margin),
            int(h * margin),
            int(w * (1 - 2 * margin)),
            int(h * (1 - 2 * margin))
        )

        try:
            cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        except Exception:
            mask = np.ones((h, w), dtype=np.uint8)
            rect = (0, 0, w, h)

        foreground_mask = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')

        clothing_items = []
        contours, _ = cv2.findContours(
            foreground_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        total_area = h * w
        for contour in contours:
            area = cv2.contourArea(contour)
            if area / total_area < min_area_ratio:
                continue

            x, y, bw, bh = cv2.boundingRect(contour)

            item_mask = np.zeros((h, w), dtype=np.uint8)
            cv2.drawContours(item_mask, [contour], -1, 1, -1)

            clothing_items.append(SegmentationResult(
                mask=item_mask,
                bbox=(x, y, x + bw, y + bh),
                category='clothing',
                confidence=0.7,
                area_ratio=area / total_area,
                contour_points=[tuple(pt[0]) for pt in contour]
            ))

        return ClothingSegmentation(
            original_image=image,
            segmentation_mask=foreground_mask,
            clothing_items=clothing_items,
            background_mask=(1 - foreground_mask),
            person_mask=foreground_mask,
            parsed_result={'clothing': {'present': True}}
        )

    def extract_clothing_region(
        self,
        image: Image.Image,
        category: Optional[str] = None
    ) -> Tuple[Image.Image, np.ndarray]:
        segmentation = self.segment_clothing(image)

        if category:
            items = [item for item in segmentation.clothing_items if item.category == category]
        else:
            items = segmentation.clothing_items

        if not items:
            return image, np.ones(np.array(image).shape[:2], dtype=np.uint8)

        largest_item = max(items, key=lambda x: x.area_ratio)

        result_image = np.array(image).copy()
        result_image[segmentation.background_mask == 1] = [255, 255, 255]

        return Image.fromarray(result_image), largest_item.mask

    def remove_background(
        self,
        image: Image.Image,
        background_color: Tuple[int, int, int] = (255, 255, 255)
    ) -> Image.Image:
        segmentation = self.segment_clothing(image)

        result = np.array(image).copy()
        result[segmentation.background_mask == 1] = list(background_color)

        return Image.fromarray(result)

    def get_clothing_mask_by_category(
        self,
        image: Image.Image,
        categories: List[str]
    ) -> np.ndarray:
        segmentation = self.segment_clothing(image)

        h, w = np.array(image).shape[:2]
        combined_mask = np.zeros((h, w), dtype=np.uint8)

        for item in segmentation.clothing_items:
            if item.category in categories:
                combined_mask = np.maximum(combined_mask, item.mask)

        return combined_mask

    def create_tryon_mask(
        self,
        person_image: Image.Image,
        clothing_category: str = 'top'
    ) -> Dict[str, np.ndarray]:
        segmentation = self.segment_clothing(person_image)

        h, w = np.array(person_image).shape[:2]

        clothing_mask = np.zeros((h, w), dtype=np.uint8)
        for item in segmentation.clothing_items:
            if item.category == clothing_category:
                clothing_mask = np.maximum(clothing_mask, item.mask)

        skin_mask = self._extract_skin_mask(segmentation)

        preserve_mask = np.zeros((h, w), dtype=np.uint8)
        if segmentation.person_mask is not None:
            preserve_mask = segmentation.person_mask.copy()
            preserve_mask[clothing_mask == 1] = 0

        return {
            'clothing_region': clothing_mask,
            'skin_region': skin_mask,
            'preserve_region': preserve_mask,
            'person_region': segmentation.person_mask if segmentation.person_mask is not None else np.ones((h, w), dtype=np.uint8)
        }

    def _extract_skin_mask(self, segmentation: ClothingSegmentation) -> np.ndarray:
        h, w = segmentation.segmentation_mask.shape
        skin_mask = np.zeros((h, w), dtype=np.uint8)

        skin_labels = [2, 3, 11, 12, 13, 14, 15]
        for label in skin_labels:
            skin_mask = np.maximum(skin_mask, (segmentation.segmentation_mask == label).astype(np.uint8))

        return skin_mask


class ClothingSegmentationService:
    """服装分割服务接口"""

    def __init__(self, device: str = "auto"):
        self.segmenter = ClothingSegmenter(device=device)

    def segment_image(self, image_path: str) -> Dict:
        image = Image.open(image_path).convert("RGB")
        result = self.segmenter.segment_clothing(image)

        return {
            "clothing_items": [
                {
                    "category": item.category,
                    "bbox": item.bbox,
                    "confidence": item.confidence,
                    "area_ratio": item.area_ratio,
                }
                for item in result.clothing_items
            ],
            "parsed_result": result.parsed_result,
            "has_person": result.person_mask is not None and result.person_mask.sum() > 0,
        }

    def remove_background(self, image_path: str, output_path: str) -> str:
        image = Image.open(image_path).convert("RGB")
        result = self.segmenter.remove_background(image)
        result.save(output_path)
        return output_path

    def extract_clothing(
        self,
        image_path: str,
        category: Optional[str] = None
    ) -> Dict:
        image = Image.open(image_path).convert("RGB")
        extracted, mask = self.segmenter.extract_clothing_region(image, category)

        return {
            "extracted_image": np.array(extracted).tolist(),
            "mask": mask.tolist(),
        }

    def create_tryon_masks(self, person_image_path: str, clothing_category: str = 'top') -> Dict:
        image = Image.open(person_image_path).convert("RGB")
        masks = self.segmenter.create_tryon_mask(image, clothing_category)

        return {
            "clothing_region": masks['clothing_region'].tolist(),
            "skin_region": masks['skin_region'].tolist(),
            "preserve_region": masks['preserve_region'].tolist(),
            "person_region": masks['person_region'].tolist(),
        }


if __name__ == "__main__":
    service = ClothingSegmentationService()

    print("\n" + "="*50)
    print("服装分割服务已初始化")
    print("="*50)

    test_image = "data/raw/images/1163.jpg"
    if os.path.exists(test_image):
        print(f"\n分割测试图像: {test_image}")
        result = service.segment_image(test_image)
        print(f"检测到 {len(result['clothing_items'])} 个服装区域:")
        for item in result['clothing_items']:
            print(f"  - {item['category']}: {item['area_ratio']*100:.1f}% 面积, 置信度 {item['confidence']:.2f}")
