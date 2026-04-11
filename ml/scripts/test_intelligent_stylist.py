"""
测试智能造型师服务
验证 GLM-5 驱动的个人形象定制系统
"""

import os
import sys
import asyncio
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from services.intelligent_stylist_service import (
    IntelligentStylistService,
    UserProfile,
    SceneContext
)


async def test_outfit_recommendation():
    print("\n" + "="*60)
    print("测试 1: 智能穿搭推荐")
    print("="*60)
    
    service = IntelligentStylistService()
    
    user_profile = UserProfile(
        body_type="hourglass",
        skin_tone="light",
        color_season="autumn",
        height=165,
        weight=55,
        style_preferences=["法式慵懒", "韩系"],
        style_avoidances=["街头潮流"],
        budget_range={"min": 100, "max": 500},
        occupation="白领",
        fashion_goals=["显瘦", "显高", "提升气质"]
    )
    
    scene_context = SceneContext(
        occasion="date",
        weather="晴天，20度",
        season="spring",
        formality_level="medium"
    )
    
    user_request = "这周末要去和男朋友约会，希望能显得温柔有气质，但不要太正式"
    
    print(f"\n用户档案:")
    print(f"  体型: X型/沙漏身材")
    print(f"  肤色: 浅色, 色彩季型: 秋季型")
    print(f"  身高: 165cm, 体重: 55kg")
    print(f"  偏好风格: 法式慵懒, 韩系")
    print(f"  穿搭目标: 显瘦, 显高, 提升气质")
    print(f"\n场景: 约会")
    print(f"需求: {user_request}")
    print(f"\n正在调用 GLM-5 生成推荐...")
    
    result = await service.generate_outfit_recommendation(
        user_profile=user_profile,
        scene_context=scene_context,
        user_request=user_request
    )
    
    print(f"\n✅ 推荐结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    return result


async def test_body_type_analysis():
    print("\n" + "="*60)
    print("测试 2: 体型分析")
    print("="*60)
    
    service = IntelligentStylistService()
    
    description = """
    我身高160cm，体重52kg，肩膀比较窄，臀部稍微有点宽，
    腰线比较明显，大腿有点肉肉的，整体看起来下半身比上半身丰满一些
    """
    
    print(f"\n用户描述: {description.strip()}")
    print(f"\n正在分析体型...")
    
    result = await service.analyze_body_type(description)
    
    print(f"\n✅ 分析结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    
    return result


async def test_chat_interaction():
    print("\n" + "="*60)
    print("测试 3: 智能对话")
    print("="*60)
    
    service = IntelligentStylistService()
    
    user_profile = UserProfile(
        body_type="triangle",
        skin_tone="medium",
        color_season="summer",
        height=162,
        style_preferences=["韩系", "极简风"],
        occupation="学生"
    )
    
    conversation_history = [
        {"role": "user", "content": "我最近要去面试，应该穿什么?"},
        {"role": "assistant", "content": "面试着装建议选择商务休闲风格..."}
    ]
    
    user_message = "我身高162，有点梨形身材，面试的是互联网公司的运营岗位，不要太正式"
    
    print(f"\n用户消息: {user_message}")
    print(f"\n正在生成回复...")
    
    response = await service.chat_interaction(
        user_message=user_message,
        conversation_history=conversation_history,
        user_profile=user_profile
    )
    
    print(f"\n✅ AI 回复:")
    print(response)
    
    return response


async def test_fashion_trends():
    print("\n" + "="*60)
    print("测试 4: 时尚趋势查询")
    print("="*60)
    
    service = IntelligentStylistService()
    
    current_season = service.current_season
    trends = service.FASHION_TRENDS_2025.get(current_season, {})
    
    print(f"\n当前季节: {current_season}")
    print(f"\n时尚趋势:")
    for key, value in trends.items():
        if isinstance(value, list):
            print(f"  {key}: {', '.join(value)}")
        else:
            print(f"  {key}: {value}")
    
    return trends


async def main():
    print("\n" + "="*60)
    print("智能造型师服务测试")
    print("GLM-5 驱动的个人形象定制系统")
    print("="*60)
    
    api_key = os.getenv("GLM_API_KEY")
    if not api_key:
        print("\n❌ 错误: GLM_API_KEY 未设置")
        return
    
    print(f"\n✅ GLM API Key: {api_key[:10]}...")
    print(f"✅ 模型: {os.getenv('GLM_MODEL', 'glm-5')}")
    
    try:
        await test_fashion_trends()
        await test_body_type_analysis()
        await test_chat_interaction()
        await test_outfit_recommendation()
        
        print("\n" + "="*60)
        print("✅ 所有测试完成!")
        print("="*60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
