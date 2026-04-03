"""
完整穿搭方案流程测试
验证: AI分析 → 视觉方案生成 → 虚拟试衣
"""
import requests
import json
import base64
from PIL import Image
import io
import os

AI_SERVICE_URL = "http://localhost:8001"
TRYON_SERVICE_URL = "http://localhost:8002"

def create_test_person_image():
    """创建测试人物图片"""
    img = Image.new('RGB', (512, 384), (200, 180, 170))
    for y in range(384):
        for x in range(512):
            if 150 < y < 250 and 180 < x < 320:
                img.putpixel((x, y), (220, 200, 180))
            elif y > 300:
                img.putpixel((x, y), (100, 100, 120))
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')

def test_complete_flow():
    """测试完整的穿搭方案流程"""
    print("=" * 60)
    print("完整穿搭方案流程测试")
    print("=" * 60)
    
    user_profile = {
        "body_type": "rectangle",
        "skin_tone": "medium",
        "height": 165,
        "weight": 55,
        "color_season": "autumn",
        "style_preferences": ["minimalist", "french"],
        "avoid_styles": ["streetwear"]
    }
    
    occasion = "date"
    weather = "spring_mild"
    budget = {"min": 200, "max": 800}
    
    print("\n【步骤1】AI 风格分析")
    print("-" * 40)
    print(f"用户画像: {json.dumps(user_profile, ensure_ascii=False, indent=2)}")
    print(f"场景: {occasion}")
    print(f"天气: {weather}")
    print(f"预算: {budget}")
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/recommendations/outfit",
            json={
                "user_input": "约会场景，想要法式慵懒风格，显气质",
                "user_profile": user_profile,
                "occasion": occasion
            },
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\nAI 分析成功!")
            
            if "recommendations" in result:
                for i, rec in enumerate(result["recommendations"][:2]):
                    print(f"\n方案 {i+1}: {rec.get('name', '未命名')}")
                    print(f"  描述: {rec.get('description', '')[:100]}...")
                    if "items" in rec:
                        print(f"  单品数量: {len(rec['items'])}")
                        for item in rec["items"][:3]:
                            print(f"    - {item.get('type', '')}: {item.get('description', '')[:50]}")
        else:
            print(f"AI 分析失败: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"AI 分析异常: {e}")
    
    print("\n【步骤2】视觉方案生成")
    print("-" * 40)
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/recommendations",
            json={
                "user_input": "约会场景，想要法式慵懒风格，显气质，春天穿着",
                "user_profile": user_profile,
                "occasion": occasion,
                "top_k": 5
            },
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"视觉方案生成成功!")
            
            if "outfit" in result:
                outfit = result["outfit"]
                print(f"方案名称: {outfit.get('title', '未命名')}")
                print(f"风格: {outfit.get('style', '')}")
                
                products = outfit.get("products", [])
                print(f"商品数量: {len(products)}")
                
                for i, product in enumerate(products[:3]):
                    print(f"\n  商品 {i+1}:")
                    print(f"    名称: {product.get('name', '')}")
                    print(f"    类型: {product.get('type', '')}")
                    print(f"    颜色: {product.get('color', '')}")
                    print(f"    价格: ¥{product.get('price', 0)}")
                    print(f"    推荐理由: {product.get('recommendation_reason', '')[:50]}...")
        else:
            print(f"视觉方案生成失败: {response.status_code}")
            
    except Exception as e:
        print(f"视觉方案生成异常: {e}")
    
    print("\n【步骤3】虚拟试衣")
    print("-" * 40)
    
    person_image = create_test_person_image()
    
    cloth_img = Image.new('RGB', (256, 256), (180, 140, 120))
    for y in range(256):
        for x in range(256):
            if 50 < y < 200 and 30 < x < 220:
                cloth_img.putpixel((x, y), (200, 160, 140))
    buf = io.BytesIO()
    cloth_img.save(buf, format='PNG')
    buf.seek(0)
    cloth_image = base64.b64encode(buf.read()).decode('utf-8')
    
    try:
        response = requests.post(
            f"{TRYON_SERVICE_URL}/tryon",
            json={
                "person_image": f"data:image/png;base64,{person_image}",
                "cloth_image": f"data:image/png;base64,{cloth_image}",
                "category": "upper_body"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"虚拟试衣成功!")
            print(f"处理时间: {result.get('processing_time', 0):.2f}秒")
            print(f"消息: {result.get('message', '')}")
            
            if result.get('result_image'):
                os.makedirs("test_output", exist_ok=True)
                result_data = result['result_image']
                if result_data.startswith('data:image'):
                    result_data = result_data.split(',')[1]
                
                result_bytes = base64.b64decode(result_data)
                result_img = Image.open(io.BytesIO(result_bytes))
                result_img.save("test_output/complete_flow_result.png")
                print(f"试衣结果已保存: test_output/complete_flow_result.png")
                print(f"结果图片尺寸: {result_img.size}")
        else:
            print(f"虚拟试衣失败: {response.status_code}")
            
    except Exception as e:
        print(f"虚拟试衣异常: {e}")
    
    print("\n" + "=" * 60)
    print("完整流程测试完成!")
    print("=" * 60)
    print("\n流程总结:")
    print("1. AI 分析: 根据用户画像和场景生成穿搭建议")
    print("2. 视觉方案: 生成具体商品和搭配组合")
    print("3. 虚拟试衣: 将服装合成到用户照片上")

if __name__ == "__main__":
    test_complete_flow()
