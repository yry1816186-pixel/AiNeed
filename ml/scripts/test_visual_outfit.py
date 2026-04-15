"""
测试可视化穿搭服务
"""

import os
import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from ml.services.tryon.visual_outfit_service import (
    VisualOutfitService,
    UserImageInfo
)


async def test_visual_outfit():
    print("\n" + "="*60)
    print("测试：可视化穿搭方案生成")
    print("="*60)
    
    service = VisualOutfitService()
    
    user_profile = {
        "body_type": "hourglass",
        "skin_tone": "light",
        "color_season": "autumn",
        "height": 165,
        "weight": 55,
        "style_preferences": ["法式慵懒", "韩系"],
        "budget_range": {"min": 100, "max": 500}
    }
    
    scene_context = {
        "occasion": "date",
        "season": "spring",
        "formality_level": "medium"
    }
    
    user_request = "周末约会，想显得温柔有气质"
    
    print(f"\n用户档案:")
    print(f"  体型: X型/沙漏身材")
    print(f"  肤色: 浅色, 色彩季型: 秋季型")
    print(f"  偏好风格: 法式慵懒, 韩系")
    print(f"  预算: 100-500元")
    print(f"\n场景: 约会")
    print(f"需求: {user_request}")
    
    print(f"\n正在生成可视化穿搭方案...")
    
    result = await service.generate_visual_outfit(
        user_profile=user_profile,
        scene_context=scene_context,
        user_image=None,
        user_request=user_request
    )
    
    print(f"\n✅ 生成结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    return result


async def test_keyword_generation():
    print("\n" + "="*60)
    print("测试：关键词生成")
    print("="*60)
    
    service = VisualOutfitService()
    
    user_profile = {
        "body_type": "triangle",
        "skin_tone": "medium",
        "style_preferences": ["韩系", "极简风"],
        "budget_range": {"min": 50, "max": 300}
    }
    
    scene_context = {
        "occasion": "interview",
        "season": "spring",
        "formality_level": "high"
    }
    
    print(f"\n场景: 面试")
    print(f"\n正在生成搜索关键词...")
    
    keywords = await service._generate_search_keywords(
        user_profile, scene_context, "互联网公司运营岗位面试"
    )
    
    print(f"\n✅ 关键词结果:")
    print(json.dumps(keywords, ensure_ascii=False, indent=2))
    
    return keywords


async def main():
    print("\n" + "="*60)
    print("可视化穿搭服务测试")
    print("="*60)
    
    api_key = os.getenv("GLM_API_KEY")
    if not api_key:
        print("\n❌ 错误: GLM_API_KEY 未设置")
        return
    
    print(f"\n✅ GLM API Key: {api_key[:10]}...")
    
    try:
        await test_keyword_generation()
        await test_visual_outfit()
        
        print("\n" + "="*60)
        print("✅ 所有测试完成!")
        print("="*60)
        print("\n提示：当前商品数据为 Mock 数据")
        print("要获取真实商品，请配置淘宝客或京东联盟 API")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
