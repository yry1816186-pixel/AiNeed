"""诊断 CLIP 模型调用问题 - 修复版本"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "ml"))

def debug_clip():
    import torch
    import torch.nn.functional as F
    from transformers import CLIPModel, CLIPProcessor
    from PIL import Image
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"设备: {device}")
    print(f"PyTorch 版本: {torch.__version__}")
    
    model_path = PROJECT_ROOT / "ml" / "models" / "clip_fashion"
    print(f"模型路径: {model_path}")
    
    print("\n加载模型...")
    model = CLIPModel.from_pretrained(str(model_path), local_files_only=True)
    processor = CLIPProcessor.from_pretrained(str(model_path), local_files_only=True)
    
    model = model.to(device)
    model.eval()
    print("模型加载成功!")
    
    test_image = PROJECT_ROOT / "data" / "raw" / "fashion-dataset-full" / "fashion-dataset" / "images" / "15970.jpg"
    print(f"\n测试图片: {test_image}")
    
    image = Image.open(test_image).convert('RGB')
    print(f"图片尺寸: {image.size}")
    
    inputs = processor(images=image, return_tensors="pt")
    pixel_values = inputs['pixel_values'].to(device)
    print(f"pixel_values 形状: {pixel_values.shape}")
    
    print("\n测试修复方法: vision_model + visual_projection")
    with torch.no_grad():
        try:
            vision_outputs = model.vision_model(pixel_values)
            print(f"vision_outputs 类型: {type(vision_outputs)}")
            print(f"pooler_output 形状: {vision_outputs.pooler_output.shape}")
            
            image_features = vision_outputs.pooler_output
            print(f"提取的 image_features 形状: {image_features.shape}")
            
            image_features = model.visual_projection(image_features)
            print(f"visual_projection 后形状: {image_features.shape}")
            
            image_features = F.normalize(image_features, p=2, dim=1)
            print(f"归一化后形状: {image_features.shape}")
            
            emb = image_features.cpu().numpy().flatten()
            print(f"最终嵌入形状: {emb.shape}")
            print(f"嵌入维度: {len(emb)}")
            print(f"嵌入前5值: {emb[:5]}")
            print(f"嵌入模长: {(emb ** 2).sum() ** 0.5:.6f}")
            print("修复成功!")
            
        except Exception as e:
            print(f"修复失败: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_clip()
