"""
身材分析 + 数字孪生 + 形象定制 完整流程 API

整合:
1. 身体图像分析 (body-image-analysis.service.ts)
2. 数字孪生生成 (digital_twin_service.py)
3. 个人形象定制推荐
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import tempfile
import os
import json
import logging
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)


def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filename to prevent path traversal attacks."""
    safe = "".join(c for c in filename if c.isalnum() or c in "._-")
    suffix = Path(filename).suffix if filename else ".jpg"
    return f"{uuid.uuid4().hex}{suffix}" if not safe else f"{safe}{suffix}"


app = FastAPI(title="AiNeed Body Analysis & Digital Twin API")

# 导入服务
from digital_twin_service import PIFuHDService, DigitalTwin, BodyMeasurements

# 初始化服务
pifuhd_service = PIFuHDService()

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    """Application lifespan: load models on startup (replaces deprecated on_event)."""
    await pifuhd_service.load_models()
    logger.info("Body Analysis & Digital Twin API started")
    yield
    logger.info("Shutting down Body Analysis & Digital Twin API...")


app = FastAPI(title="AiNeed Body Analysis & Digital Twin API", lifespan=lifespan)


class StylePreference(BaseModel):
    preferred_styles: List[str] = []
    preferred_colors: List[str] = []
    preferred_brands: List[str] = []
    budget_range: str = "medium"  # low, medium, high, luxury
    occasions: List[str] = []  # casual, work, formal, party, sport

class PersonalImagePlan(BaseModel):
    """个人形象定制方案"""
    user_id: str
    digital_twin_id: str
    
    # 身材分析
    body_shape: str
    body_proportions: Dict[str, float]
    measurements: Dict[str, float]
    
    # 风格建议
    recommended_styles: List[str]
    recommended_colors: List[str]
    recommended_patterns: List[str]
    
    # 穿搭建议
    outfit_suggestions: List[Dict[str, Any]]
    
    # 避免事项
    avoid_styles: List[str]
    avoid_patterns: List[str]
    
    # 购物清单
    shopping_list: List[Dict[str, Any]]

class BodyAnalysisResult(BaseModel):
    """身材分析结果"""
    body_shape: str
    confidence: float
    measurements: Dict[str, float]
    proportions: Dict[str, float]
    recommendations: List[str]

@app.post("/api/v1/body-analysis/upload", response_model=BodyAnalysisResult)
async def analyze_body_from_image(
    user_id: str,
    file: UploadFile = File(...),
    return_digital_twin: bool = True
):
    """
    上传照片进行身材分析
    
    流程:
    1. 上传全身照片
    2. 自动检测人体关键点
    3. 计算身体测量数据
    4. 判断体型类型
    5. (可选) 生成数字孪生
    
    返回:
    - 体型类型 (hourglass/pear/apple/rectangle/inverted_triangle)
    - 身体测量数据
    - 身体比例
    - 穿搭建议
    """
    # 保存上传的文件 (使用安全的文件名防止路径遍历)
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, sanitize_filename(file.filename or 'upload.jpg'))
    
    with open(temp_path, 'wb') as f:
        content = await file.read()
        f.write(content)
    
    try:
        # 创建数字孪生 (包含身材分析)
        twin = await pifuhd_service.create_digital_twin(user_id, temp_path)
        
        # 生成穿搭建议
        recommendations = generate_style_recommendations(
            twin.measurements.body_shape,
            twin.measurements
        )
        
        return BodyAnalysisResult(
            body_shape=twin.measurements.body_shape,
            confidence=twin.overall_confidence,
            measurements={
                'height': twin.measurements.height,
                'weight': twin.measurements.weight,
                'chest': twin.measurements.chest,
                'waist': twin.measurements.waist,
                'hips': twin.measurements.hips,
                'shoulder_width': twin.measurements.shoulder_width,
                'arm_length': twin.measurements.arm_length,
                'leg_length': twin.measurements.leg_length,
            },
            proportions=twin.body_proportions or {},
            recommendations=recommendations
        )
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/api/v1/digital-twin/create")
async def create_digital_twin(
    user_id: str,
    file: UploadFile = File(...)
):
    """
    创建数字孪生
    
    从单张照片生成:
    - 3D 人体模型
    - 精确身体测量
    - 体型分析
    """
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, sanitize_filename(file.filename or 'upload.jpg'))
    
    with open(temp_path, 'wb') as f:
        content = await file.read()
        f.write(content)
    
    try:
        twin = await pifuhd_service.create_digital_twin(user_id, temp_path)
        
        return {
            'success': True,
            'digital_twin_id': twin.id,
            'mesh_url': f'/api/v1/digital-twin/{twin.id}/mesh',
            'measurements': {
                'height': twin.measurements.height,
                'weight': twin.measurements.weight,
                'chest': twin.measurements.chest,
                'waist': twin.measurements.waist,
                'hips': twin.measurements.hips,
                'body_shape': twin.measurements.body_shape,
            },
            'confidence': twin.overall_confidence
        }
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.get("/api/v1/digital-twin/{twin_id}")
async def get_digital_twin(user_id: str, twin_id: str):
    """获取数字孪生详情"""
    twin = await pifuhd_service.get_digital_twin(user_id, twin_id)
    
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    
    return {
        'id': twin.id,
        'user_id': twin.user_id,
        'created_at': twin.created_at.isoformat(),
        'measurements': {
            'height': twin.measurements.height,
            'weight': twin.measurements.weight,
            'chest': twin.measurements.chest,
            'waist': twin.measurements.waist,
            'hips': twin.measurements.hips,
            'body_shape': twin.measurements.body_shape,
        },
        'confidence': twin.overall_confidence
    }

@app.get("/api/v1/digital-twin/{twin_id}/mesh")
async def download_mesh(user_id: str, twin_id: str):
    """下载 3D 网格文件"""
    twin = await pifuhd_service.get_digital_twin(user_id, twin_id)
    
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    
    if not os.path.exists(twin.mesh_path):
        raise HTTPException(status_code=404, detail="Mesh file not found")
    
    return FileResponse(
        twin.mesh_path,
        media_type='model/obj',
        filename=f'digital_twin_{twin_id}.obj'
    )

@app.post("/api/v1/personal-image/plan", response_model=PersonalImagePlan)
async def create_personal_image_plan(
    user_id: str,
    digital_twin_id: str,
    style_preference: StylePreference
):
    """
    创建个人形象定制方案
    
    基于数字孪生和风格偏好，生成:
    - 适合的服装风格
    - 推荐颜色
    - 穿搭建议
    - 购物清单
    """
    # 获取数字孪生
    twin = await pifuhd_service.get_digital_twin(user_id, digital_twin_id)
    
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    
    # 生成个性化方案
    plan = generate_personal_image_plan(
        twin.measurements,
        twin.body_proportions or {},
        style_preference
    )
    
    return plan

def generate_style_recommendations(
    body_shape: str,
    measurements: BodyMeasurements
) -> List[str]:
    """
    根据体型生成穿搭建议
    
    体型穿搭法则:
    - hourglass: 突出腰线
    - pear: 平衡上下身比例
    - apple: 强调腿部线条
    - rectangle: 创造曲线
    - inverted_triangle: 平衡肩臀比例
    """
    recommendations = []
    
    if body_shape == 'hourglass':
        recommendations.extend([
            "选择收腰款式的连衣裙，突出完美腰线",
            "高腰裤/裙是您的最佳选择",
            "合身的针织衫能展现身材曲线",
            "避免过于宽松或过于紧身的款式",
            "腰带是您的必备配饰"
        ])
    elif body_shape == 'pear':
        recommendations.extend([
            "选择亮色或图案丰富的上衣，吸引视线向上",
            "A字裙能完美修饰臀部",
            "船领、方领等宽领口能平衡肩部比例",
            "深色下装能视觉收缩臀部",
            "垫肩或泡泡袖能增加肩部宽度"
        ])
    elif body_shape == 'apple':
        recommendations.extend([
            "V领或深领口能拉长颈部线条",
            " empire waist (高腰线) 连衣裙能遮盖腹部",
            "直筒或阔腿裤能平衡比例",
            "避免紧身腰带和低腰款式",
            "选择有垂坠感的面料"
        ])
    elif body_shape == 'rectangle':
        recommendations.extend([
            "选择有层次感的服装创造曲线",
            "收腰款式和腰带能制造腰线",
            "荷叶边、褶皱等细节增加体积感",
            "避免过于直筒的款式",
            "高腰款式能拉长腿部线条"
        ])
    elif body_shape == 'inverted_triangle':
        recommendations.extend([
            "选择深色或简约的上衣",
            "A字裙、阔腿裤能增加下半身体积",
            "V领能缩小肩部视觉宽度",
            "避免垫肩和泡泡袖",
            "亮色或图案丰富的下装能平衡比例"
        ])
    
    # 根据身高添加建议
    if measurements.height < 160:
        recommendations.append("高腰款式能拉长腿部线条，显高显瘦")
    elif measurements.height > 175:
        recommendations.append("长款外套和阔腿裤能平衡高挑身材")
    
    return recommendations

def generate_personal_image_plan(
    measurements: BodyMeasurements,
    proportions: Dict[str, float],
    style_preference: StylePreference
) -> PersonalImagePlan:
    """
    生成完整的个人形象定制方案
    """
    body_shape = measurements.body_shape
    
    # 根据体型和偏好确定推荐风格
    style_mapping = {
        'hourglass': {
            'recommended': ['feminine', 'classic', 'elegant', 'romantic'],
            'avoid': ['oversized', 'boxy']
        },
        'pear': {
            'recommended': ['classic', 'bohemian', 'romantic', 'preppy'],
            'avoid': ['tight_bottom', 'skinny_jeans']
        },
        'apple': {
            'recommended': ['elegant', 'classic', 'minimalist', 'flowy'],
            'avoid': ['crop_top', 'tight_waist']
        },
        'rectangle': {
            'recommended': ['trendy', 'layered', 'feminine', 'structured'],
            'avoid': ['boxy', 'shapeless']
        },
        'inverted_triangle': {
            'recommended': ['bohemian', 'romantic', 'flowy', 'classic'],
            'avoid': ['structured_shoulder', 'boat_neck']
        }
    }
    
    shape_styles = style_mapping.get(body_shape, style_mapping['rectangle'])
    
    # 合并用户偏好
    if style_preference.preferred_styles:
        recommended_styles = list(set(shape_styles['recommended']) & set(style_preference.preferred_styles))
        if not recommended_styles:
            recommended_styles = shape_styles['recommended'][:3]
    else:
        recommended_styles = shape_styles['recommended'][:3]
    
    # 推荐颜色 (基于肤色和体型)
    color_recommendations = {
        'hourglass': ['navy', 'burgundy', 'emerald', 'black', 'cream'],
        'pear': ['pastel_pink', 'light_blue', 'white', 'cream', 'soft_yellow'],
        'apple': ['deep_blue', 'forest_green', 'purple', 'charcoal', 'wine'],
        'rectangle': ['coral', 'turquoise', 'mustard', 'olive', 'blush'],
        'inverted_triangle': ['earth_tones', 'burgundy', 'navy', 'forest_green', 'camel']
    }
    
    recommended_colors = color_recommendations.get(body_shape, color_recommendations['rectangle'])
    
    # 推荐图案
    pattern_recommendations = {
        'hourglass': ['solid', 'small_floral', 'vertical_stripe'],
        'pear': ['horizontal_stripe_top', 'small_print', 'solid_bottom'],
        'apple': ['vertical_stripe', 'small_print', 'solid'],
        'rectangle': ['large_print', 'horizontal_stripe', 'color_block'],
        'inverted_triangle': ['print_bottom', 'solid_top', 'vertical_stripe']
    }
    
    recommended_patterns = pattern_recommendations.get(body_shape, pattern_recommendations['rectangle'])
    
    # 生成穿搭建议
    outfit_suggestions = generate_outfit_suggestions(
        body_shape,
        measurements,
        recommended_styles,
        style_preference.occasions
    )
    
    # 生成购物清单
    shopping_list = generate_shopping_list(
        body_shape,
        measurements,
        recommended_styles,
        style_preference.budget_range
    )
    
    return PersonalImagePlan(
        user_id="",  # Will be filled by caller
        digital_twin_id="",  # Will be filled by caller
        body_shape=body_shape,
        body_proportions=proportions,
        measurements={
            'height': measurements.height,
            'weight': measurements.weight,
            'chest': measurements.chest,
            'waist': measurements.waist,
            'hips': measurements.hips,
        },
        recommended_styles=recommended_styles,
        recommended_colors=recommended_colors[:5],
        recommended_patterns=recommended_patterns,
        outfit_suggestions=outfit_suggestions,
        avoid_styles=shape_styles['avoid'],
        avoid_patterns=['large_horizontal_stripe'] if body_shape in ['apple', 'rectangle'] else [],
        shopping_list=shopping_list
    )

def generate_outfit_suggestions(
    body_shape: str,
    measurements: BodyMeasurements,
    styles: List[str],
    occasions: List[str]
) -> List[Dict[str, Any]]:
    """生成穿搭建议"""
    suggestions = []
    
    # 日常休闲
    suggestions.append({
        'occasion': 'casual',
        'items': [
            {'type': 'top', 'description': 'V领针织衫', 'color': 'navy'},
            {'type': 'bottom', 'description': '高腰直筒牛仔裤', 'color': 'dark_blue'},
            {'type': 'shoes', 'description': '白色运动鞋', 'color': 'white'},
        ],
        'tips': '高腰设计拉长腿部线条'
    })
    
    # 职场
    suggestions.append({
        'occasion': 'work',
        'items': [
            {'type': 'top', 'description': '衬衫', 'color': 'white'},
            {'type': 'bottom', 'description': '高腰西裤', 'color': 'black'},
            {'type': 'outerwear', 'description': '西装外套', 'color': 'navy'},
            {'type': 'shoes', 'description': '尖头高跟鞋', 'color': 'black'},
        ],
        'tips': '合身剪裁展现专业形象'
    })
    
    # 正式场合
    suggestions.append({
        'occasion': 'formal',
        'items': [
            {'type': 'dress', 'description': '收腰连衣裙', 'color': 'burgundy'},
            {'type': 'shoes', 'description': '细高跟', 'color': 'nude'},
            {'type': 'accessory', 'description': '精致腰带', 'color': 'gold'},
        ],
        'tips': '收腰设计突出身材曲线'
    })
    
    return suggestions

def generate_shopping_list(
    body_shape: str,
    measurements: BodyMeasurements,
    styles: List[str],
    budget: str
) -> List[Dict[str, Any]]:
    """生成购物清单"""
    essential_items = [
        {
            'category': 'tops',
            'items': [
                {'name': 'V领针织衫', 'priority': 'high', 'price_range': '$30-80'},
                {'name': '白色衬衫', 'priority': 'high', 'price_range': '$40-100'},
                {'name': '合身T恤', 'priority': 'medium', 'price_range': '$20-50'},
            ]
        },
        {
            'category': 'bottoms',
            'items': [
                {'name': '高腰直筒裤', 'priority': 'high', 'price_range': '$50-120'},
                {'name': 'A字裙', 'priority': 'high', 'price_range': '$40-100'},
                {'name': '高腰牛仔裤', 'priority': 'medium', 'price_range': '$60-150'},
            ]
        },
        {
            'category': 'dresses',
            'items': [
                {'name': '收腰连衣裙', 'priority': 'high', 'price_range': '$60-150'},
                {'name': '衬衫裙', 'priority': 'medium', 'price_range': '$50-120'},
            ]
        },
        {
            'category': 'outerwear',
            'items': [
                {'name': '合身西装外套', 'priority': 'high', 'price_range': '$80-200'},
                {'name': '风衣', 'priority': 'medium', 'price_range': '$100-300'},
            ]
        },
        {
            'category': 'accessories',
            'items': [
                {'name': '精致腰带', 'priority': 'high', 'price_range': '$20-60'},
                {'name': '简约项链', 'priority': 'medium', 'price_range': '$15-50'},
            ]
        }
    ]
    
    return essential_items

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
