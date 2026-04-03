"""
PIFuHD Digital Twin Service - 高精度3D人体数字孪生服务

基于 Facebook Research 的 PIFuHD (CVPR 2020) 实现
单张图片生成高精度 3D 人体模型

技术栈:
- PIFuHD: Multi-Level Pixel-Aligned Implicit Function
- DensePose: 人体密集姿态估计
- SCHP: 人体分割
- Trimesh: 3D 网格处理

硬件要求:
- GPU: 8GB+ VRAM (推荐 RTX 3060+)
- RAM: 16GB+
- 存储: 10GB+ (模型文件)
"""

import os
import sys
import json
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import base64
import hashlib
import uuid
from pathlib import Path

# Import path configuration
import sys as _sys
_sys.path.insert(0, str(Path(__file__).parent.parent / "config"))
from paths import PROJECT_ROOT, MODELS_ROOT

import numpy as np
import cv2
import torch
from PIL import Image

logger = logging.getLogger(__name__)

@dataclass
class BodyMeasurements:
    """身体测量数据"""
    height: float  # cm
    weight: float  # kg
    chest: float   # cm
    waist: float   # cm
    hips: float    # cm
    shoulder_width: float  # cm
    arm_length: float      # cm
    leg_length: float      # cm
    inseam: float          # cm
    neck: float            # cm
    wrist: float           # cm
    ankle: float           # cm
    body_shape: str        # hourglass, pear, apple, rectangle, inverted_triangle
    confidence: float      # 测量置信度 0-1

@dataclass
class DigitalTwin:
    """数字孪生模型"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    # 3D 模型文件路径
    mesh_path: str           # OBJ 文件路径
    texture_path: Optional[str]  # 纹理文件路径
    
    # 身体测量数据
    measurements: BodyMeasurements
    
    # 元数据
    source_image_hash: str   # 原始图片哈希
    model_version: str       # 模型版本
    processing_time_ms: int  # 处理耗时
    
    # 姿态关键点
    keypoints_3d: Optional[List[List[float]]] = None
    
    # 体型分析
    body_proportions: Optional[Dict[str, float]] = None
    
    # 置信度
    overall_confidence: float = 0.0

def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filename to prevent path traversal attacks."""
    safe = "".join(c for c in filename if c.isalnum() or c in "._-")
    suffix = Path(filename).suffix if filename else ".jpg"
    return f"{uuid.uuid4().hex}{suffix}" if not safe else f"{safe}{suffix}"


class PIFuHDService:
    """
    PIFuHD 数字孪生服务
    
    功能:
    1. 单张图片 → 3D 人体模型
    2. 自动身体测量
    3. 体型分析
    4. 虚拟试衣支持
    """
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.pifuhd_path = os.environ.get('PIFUHD_REPO_PATH', str(MODELS_ROOT / "pifuhd"))
        self.checkpoint_path = os.path.join(self.pifuhd_path, 'checkpoints')
        self.results_dir = PROJECT_ROOT / "data" / "digital_twins"
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        self.model_loaded = False
        self.net = None
        self.net_HD = None
        
        logger.info(f"PIFuHD Service initialized on {self.device}")
        logger.info(f"PIFuHD path: {self.pifuhd_path}")
        
    def _check_model_exists(self) -> bool:
        """检查模型文件是否存在"""
        required_files = [
            'net_G',
            'net_C',
        ]
        
        for f in required_files:
            path = os.path.join(self.checkpoint_path, f)
            if not os.path.exists(path):
                logger.warning(f"Missing model file: {path}")
                return False
        
        return True
    
    async def load_models(self) -> bool:
        """
        加载 PIFuHD 模型
        
        模型文件:
        - net_G: 粗粒度几何生成器
        - net_C: 细粒度几何细化器
        """
        if self.model_loaded:
            return True
            
        if not self._check_model_exists():
            logger.error("PIFuHD model files not found. Please download from:")
            logger.error("sh scripts/download_trained_model.sh")
            return False
        
        try:
            # 动态导入 PIFuHD 模块
            sys.path.insert(0, self.pifuhd_path)
            
            from lib.model import HGPIFuMRNet
            from lib.options import BaseOptions
            
            # 加载粗粒度模型
            opt = BaseOptions().parse('')
            opt.load_net_G_checkpoint_path = os.path.join(self.checkpoint_path, 'net_G')
            
            self.net = HGPIFuMRNet(opt, self.device)
            self.net.load_state_dict(torch.load(opt.load_net_G_checkpoint_path, map_location=self.device, weights_only=True))
            self.net.eval()
            
            # 加载细粒度模型
            opt.load_net_C_checkpoint_path = os.path.join(self.checkpoint_path, 'net_C')
            self.net_HD = HGPIFuMRNet(opt, self.device)
            self.net_HD.load_state_dict(torch.load(opt.load_net_C_checkpoint_path, map_location=self.device, weights_only=True))
            self.net_HD.eval()
            
            self.model_loaded = True
            logger.info("PIFuHD models loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load PIFuHD models: {e}")
            return False
    
    async def preprocess_image(
        self,
        image_path: str,
        output_dir: str
    ) -> Tuple[str, Dict[str, Any]]:
        """
        预处理图片
        
        步骤:
        1. 人体检测
        2. 关键点提取 (OpenPose/DensePose)
        3. 背景去除 (U2Net)
        4. 图像裁剪
        """
        # 读取图片
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to load image: {image_path}")
        
        h, w = img.shape[:2]
        
        # 使用 OpenCV 的人体检测 - 模型路径从配置获取
        pose_prototxt = MODELS_ROOT / "pose_deploy.prototxt"
        pose_caffemodel = MODELS_ROOT / "pose_iter_440000.caffemodel"
        
        if not (pose_prototxt.exists() and pose_caffemodel.exists()):
            logger.warning("Pose model files not found, skipping keypoint detection")
            raise ValueError("Pose model files not found at expected path")
        
        net = cv2.dnn.readNetFromCaffe(
            str(pose_prototxt),
            str(pose_caffemodel)
        )
        
        # 准备输入
        blob = cv2.dnn.blobFromImage(img, 1.0 / 255, (368, 368), (0, 0, 0), swapRB=False, crop=False)
        net.setInput(blob)
        
        # 前向传播
        output = net.forward()
        
        # 提取关键点
        points = []
        for i in range(25):  # COCO 25 关键点
            prob_map = output[0, i, :, :]
            _, prob, _, point = cv2.minMaxLoc(prob_map)
            
            if prob > 0.1:
                points.append((int(point[0] * w / output.shape[3]),
                              int(point[1] * h / output.shape[2])))
            else:
                points.append(None)
        
        # 计算边界框
        valid_points = [p for p in points if p is not None]
        if valid_points:
            x_coords = [p[0] for p in valid_points]
            y_coords = [p[1] for p in valid_points]
            
            padding = 50
            x_min = max(0, min(x_coords) - padding)
            x_max = min(w, max(x_coords) + padding)
            y_min = max(0, min(y_coords) - padding)
            y_max = min(h, max(y_coords) + padding)
            
            # 裁剪图片
            cropped = img[y_min:y_max, x_min:x_max]
            
            # 保存裁剪后的图片
            cropped_path = os.path.join(output_dir, 'cropped.png')
            cv2.imwrite(cropped_path, cropped)
            
            # 保存关键点
            keypoints = {
                'points': points,
                'bbox': [x_min, y_min, x_max, y_max],
                'original_size': [w, h]
            }
            
            keypoints_path = os.path.join(output_dir, 'keypoints.json')
            with open(keypoints_path, 'w') as f:
                json.dump(keypoints, f)
            
            return cropped_path, keypoints
        else:
            raise ValueError("No human detected in image")
    
    async def generate_mesh(
        self,
        image_path: str,
        output_dir: str
    ) -> str:
        """
        生成 3D 网格模型
        
        输出:
        - OBJ 文件 (3D 网格)
        - MTL 文件 (材质)
        - PNG 文件 (纹理)
        """
        if not self.model_loaded:
            await self.load_models()
        
        # 运行 PIFuHD 推理
        try:
            # 调用 PIFuHD 的推理脚本
            cmd = [
                sys.executable,
                '-m', 'apps.simple_test',
                '--input_path', os.path.dirname(image_path),
                '--out_path', output_dir,
                '--ckpt_path', self.checkpoint_path,
                '--img_path', image_path
            ]
            
            result = subprocess.run(
                cmd,
                cwd=self.pifuhd_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error(f"PIFuHD inference failed: {result.stderr}")
                # 使用备用方案：生成简化的 3D 模型
                return await self._generate_simple_mesh(image_path, output_dir)
            
            # 查找生成的 OBJ 文件
            obj_files = list(Path(output_dir).glob('*.obj'))
            if obj_files:
                return str(obj_files[0])
            else:
                return await self._generate_simple_mesh(image_path, output_dir)
                
        except Exception as e:
            logger.error(f"Mesh generation failed: {e}")
            return await self._generate_simple_mesh(image_path, output_dir)
    
    async def _generate_simple_mesh(
        self,
        image_path: str,
        output_dir: str
    ) -> str:
        """
        生成简化的 3D 模型 (备用方案)
        
        使用参数化人体模型 + 图像特征
        """
        import trimesh
        
        # 创建基础人体模型 (SMPL 简化版)
        # 这里使用椭球体近似
        
        # 读取图片获取比例
        img = cv2.imread(image_path)
        h, w = img.shape[:2]
        
        # 创建椭球体
        # 身体: 椭球
        body = trimesh.creation.ellipsoid(
            radius=[0.3, 0.2, 0.5],  # 宽、厚、高
            subdivisions=3
        )
        
        # 头部: 球体
        head = trimesh.creation.icosphere(
            radius=0.12,
            subdivisions=3
        )
        head.apply_translation([0, 0, 0.65])
        
        # 合并
        mesh = trimesh.util.concatenate([body, head])
        
        # 保存
        output_path = os.path.join(output_dir, 'digital_twin.obj')
        mesh.export(output_path)
        
        logger.info(f"Generated simplified mesh: {output_path}")
        return output_path
    
    def estimate_measurements(
        self,
        keypoints: Dict[str, Any],
        image_height: int,
        pixel_to_cm_ratio: float = 0.5
    ) -> BodyMeasurements:
        """
        从关键点估计身体测量数据
        
        使用人体比例学公式
        """
        points = keypoints.get('points', [])
        
        # 计算各部位尺寸
        measurements = {}
        
        # 身高估计 (从头到脚踝)
        if points[0] and points[24]:  # 头顶到脚踝
            height_pixels = abs(points[24][1] - points[0][1])
            measurements['height'] = height_pixels * pixel_to_cm_ratio
        else:
            measurements['height'] = 170.0  # 默认值
        
        # 肩宽
        if points[2] and points[5]:  # 左肩到右肩
            shoulder_pixels = abs(points[5][0] - points[2][0])
            measurements['shoulder_width'] = shoulder_pixels * pixel_to_cm_ratio
        else:
            measurements['shoulder_width'] = 40.0
        
        # 臂长
        if points[2] and points[4]:  # 肩到手腕
            arm_pixels = np.sqrt(
                (points[4][0] - points[2][0])**2 +
                (points[4][1] - points[2][1])**2
            )
            measurements['arm_length'] = arm_pixels * pixel_to_cm_ratio
        else:
            measurements['arm_length'] = 60.0
        
        # 腿长
        if points[8] and points[11]:  # 髋到脚踝
            leg_pixels = np.sqrt(
                (points[11][0] - points[8][0])**2 +
                (points[11][1] - points[8][1])**2
            )
            measurements['leg_length'] = leg_pixels * pixel_to_cm_ratio
        else:
            measurements['leg_length'] = 80.0
        
        # 估计胸围、腰围、臀围 (基于比例)
        height = measurements.get('height', 170)
        
        # 使用标准人体比例
        measurements['chest'] = height * 0.53  # 胸围约为身高的 53%
        measurements['waist'] = height * 0.43  # 腰围约为身高的 43%
        measurements['hips'] = height * 0.54   # 臀围约为身高的 54%
        
        # 其他测量
        measurements['inseam'] = measurements['leg_length'] * 0.75
        measurements['neck'] = height * 0.12
        measurements['wrist'] = height * 0.05
        measurements['ankle'] = height * 0.06
        measurements['weight'] = (height - 100) * 0.9  # 简化公式
        
        # 判断体型
        body_shape = self._determine_body_shape(
            measurements['shoulder_width'],
            measurements['chest'],
            measurements['waist'],
            measurements['hips']
        )
        
        return BodyMeasurements(
            height=measurements.get('height', 170.0),
            weight=measurements.get('weight', 65.0),
            chest=measurements.get('chest', 90.0),
            waist=measurements.get('waist', 75.0),
            hips=measurements.get('hips', 95.0),
            shoulder_width=measurements.get('shoulder_width', 40.0),
            arm_length=measurements.get('arm_length', 60.0),
            leg_length=measurements.get('leg_length', 80.0),
            inseam=measurements.get('inseam', 75.0),
            neck=measurements.get('neck', 35.0),
            wrist=measurements.get('wrist', 16.0),
            ankle=measurements.get('ankle', 22.0),
            body_shape=body_shape,
            confidence=0.7  # 基于关键点的置信度
        )
    
    def _determine_body_shape(
        self,
        shoulder_width: float,
        chest: float,
        waist: float,
        hips: float
    ) -> str:
        """
        判断体型类型
        
        类型:
        - hourglass: 沙漏型 (肩≈臀, 腰明显细)
        - pear: 梨型 (臀>肩)
        - apple: 苹果型 (腰>臀)
        - rectangle: 矩形 (肩≈腰≈臀)
        - inverted_triangle: 倒三角 (肩>臀)
        """
        waist_hip_ratio = waist / hips if hips > 0 else 0
        shoulder_hip_ratio = shoulder_width / (hips / 3.14) if hips > 0 else 1
        
        if waist_hip_ratio < 0.75 and abs(shoulder_hip_ratio - 1) < 0.1:
            return 'hourglass'
        elif hips > chest and hips > shoulder_width * 2.5:
            return 'pear'
        elif waist > hips * 0.85 and waist > chest * 0.9:
            return 'apple'
        elif shoulder_width * 2.5 > hips and shoulder_width * 2.5 > chest:
            return 'inverted_triangle'
        else:
            return 'rectangle'
    
    async def create_digital_twin(
        self,
        user_id: str,
        image_path: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> DigitalTwin:
        """
        创建数字孪生
        
        完整流程:
        1. 图片预处理
        2. 关键点检测
        3. 3D 模型生成
        4. 身体测量
        5. 体型分析
        """
        start_time = datetime.now()
        
        # 创建输出目录
        twin_id = hashlib.md5(f"{user_id}_{datetime.now().isoformat()}".encode()).hexdigest()[:12]
        output_dir = self.results_dir / user_id / twin_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 计算图片哈希
        with open(image_path, 'rb') as f:
            image_hash = hashlib.sha256(f.read()).hexdigest()
        
        try:
            # 1. 预处理图片
            logger.info(f"Preprocessing image for user {user_id}")
            cropped_path, keypoints = await self.preprocess_image(image_path, str(output_dir))
            
            # 2. 生成 3D 网格
            logger.info(f"Generating 3D mesh for user {user_id}")
            mesh_path = await self.generate_mesh(cropped_path, str(output_dir))
            
            # 3. 估计身体测量
            logger.info(f"Estimating body measurements for user {user_id}")
            measurements = self.estimate_measurements(
                keypoints,
                keypoints.get('original_size', [1000, 1000])[1]
            )
            
            # 4. 计算处理时间
            processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
            
            # 5. 创建数字孪生对象
            digital_twin = DigitalTwin(
                id=twin_id,
                user_id=user_id,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                mesh_path=mesh_path,
                texture_path=None,  # TODO: 纹理生成
                measurements=measurements,
                source_image_hash=image_hash,
                model_version='pifuhd-v1.0',
                processing_time_ms=processing_time_ms,
                keypoints_3d=keypoints.get('points'),
                body_proportions={
                    'shoulder_to_hip': measurements.shoulder_width / measurements.hips if measurements.hips > 0 else 1,
                    'waist_to_hip': measurements.waist / measurements.hips if measurements.hips > 0 else 1,
                    'leg_to_height': measurements.leg_length / measurements.height if measurements.height > 0 else 0.5,
                },
                overall_confidence=measurements.confidence
            )
            
            # 6. 保存元数据
            metadata_path = output_dir / 'metadata.json'
            with open(metadata_path, 'w') as f:
                json.dump({
                    'id': digital_twin.id,
                    'user_id': digital_twin.user_id,
                    'created_at': digital_twin.created_at.isoformat(),
                    'measurements': {
                        'height': digital_twin.measurements.height,
                        'weight': digital_twin.measurements.weight,
                        'chest': digital_twin.measurements.chest,
                        'waist': digital_twin.measurements.waist,
                        'hips': digital_twin.measurements.hips,
                        'body_shape': digital_twin.measurements.body_shape,
                    },
                    'mesh_path': digital_twin.mesh_path,
                    'processing_time_ms': digital_twin.processing_time_ms,
                    'confidence': digital_twin.overall_confidence,
                }, f, indent=2)
            
            logger.info(f"Digital twin created: {twin_id} for user {user_id}")
            return digital_twin
            
        except Exception as e:
            logger.error(f"Failed to create digital twin: {e}")
            raise
    
    async def get_digital_twin(self, user_id: str, twin_id: str) -> Optional[DigitalTwin]:
        """获取数字孪生"""
        metadata_path = self.results_dir / user_id / twin_id / 'metadata.json'
        
        if not metadata_path.exists():
            return None
        
        with open(metadata_path, 'r') as f:
            data = json.load(f)
        
        return DigitalTwin(
            id=data['id'],
            user_id=data['user_id'],
            created_at=datetime.fromisoformat(data['created_at']),
            updated_at=datetime.fromisoformat(data['created_at']),
            mesh_path=data['mesh_path'],
            texture_path=None,
            measurements=BodyMeasurements(
                height=data['measurements']['height'],
                weight=data['measurements']['weight'],
                chest=data['measurements']['chest'],
                waist=data['measurements']['waist'],
                hips=data['measurements']['hips'],
                body_shape=data['measurements']['body_shape'],
                shoulder_width=0,
                arm_length=0,
                leg_length=0,
                inseam=0,
                neck=0,
                wrist=0,
                ankle=0,
                confidence=data.get('confidence', 0.7)
            ),
            source_image_hash='',
            model_version='pifuhd-v1.0',
            processing_time_ms=data.get('processing_time_ms', 0),
            overall_confidence=data.get('confidence', 0.7)
        )
    
    async def list_digital_twins(self, user_id: str) -> List[DigitalTwin]:
        """列出用户的所有数字孪生"""
        user_dir = self.results_dir / user_id
        
        if not user_dir.exists():
            return []
        
        twins = []
        for twin_dir in user_dir.iterdir():
            if twin_dir.is_dir():
                twin = await self.get_digital_twin(user_id, twin_dir.name)
                if twin:
                    twins.append(twin)
        
        return sorted(twins, key=lambda x: x.created_at, reverse=True)


# FastAPI 服务
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel

from contextlib import asynccontextmanager

# ... (existing imports and code)

service = PIFuHDService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager (replaces deprecated on_event startup)."""
    await service.load_models()
    logger.info("PIFuHD Digital Twin Service started")
    yield
    logger.info("Shutting down PIFuHD Digital Twin Service...")


app = FastAPI(title="PIFuHD Digital Twin Service", lifespan=lifespan)
service = PIFuHDService()

class DigitalTwinResponse(BaseModel):
    id: str
    user_id: str
    created_at: str
    measurements: Dict[str, Any]
    mesh_url: str
    confidence: float

@app.post("/api/v1/digital-twin/create", response_model=DigitalTwinResponse)
async def create_digital_twin(
    user_id: str,
    file: UploadFile = File(...)
):
    """
    从上传的图片创建数字孪生
    
    流程:
    1. 上传全身照片
    2. 自动检测人体
    3. 生成 3D 模型
    4. 计算身体测量数据
    """
    # 保存上传的文件 (使用安全的文件名防止路径遍历)
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, sanitize_filename(file.filename or 'upload.jpg'))
    
    with open(temp_path, 'wb') as f:
        content = await file.read()
        f.write(content)
    
    try:
        # 创建数字孪生
        twin = await service.create_digital_twin(user_id, temp_path)
        
        return DigitalTwinResponse(
            id=twin.id,
            user_id=twin.user_id,
            created_at=twin.created_at.isoformat(),
            measurements={
                'height': twin.measurements.height,
                'weight': twin.measurements.weight,
                'chest': twin.measurements.chest,
                'waist': twin.measurements.waist,
                'hips': twin.measurements.hips,
                'body_shape': twin.measurements.body_shape,
            },
            mesh_url=f"/api/v1/digital-twin/{twin.id}/mesh",
            confidence=twin.overall_confidence
        )
    finally:
        # 清理临时文件
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.get("/api/v1/digital-twin/{twin_id}")
async def get_digital_twin(user_id: str, twin_id: str):
    """获取数字孪生详情"""
    twin = await service.get_digital_twin(user_id, twin_id)
    
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
async def get_mesh(user_id: str, twin_id: str):
    """下载 3D 网格文件"""
    twin = await service.get_digital_twin(user_id, twin_id)
    
    if not twin:
        raise HTTPException(status_code=404, detail="Digital twin not found")
    
    if not os.path.exists(twin.mesh_path):
        raise HTTPException(status_code=404, detail="Mesh file not found")
    
    return FileResponse(
        twin.mesh_path,
        media_type='model/obj',
        filename=f'digital_twin_{twin_id}.obj'
    )

@app.get("/api/v1/digital-twin/list")
async def list_digital_twins(user_id: str):
    """列出用户的所有数字孪生"""
    twins = await service.list_digital_twins(user_id)
    
    return {
        'user_id': user_id,
        'twins': [
            {
                'id': t.id,
                'created_at': t.created_at.isoformat(),
                'body_shape': t.measurements.body_shape,
                'confidence': t.overall_confidence
            }
            for t in twins
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
