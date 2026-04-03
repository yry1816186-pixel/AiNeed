"""
完整穿搭方案流程测试 - 详细版
"""
import requests
import json
import base64
from PIL import Image
import io
import os

AI_SERVICE_URL = "http://localhost:8001"
TRYON_SERVICE_URL = "http://localhost:8002"

def test_ai_analysis():
    """测试 AI 风格分析"""
    print("\n【步骤1】AI 风格分析")
    print("=" * 60)
    
    user_profile = {
        "body_type": "rectangle",
        "skin_tone": "medium",
        "height": 165,
        "weight": 55,
        "color_season": "autumn",
        "style_preferences": ["minimalist", "french"],
    }
    
    print(f"用户画像: {json.dumps(user_profile, ensure_ascii=False)}")
    print(f"场景: date (约会)")
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/recommendations/outfit",
            json={
                "user_input": "约会场景，想要法式慵懒风格，显气质",
                "user_profile": user_profile,
                "occasion": "date"
            },
            timeout=120
        )
        
        print(f"\n状态码: {response.status_code}")
        print(f"原始响应: {response.text[:1000]}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n解析后的 JSON:")
            print(json.dumps(result, ensure_ascii=False, indent=2)[:2000])
            return result
        else:
            print(f"请求失败!")
            return None
            
    except Exception as e:
        print(f"异常: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_visual_recommendations():
    """测试视觉方案生成"""
    print("\n【步骤2】视觉方案生成（商品推荐）")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/recommendations",
            json={
                "user_input": "约会场景，法式风格，春天",
                "occasion": "date",
                "top_k": 5
            },
            timeout=120
        )
        
        print(f"\n状态码: {response.status_code}")
        print(f"原始响应: {response.text[:1000]}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n解析后的 JSON:")
            print(json.dumps(result, ensure_ascii=False, indent=2)[:2000])
            return result
        else:
            print(f"请求失败!")
            return None
            
    except Exception as e:
        print(f"异常: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_style_analysis():
    """测试风格分析"""
    print("\n【测试】风格分析 API")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/style/analyze",
            json={
                "description": "我喜欢简约的法式风格，平时上班穿，偶尔约会"
            },
            timeout=60
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text[:500]}")
        
        if response.status_code == 200:
            return response.json()
        return None
        
    except Exception as e:
        print(f"异常: {e}")
        return None

def test_style_suggestions():
    """测试风格建议"""
    print("\n【测试】风格建议 API")
    print("=" * 60)
    
    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/style/suggestions",
            json={
                "description": "约会场景，春天，想要温柔气质的感觉"
            },
            timeout=60
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.text[:500]}")
        
        if response.status_code == 200:
            return response.json()
        return None
        
    except Exception as e:
        print(f"异常: {e}")
        return None

def test_tryon():
    """测试虚拟试衣"""
    print("\n【步骤3】虚拟试衣")
    print("=" * 60)
    
    person_img = Image.new('RGB', (512, 384), (200, 180, 170))
    buf = io.BytesIO()
    person_img.save(buf, format='PNG')
    buf.seek(0)
    person_image = base64.b64encode(buf.read()).decode('utf-8')
    
    cloth_img = Image.new('RGB', (256, 256), (180, 140, 120))
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
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"成功: {result.get('success')}")
            print(f"处理时间: {result.get('processing_time')}秒")
            print(f"消息: {result.get('message')}")
            return result
        else:
            print(f"请求失败: {response.text}")
            return None
            
    except Exception as e:
        print(f"异常: {e}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("详细测试 - 检查每个步骤的实际输出")
    print("=" * 60)
    
    test_style_analysis()
    test_style_suggestions()
    test_ai_analysis()
    test_visual_recommendations()
    test_tryon()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)
