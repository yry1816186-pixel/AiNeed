"""
模型完整性验证测试脚本
验证所有模型文件的完整性、版本信息和授权合规性
"""

import os
import hashlib
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import torch
import numpy as np
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelValidator:
    """模型验证器"""

    def __init__(self, models_base_path: str):
        self.models_path = Path(models_base_path)
        self.results = {}

    def calculate_file_hash(self, file_path: Path, algorithm: str = 'sha256') -> str:
        """计算文件哈希值"""
        hash_func = getattr(hashlib, algorithm)()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hash_func.update(chunk)
            return hash_func.hexdigest()
        except Exception as e:
            logger.error(f"计算哈希失败 {file_path}: {e}")
            return f"ERROR: {e}"

    def validate_model_file(self, file_path: Path, expected_size: int = None) -> Dict:
        """验证单个模型文件"""
        result = {
            'file_path': str(file_path),
            'file_name': file_path.name,
            'file_size_mb': file_path.stat().st_size / (1024 * 1024),
            'file_size_gb': file_path.stat().st_size / (1024 * 1024 * 1024),
            'sha256_hash': self.calculate_file_hash(file_path),
            'size_check': None,
            'load_test': None,
            'integrity': 'UNKNOWN',
            'timestamp': file_path.stat().st_mtime
        }

        # 检查文件大小
        if expected_size:
            actual_size = file_path.stat().st_size
            size_diff = abs(actual_size - expected_size)
            size_diff_percent = (size_diff / expected_size) * 100
            result['size_check'] = {
                'expected_mb': expected_size / (1024 * 1024),
                'actual_mb': actual_size / (1024 * 1024),
                'difference_mb': size_diff / (1024 * 1024),
                'difference_percent': size_diff_percent,
                'status': 'PASS' if size_diff_percent < 5 else 'FAIL'
            }

        # 测试文件可读性
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)  # 读取前1KB
                result['load_test'] = 'PASS' if len(chunk) > 0 else 'FAIL'
        except Exception as e:
            result['load_test'] = f'FAIL: {e}'
            result['integrity'] = 'INVALID'

        return result

    def validate_clip_model(self) -> Dict:
        """验证CLIP模型"""
        logger.info("验证CLIP模型...")

        clip_path = self.models_path / "clip"
        if not clip_path.exists():
            return {'status': 'ERROR', 'message': 'CLIP模型目录不存在'}

        # 找到主要的模型文件
        pytorch_model = clip_path / "snapshots" / "3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268" / "pytorch_model.bin"
        safetensors_model = clip_path / "snapshots" / "c237dc49a33fc61debc9276459120b7eac67e7ef" / "model.safetensors"

        results = {}

        if pytorch_model.exists():
            results['pytorch_model.bin'] = self.validate_model_file(pytorch_model, 578 * 1024 * 1024)  # 578MB

        if safetensors_model.exists():
            results['model.safetensors'] = self.validate_model_file(safetensors_model, 578 * 1024 * 1024)  # 578MB

        # 测试CLIP加载
        try:
            import torch
            from transformers import CLIPModel, CLIPProcessor

            config_path = clip_path / "snapshots" / "3d74acf9a28c67741b2f4f2ea7635f0aaf6f0268" / "config.json"
            if config_path.exists():
                with open(config_path, 'r') as f:
                    config = json.load(f)

                logger.info(f"CLIP配置: {config.get('_name_or_path', 'Unknown')}")
                logger.info(f"投影维度: {config.get('projection_dim', 'Unknown')}")

            # 尝试加载模型
            test_model = CLIPModel.from_pretrained(str(clip_path))
            results['load_test'] = 'PASS'
            logger.info("CLIP模型加载测试通过")

        except Exception as e:
            results['load_test'] = f'FAIL: {e}'
            logger.error(f"CLIP模型加载失败: {e}")

        results['status'] = 'VALID' if 'load_test' in results and results['load_test'] == 'PASS' else 'INVALID'
        return results

    def validate_idm_vton_model(self) -> Dict:
        """验证IDM-VTON模型"""
        logger.info("验证IDM-VTON模型...")

        idm_path = self.models_path / "idm-vton"
        if not idm_path.exists():
            return {'status': 'ERROR', 'message': 'IDM-VTON模型目录不存在'}

        # 验证核心组件
        core_files = {
            'vae/diffusion_pytorch_model.safetensors': 320 * 1024 * 1024,  # 320MB
            'text_encoder/model.safetensors': 470 * 1024 * 1024,  # 470MB
            'text_encoder_2/model.safetensors': 2.6 * 1024 * 1024 * 1024,  # 2.6GB
            'unet/diffusion_pytorch_model.bin': 12 * 1024 * 1024 * 1024,  # 12GB
            'image_encoder/model.safetensors': 2.4 * 1024 * 1024 * 1024,  # 2.4GB
        }

        results = {}

        for file_path, expected_size in core_files.items():
            full_path = idm_path / file_path
            if full_path.exists():
                results[file_path] = self.validate_model_file(full_path, expected_size)
            else:
                results[file_path] = {
                    'status': 'MISSING',
                    'message': f'文件不存在: {file_path}'
                }

        # 验证配置文件
        model_index = idm_path / "model_index.json"
        if model_index.exists():
            try:
                with open(model_index, 'r') as f:
                    config = json.load(f)
                results['model_index'] = {
                    'status': 'VALID',
                    'config': config,
                    'base_model': config.get('_name_or_path', 'Unknown')
                }
                logger.info(f"IDM-VTON基础模型: {config.get('_name_or_path', 'Unknown')}")
            except Exception as e:
                results['model_index'] = {'status': 'ERROR', 'error': str(e)}

        # 测试IDM-VTON加载
        try:
            from diffusers import StableDiffusionXLInpaintPipeline

            # 尝试加载管道
            pipeline = StableDiffusionXLInpaintPipeline.from_pretrained(str(idm_path))
            results['load_test'] = 'PASS'
            logger.info("IDM-VTON管道加载测试通过")

        except Exception as e:
            results['load_test'] = f'FAIL: {e}'
            logger.error(f"IDM-VTON模型加载失败: {e}")

        results['status'] = 'VALID' if 'load_test' in results and results['load_test'] == 'PASS' else 'INVALID'
        return results

    def validate_sam_model(self) -> Dict:
        """验证SAM模型"""
        logger.info("验证SAM模型...")

        sam_path = self.models_path / "sam"
        if not sam_path.exists():
            return {'status': 'ERROR', 'message': 'SAM模型目录不存在'}

        # SAM有两个主要模型文件
        sam_models = {
            'sam_vit_h.pth': 535 * 1024 * 1024,  # 535MB
            'sam_vit_h_4b8939.pth': 2.4 * 1024 * 1024 * 1024,  # 2.4GB
        }

        results = {}

        for file_name, expected_size in sam_models.items():
            file_path = sam_path / file_name
            if file_path.exists():
                results[file_name] = self.validate_model_file(file_path, expected_size)
            else:
                results[file_name] = {
                    'status': 'MISSING',
                    'message': f'文件不存在: {file_name}'
                }

        # 测试SAM加载
        try:
            from segment_anything import sam_model_registry, SamAutomaticMaskGenerator

            # 尝试加载SAM
            sam = sam_model_registry["vit_h"](checkpoint=str(sam_path / "sam_vit_h.pth"))
            results['load_test'] = 'PASS'
            logger.info("SAM模型加载测试通过")

        except Exception as e:
            results['load_test'] = f'FAIL: {e}'
            logger.error(f"SAM模型加载失败: {e}")

        results['status'] = 'VALID' if 'load_test' in results and results['load_test'] == 'PASS' else 'INVALID'
        return results

    def validate_yolo_model(self) -> Dict:
        """验证YOLO模型"""
        logger.info("验证YOLO模型...")

        yolo_path = self.models_path / "yolo"
        if not yolo_path.exists():
            return {'status': 'ERROR', 'message': 'YOLO模型目录不存在'}

        yolo_model = yolo_path / "yolo11n.pt"
        if not yolo_model.exists():
            return {'status': 'ERROR', 'message': 'YOLO模型文件不存在'}

        result = self.validate_model_file(yolo_model, 5.4 * 1024 * 1024)

        # 测试YOLO加载
        try:
            import ultralytics
            from ultralytics import YOLO

            # 尝试加载YOLO模型
            model = YOLO(str(yolo_model))
            result['load_test'] = 'PASS'
            logger.info("YOLO模型加载测试通过")

            # 测试推理
            test_image = np.zeros((640, 640, 3), dtype=np.uint8)
            results = model(test_image, verbose=False)
            result['inference_test'] = 'PASS'
            logger.info("YOLO推理测试通过")

        except Exception as e:
            result['load_test'] = f'FAIL: {e}'
            result['inference_test'] = f'FAIL: {e}'
            logger.error(f"YOLO模型测试失败: {e}")

        result['status'] = 'VALID' if result.get('load_test') == 'PASS' else 'INVALID'
        return result

    def validate_licenses(self) -> Dict:
        """验证开源许可证"""
        logger.info("验证开源许可证...")

        licenses = {}

        # 检查各个模型的许可证信息
        license_checks = {
            'CLIP': {
                'expected_license': 'MIT',
                'source': 'https://huggingface.co/openai/clip-vit-base-patch32',
                'commercial_use': True,
                'citation_required': True
            },
            'IDM-VTON': {
                'expected_license': 'CC BY-NC-SA 4.0',
                'source': 'https://huggingface.co/yisol/IDM-VTON',
                'commercial_use': False,  # 非商业使用
                'citation_required': True,
                'restrictions': ['禁止商业用途', '相同方式共享', '署名要求']
            },
            'SAM': {
                'expected_license': 'Apache 2.0',
                'source': 'https://github.com/facebookresearch/segment-anything',
                'commercial_use': True,
                'citation_required': True
            },
            'YOLO': {
                'expected_license': 'AGPL-3.0',
                'source': 'https://github.com/ultralytics/ultralytics',
                'commercial_use': True,
                'citation_required': True
            }
        }

        for model_name, license_info in license_checks.items():
            licenses[model_name] = {
                'expected_license': license_info['expected_license'],
                'source': license_info['source'],
                'commercial_use': license_info['commercial_use'],
                'citation_required': license_info['citation_required'],
                'compliance_status': 'CHECK_REQUIRED',
                'restrictions': license_info.get('restrictions', [])
            }

        return licenses

    def run_full_validation(self) -> Dict:
        """运行完整验证"""
        logger.info("开始完整模型验证...")

        validation_results = {
            'timestamp': str(Path(__file__).stat().st_mtime),
            'models_path': str(self.models_path),
            'clip_model': self.validate_clip_model(),
            'idm_vton_model': self.validate_idm_vton_model(),
            'sam_model': self.validate_sam_model(),
            'yolo_model': self.validate_yolo_model(),
            'licenses': self.validate_licenses(),
            'summary': {}
        }

        # 生成汇总报告
        validation_results['summary'] = self.generate_summary(validation_results)

        return validation_results

    def generate_summary(self, results: Dict) -> Dict:
        """生成汇总报告"""
        summary = {
            'total_models': 0,
            'valid_models': 0,
            'invalid_models': 0,
            'missing_models': 0,
            'license_compliance_issues': 0,
            'total_size_gb': 0,
            'recommendations': []
        }

        models = ['clip_model', 'idm_vton_model', 'sam_model', 'yolo_model']
        for model in models:
            if model in results:
                model_result = results[model]
                if isinstance(model_result, dict):
                    status = model_result.get('status', 'UNKNOWN')
                    summary['total_models'] += 1

                    if status == 'VALID':
                        summary['valid_models'] += 1
                    elif status == 'INVALID':
                        summary['invalid_models'] += 1
                    elif status == 'ERROR':
                        summary['missing_models'] += 1

                    # 计算模型大小
                    if isinstance(model_result, dict):
                        for key, value in model_result.items():
                            if isinstance(value, dict) and 'file_size_gb' in value:
                                summary['total_size_gb'] += value['file_size_gb']

        # 检查许可证合规性
        licenses = results.get('licenses', {})
        for model_name, license_info in licenses.items():
            if model_name == 'IDM-VTON' and not license_info['commercial_use']:
                summary['license_compliance_issues'] += 1
                summary['recommendations'].append(
                    f"警告: {model_name} 使用 CC BY-NC-SA 4.0 许可证，禁止商业使用"
                )

        # 生成建议
        if summary['invalid_models'] > 0:
            summary['recommendations'].append("建议修复无效的模型文件")

        if summary['missing_models'] > 0:
            summary['recommendations'].append("建议下载缺失的模型文件")

        if summary['license_compliance_issues'] > 0:
            summary['recommendations'].append("注意模型许可证限制，确保合规使用")

        return summary

    def save_report(self, results: Dict, output_path: str = None):
        """保存验证报告"""
        if output_path is None:
            output_path = self.models_path / "model_validation_report.json"

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        logger.info(f"验证报告已保存到: {output_path}")
        return output_path

def main():
    """主函数"""
    models_path = str(Path(__file__).parent.parent / "models") if Path(__file__).parent.parent.name == "scripts" else "C:/AiNeed/models"
    validator = ModelValidator(models_path)

    # 运行验证
    results = validator.run_full_validation()

    # 保存报告
    report_path = validator.save_report(results)

    # 打印汇总信息
    print("\n" + "="*60)
    print("模型验证汇总报告")
    print("="*60)
    print(f"验证时间: {results['timestamp']}")
    print(f"模型路径: {results['models_path']}")
    print(f"总模型数量: {results['summary']['total_models']}")
    print(f"有效模型: {results['summary']['valid_models']}")
    print(f"无效模型: {results['summary']['invalid_models']}")
    print(f"缺失模型: {results['summary']['missing_models']}")
    print(f"总大小: {results['summary']['total_size_gb']:.2f} GB")

    if results['summary']['license_compliance_issues'] > 0:
        print(f"许可证合规问题: {results['summary']['license_compliance_issues']}")

    print("\n建议:")
    for rec in results['summary']['recommendations']:
        print(f"  - {rec}")

    print(f"\n详细报告: {report_path}")

    return results

if __name__ == "__main__":
    main()