"""
Virtual Try-On Prompt Engine
Generates dynamic, feature-driven prompts for virtual try-on API calls.
Replaces hardcoded template with lighting, skin tone, garment features, and pose context.

Author: XunO ML Team
Version: 1.0.0
"""

from __future__ import annotations

import logging
from typing import Optional

from ml.services.tryon_preprocessor import (
    GarmentFeatures,
    AlignmentMetadata,
    LightingInfo,
    PreprocessResult,
)

logger = logging.getLogger(__name__)

# Category descriptors in Chinese
CATEGORY_DESC = {
    "upper_body": "上装",
    "lower_body": "下装",
    "dress": "连衣裙",
    "full_body": "全身装",
}

# Pose description templates
POSE_TEMPLATES = {
    "frontal": "正面站立",
    "slight-left": "微微侧身向左",
    "slight-right": "微微侧身向右",
}

# Lighting condition descriptions
LIGHTING_TEMPLATES = {
    ("warm", "warm-yellow"): "暖色调室内光，温暖黄调肌肤",
    ("warm", "neutral"): "暖色调光线，自然肤色",
    ("cool", "cool-pink"): "冷色调光线，冷白调肌肤",
    ("cool", "neutral"): "冷色调光线，自然肤色",
    ("neutral", "warm-yellow"): "自然光，暖黄调肌肤",
    ("neutral", "cool-pink"): "自然光，冷白调肌肤",
    ("neutral", "neutral"): "自然光，自然肤色",
}

# Pattern descriptions
PATTERN_DESC = {
    "solid": "纯色",
    "striped": "条纹图案",
    "printed": "印花图案",
    "plaid": "格子图案",
    "floral": "花卉图案",
}

# Formality descriptions
FORMALITY_DESC = {
    "formal": "正式",
    "smart-casual": "商务休闲",
    "casual": "休闲",
    "sporty": "运动",
}

# Texture descriptions
TEXTURE_DESC = {
    "smooth": "光滑面料",
    "silk": "丝绸质感",
    "knit": "针织面料",
    "textured": "质感面料",
    "denim": "牛仔面料",
}

# Quality keywords for prompt enhancement
QUALITY_KEYWORDS = [
    "4K真实感",
    "面部细节保留",
    "自然褶皱",
    "光影真实",
    "布料质感还原",
]


class TryonPromptEngine:
    """Generates feature-driven prompts for virtual try-on API calls."""

    def __init__(self):
        self._color_descriptions = {
            "red": "红色系",
            "blue": "蓝色系",
            "yellow": "黄色系",
            "green": "绿色系",
            "purple": "紫色系",
            "brown": "棕色系",
            "black": "深黑色",
            "white": "纯白色",
            "gray": "灰色",
            "warm-light": "暖浅色",
            "neutral": "中性色",
        }

    def _describe_garment_colors(self, features: GarmentFeatures) -> str:
        """Generate color description string from garment features."""
        descriptions = []
        for color_name in features.color_names[:2]:  # Use top 2 colors
            desc = self._color_descriptions.get(color_name, color_name)
            if desc not in descriptions:
                descriptions.append(desc)

        if not descriptions:
            return ""

        if len(descriptions) == 1:
            return descriptions[0]

        # Combine color descriptions naturally
        return f"{descriptions[0]}与{descriptions[1]}搭配"

    def _describe_garment(self, features: GarmentFeatures) -> str:
        """Generate full garment description."""
        parts = []

        # Color
        color_desc = self._describe_garment_colors(features)
        if color_desc:
            parts.append(color_desc)

        # Pattern
        pattern_desc = PATTERN_DESC.get(features.pattern_type, "")
        if pattern_desc and features.pattern_type != "solid":
            parts.append(f"带有{pattern_desc}")

        # Texture
        texture_desc = TEXTURE_DESC.get(features.texture_descriptor, "")
        if texture_desc:
            parts.append(texture_desc)

        # Formality
        formality_desc = FORMALITY_DESC.get(features.formality, "")
        if formality_desc:
            parts.append(f"{formality_desc}风格")

        return "的".join(parts) if parts else ""

    def _build_lighting_prompt(self, lighting: LightingInfo) -> str:
        """Build lighting-related prompt segment."""
        key = (lighting.color_temperature, lighting.skin_tone_description)
        template = LIGHTING_TEMPLATES.get(key, "自然光条件下")

        # Add brightness context
        if lighting.average_brightness > 70:
            brightness_desc = "明亮环境"
        elif lighting.average_brightness > 40:
            brightness_desc = "适中光线"
        else:
            brightness_desc = "柔和光线"

        return f"{brightness_desc}，{template}"

    def _build_pose_prompt(self, alignment: AlignmentMetadata) -> str:
        """Build pose-related prompt segment."""
        pose = POSE_TEMPLATES.get(alignment.pose_description, "正面站立")

        if alignment.pose_description == "frontal":
            return f"人物{pose}，半身构图"
        return f"人物{pose}，自然姿态"

    def generate(
        self,
        preprocess: PreprocessResult,
        category: str,
        user_prompt: Optional[str] = None,
    ) -> str:
        """Generate an enhanced prompt incorporating all preprocessed features.

        Args:
            preprocess: Preprocessing results from TryonPreprocessor.
            category: Garment category (upper_body/lower_body/dress/full_body).
            user_prompt: Optional user-provided prompt override.

        Returns:
            Enhanced prompt string for the try-on API.
        """
        # If user provides a detailed prompt, enhance it rather than replace
        if user_prompt and len(user_prompt) > 20:
            return self._enhance_user_prompt(user_prompt, preprocess)

        category_desc = CATEGORY_DESC.get(category, "服装")

        # Build garment description
        garment_desc = self._describe_garment(preprocess.garment_features)

        # Build lighting context
        lighting_prompt = self._build_lighting_prompt(preprocess.lighting)

        # Build pose context
        pose_prompt = self._build_pose_prompt(preprocess.alignment)

        # Assemble the prompt
        parts = []

        # Core instruction
        if garment_desc:
            parts.append(f"穿着这件{garment_desc}{category_desc}的人物照片")
        else:
            parts.append(f"穿着这件{category_desc}的人物照片")

        # Lighting and skin tone context
        parts.append(lighting_prompt)

        # Pose context
        parts.append(pose_prompt)

        # Preservation instructions
        parts.append("保持人物面部表情和姿势不变")

        # Quality keywords (select 2-3 based on garment type)
        quality = self._select_quality_keywords(preprocess.garment_features)
        parts.append(quality)

        # Combine into final prompt
        final_prompt = "，".join(parts)

        logger.info("Generated try-on prompt: %s", final_prompt)

        return final_prompt

    def _enhance_user_prompt(
        self, user_prompt: str, preprocess: PreprocessResult
    ) -> str:
        """Enhance a user-provided prompt with technical quality keywords."""
        # Add quality keywords if not already present
        quality = self._select_quality_keywords(preprocess.garment_features)

        # Add lighting context
        lighting = self._build_lighting_prompt(preprocess.lighting)

        # Check if user prompt already has quality terms
        has_quality = any(kw in user_prompt for kw in QUALITY_KEYWORDS)

        enhanced = user_prompt
        if not has_quality:
            enhanced = f"{enhanced}，{quality}"

        # Prepend lighting context
        enhanced = f"{lighting}，{enhanced}"

        return enhanced

    def _select_quality_keywords(self, features: GarmentFeatures) -> str:
        """Select relevant quality keywords based on garment features."""
        keywords = []

        # Always include realism
        keywords.append("高质量真实感")

        # Texture-dependent keywords
        if features.texture_descriptor in ("silk", "smooth"):
            keywords.append("面料光泽还原")
        elif features.texture_descriptor in ("knit", "textured"):
            keywords.append("面料质感还原")

        # Pattern-dependent keywords
        if features.pattern_type not in ("solid",):
            keywords.append("图案细节保留")
        else:
            keywords.append("自然褶皱")

        # Always preserve face
        keywords.append("面部细节保留")

        return "，".join(keywords)

    def generate_for_glm(
        self,
        preprocess: PreprocessResult,
        category: str,
    ) -> str:
        """Generate a prompt specifically formatted for the GLM fallback API.

        GLM has different prompt expectations than Doubao Seedream.
        """
        category_desc = CATEGORY_DESC.get(category, "服装")

        garment_desc = self._describe_garment(preprocess.garment_features)
        lighting = self._build_lighting_prompt(preprocess.lighting)

        if garment_desc:
            core = f"请生成一张图片：将第二张图片中的{garment_desc}{category_desc}穿在第一张图片的人物身上"
        else:
            core = f"请生成一张图片：将第二张图片中的{category_desc}穿在第一张图片的人物身上"

        return f"{core}，{lighting}，保持人物面部和姿势不变，生成高质量真实感的换装效果图。"
