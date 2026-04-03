"""
测试虚拟试衣服务
"""

import asyncio
import aiohttp


async def test_health():
    print("\n" + "="*60)
    print("测试：虚拟试衣服务健康检查")
    print("="*60)
    
    async with aiohttp.ClientSession() as session:
        async with session.get("http://localhost:8002/health") as response:
            if response.status == 200:
                result = await response.json()
                print(f"✅ 服务健康: {result}")
            else:
                print(f"❌ 健康检查失败: {response.status}")


async def test_tryon():
    print("\n" + "="*60)
    print("测试：虚拟试衣功能")
    print("="*60)
    
    person_image_url = "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=512"
    cloth_image_url = "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=256"
    
    print(f"\n人物图片: {person_image_url}")
    print(f"服装图片: {cloth_image_url}")
    print(f"\n正在生成虚拟试衣效果...")
    
    async with aiohttp.ClientSession() as session:
        payload = {
            "person_image": person_image_url,
            "cloth_image": cloth_image_url,
            "category": "upper_body"
        }
        
        async with session.post(
            "http://localhost:8002/tryon",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=60)
        ) as response:
            if response.status == 200:
                result = await response.json()
                print(f"\n✅ 虚拟试衣成功!")
                print(f"   处理时间: {result.get('processing_time', 0):.2f}秒")
                print(f"   结果图片: {len(result.get('result_image', ''))} 字符 (base64)")
            else:
                error = await response.text()
                print(f"❌ 虚拟试衣失败: {response.status} - {error}")


if __name__ == "__main__":
    asyncio.run(test_health())
    asyncio.run(test_tryon())
