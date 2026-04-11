"""
测试虚拟试衣服务
"""
import requests
import base64
from PIL import Image
import io
import os

TRITON_URL = "http://localhost:8002"

def create_test_image(color, size=(256, 256)):
    """创建测试图片"""
    img = Image.new('RGB', size, color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def test_health():
    """测试健康检查"""
    print("\n=== 测试健康检查 ===")
    resp = requests.get(f"{TRITON_URL}/health")
    print(f"状态码: {resp.status_code}")
    print(f"响应: {resp.json()}")
    return resp.status_code == 200

def test_tryon():
    """测试虚拟试衣"""
    print("\n=== 测试虚拟试衣 ===")
    
    person_image = create_test_image((200, 180, 170), (512, 384))
    cloth_image = create_test_image((50, 100, 150), (256, 256))
    
    payload = {
        "person_image": f"data:image/png;base64,{person_image}",
        "cloth_image": f"data:image/png;base64,{cloth_image}",
        "category": "upper_body"
    }
    
    print("发送请求...")
    resp = requests.post(f"{TRITON_URL}/tryon", json=payload, timeout=30)
    
    print(f"状态码: {resp.status_code}")
    result = resp.json()
    print(f"成功: {result.get('success')}")
    print(f"消息: {result.get('message')}")
    print(f"处理时间: {result.get('processing_time')}秒")
    
    if result.get('success') and result.get('result_image'):
        result_data = result['result_image']
        if result_data.startswith('data:image'):
            result_data = result_data.split(',')[1]
        
        result_bytes = base64.b64decode(result_data)
        result_img = Image.open(io.BytesIO(result_bytes))
        output_path = "test_output/tryon_result.png"
        os.makedirs("test_output", exist_ok=True)
        result_img.save(output_path)
        print(f"结果已保存到: {output_path}")
        print(f"结果图片尺寸: {result_img.size}")
        return True
    
    return False

def test_batch():
    """测试批量试衣"""
    print("\n=== 测试批量试衣 ===")
    
    person_image = create_test_image((180, 160, 150), (512, 384))
    cloth1 = create_test_image((100, 50, 50), (256, 256))
    cloth2 = create_test_image((50, 100, 50), (256, 256))
    cloth3 = create_test_image((50, 50, 100), (256, 256))
    
    payload = {
        "person_image": f"data:image/png;base64,{person_image}",
        "cloth_images": [
            f"data:image/png;base64,{cloth1}",
            f"data:image/png;base64,{cloth2}",
            f"data:image/png;base64,{cloth3}"
        ],
        "category": "upper_body"
    }
    
    print("发送批量请求...")
    resp = requests.post(f"{TRITON_URL}/api/tryon/batch", json=payload, timeout=60)
    
    print(f"状态码: {resp.status_code}")
    result = resp.json()
    print(f"成功数量: {result.get('successful_count')}")
    print(f"总处理时间: {result.get('total_time')}秒")
    
    if result.get('results'):
        os.makedirs("test_output", exist_ok=True)
        for i, res in enumerate(result['results']):
            if res.get('success') and res.get('result_image'):
                img_data = res['result_image']
                if img_data.startswith('data:image'):
                    img_data = img_data.split(',')[1]
                img_bytes = base64.b64decode(img_data)
                img = Image.open(io.BytesIO(img_bytes))
                img.save(f"test_output/batch_result_{i+1}.png")
        print(f"批量结果已保存到 test_output/")
        return True
    
    return False

if __name__ == "__main__":
    print("=" * 50)
    print("虚拟试衣服务测试")
    print("=" * 50)
    
    try:
        test_health()
        test_tryon()
        test_batch()
        print("\n" + "=" * 50)
        print("所有测试完成！")
        print("=" * 50)
    except Exception as e:
        print(f"\n测试失败: {e}")
        import traceback
        traceback.print_exc()
