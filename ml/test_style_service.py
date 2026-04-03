"""
测试风格理解服务
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from services.style_understanding_service import StyleUnderstandingService

async def test():
    service = StyleUnderstandingService(use_mock=True)
    
    test_cases = [
        "我想要小红书同款的穿搭",
        "法式慵懒风怎么穿",
        "韩系甜美风格推荐"
    ]
    
    print("="*60)
    print("风格理解服务测试")
    print("="*60)
    
    for user_input in test_cases:
        print(f"\n输入: {user_input}")
        print("-"*60)
        
        analysis = await service.analyze_style_description(user_input)
        
        print(f"风格: {analysis.style_name}")
        print(f"置信度: {analysis.confidence:.2f}")
        print(f"核心元素: {', '.join(analysis.core_elements[:3])}")
        print(f"关键单品: {', '.join(analysis.key_items[:3])}")
        print(f"颜色方案: {', '.join(analysis.color_palette[:3])}")
        print(f"适合场合: {', '.join(analysis.occasions[:3])}")
    
    print("\n" + "="*60)
    print("测试完成!")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test())
