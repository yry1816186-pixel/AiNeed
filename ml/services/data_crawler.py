"""
数据爬取模块
支持从多个时尚平台爬取穿搭数据
"""

import os
import sys
import json
import asyncio
import aiohttp
import aiofiles
import hashlib
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import logging
from urllib.parse import urljoin, urlparse
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class CrawledItem:
    item_id: str
    source: str
    url: str
    image_url: str
    local_image_path: str
    title: str
    description: str
    style_tags: List[str]
    color_tags: List[str]
    price: Optional[float]
    brand: Optional[str]
    likes: int
    crawl_time: str
    raw_data: Dict[str, Any]


class DataCrawler:
    def __init__(self, data_dir: str = "./data/crawled"):
        self.data_dir = Path(data_dir)
        self.images_dir = self.data_dir / "images"
        self.cache_dir = self.data_dir / "cache"
        
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.crawled_items: Dict[str, CrawledItem] = {}
        self.stats = {
            "total_crawled": 0,
            "successful": 0,
            "failed": 0,
            "last_crawl": None
        }

    async def init_session(self):
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        self.session = aiohttp.ClientSession(headers=headers, timeout=aiohttp.ClientTimeout(total=30))

    async def close_session(self):
        if self.session:
            await self.session.close()

    async def download_image(self, url: str, save_path: Path) -> bool:
        try:
            if not self.session:
                await self.init_session()
            
            async with self.session.get(url) as response:
                if response.status != 200:
                    return False
                
                content = await response.read()
                
                async with aiofiles.open(save_path, 'wb') as f:
                    await f.write(content)
                
                return True
        except Exception as e:
            logger.error(f"下载图片失败 {url}: {e}")
            return False

    def generate_item_id(self, source: str, identifier: str) -> str:
        hash_input = f"{source}_{identifier}".encode()
        return hashlib.md5(hash_input).hexdigest()[:12]

    async def crawl_pinterest_style(
        self,
        style_query: str,
        max_items: int = 100
    ) -> List[CrawledItem]:
        logger.info(f"爬取Pinterest风格: {style_query}")
        
        items = []
        
        mock_data = self._generate_mock_pinterest_data(style_query, max_items)
        
        for data in mock_data:
            item_id = self.generate_item_id("pinterest", data["id"])
            
            image_filename = f"{item_id}.jpg"
            image_path = self.images_dir / image_filename
            
            item = CrawledItem(
                item_id=item_id,
                source="pinterest",
                url=data.get("url", ""),
                image_url=data.get("image_url", ""),
                local_image_path=str(image_path),
                title=data.get("title", ""),
                description=data.get("description", ""),
                style_tags=data.get("style_tags", []),
                color_tags=data.get("color_tags", []),
                price=None,
                brand=data.get("brand"),
                likes=data.get("likes", 0),
                crawl_time=datetime.now().isoformat(),
                raw_data=data
            )
            
            items.append(item)
            self.crawled_items[item_id] = item
        
        return items

    def _generate_mock_pinterest_data(self, style_query: str, count: int) -> List[Dict]:
        styles = {
            "小红书": ["小红书风", "网红风", "种草款"],
            "法式": ["法式慵懒", "法式优雅", "巴黎风"],
            "韩系": ["韩系甜美", "韩风", "Korean style"],
            "日系": ["日系简约", "日系文艺", "Japanese style"],
            "街头": ["街头潮流", "嘻哈风", "streetwear"],
            "极简": ["极简风", "简约", "minimalist"],
        }
        
        colors = ["黑色", "白色", "米色", "灰色", "蓝色", "粉色", "绿色", "棕色"]
        categories = ["上衣", "裤装", "裙装", "外套", "鞋子", "配饰"]
        
        items = []
        for i in range(count):
            style_tags = styles.get(style_query, ["时尚"])
            items.append({
                "id": f"pin_{style_query}_{i:05d}",
                "title": f"{style_query}风格{categories[i % len(categories)]}搭配",
                "description": f"这款{style_tags[i % len(style_tags)]}单品非常适合日常穿搭",
                "style_tags": [style_tags[i % len(style_tags)]],
                "color_tags": [colors[i % len(colors)]],
                "brand": f"品牌{(i % 10) + 1}",
                "likes": (i % 100) * 10,
                "url": f"https://pinterest.com/pin/{i}",
                "image_url": f"https://example.com/image/{i}.jpg"
            })
        
        return items

    async def crawl_from_urls(
        self,
        urls: List[str],
        source_name: str = "custom"
    ) -> List[CrawledItem]:
        logger.info(f"从{len(urls)}个URL爬取数据")
        
        items = []
        
        for i, url in enumerate(urls):
            item_id = self.generate_item_id(source_name, url)
            
            item = CrawledItem(
                item_id=item_id,
                source=source_name,
                url=url,
                image_url="",
                local_image_path="",
                title=f"自定义数据 {i}",
                description="",
                style_tags=[],
                color_tags=[],
                price=None,
                brand=None,
                likes=0,
                crawl_time=datetime.now().isoformat(),
                raw_data={"url": url}
            )
            
            items.append(item)
        
        return items

    async def crawl_by_keywords(
        self,
        keywords: List[str],
        max_items_per_keyword: int = 50
    ) -> Dict[str, List[CrawledItem]]:
        results = {}
        
        for keyword in keywords:
            logger.info(f"爬取关键词: {keyword}")
            items = await self.crawl_pinterest_style(keyword, max_items_per_keyword)
            results[keyword] = items
            
            await asyncio.sleep(1)
        
        return results

    def save_crawled_data(self, filename: str = "crawled_items.json"):
        output_path = self.data_dir / filename
        
        data = {
            "items": {k: asdict(v) for k, v in self.crawled_items.items()},
            "stats": self.stats,
            "saved_at": datetime.now().isoformat()
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"保存 {len(self.crawled_items)} 条爬取数据到 {output_path}")

    def load_crawled_data(self, filename: str = "crawled_items.json"):
        input_path = self.data_dir / filename
        
        if not input_path.exists():
            return
        
        with open(input_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        self.crawled_items = {
            k: CrawledItem(**v) for k, v in data.get("items", {}).items()
        }
        self.stats = data.get("stats", self.stats)
        
        logger.info(f"加载 {len(self.crawled_items)} 条爬取数据")


class ContinuousDataCollector:
    def __init__(self, crawler: DataCrawler):
        self.crawler = crawler
        self.collection_config = {
            "keywords": [
                "小红书同款", "法式慵懒", "韩系甜美", "日系简约",
                "街头潮流", "极简风", "复古风", "运动风"
            ],
            "schedule": "daily",
            "max_items_per_run": 100,
            "auto_label": True
        }

    async def collect_trending_styles(self) -> List[CrawledItem]:
        logger.info("收集热门风格数据...")
        
        all_items = []
        
        for keyword in self.collection_config["keywords"]:
            items = await self.crawler.crawl_pinterest_style(
                keyword,
                max_items=self.collection_config["max_items_per_run"] // len(self.collection_config["keywords"])
            )
            all_items.extend(items)
        
        logger.info(f"收集了 {len(all_items)} 条数据")
        return all_items

    async def collect_user_feedback_data(
        self,
        user_likes: List[str],
        user_dislikes: List[str]
    ) -> Dict[str, Any]:
        return {
            "positive_samples": user_likes,
            "negative_samples": user_dislikes,
            "collected_at": datetime.now().isoformat()
        }

    def update_collection_config(self, new_keywords: List[str]):
        self.collection_config["keywords"].extend(new_keywords)
        self.collection_config["keywords"] = list(set(self.collection_config["keywords"]))


async def main():
    crawler = DataCrawler()
    await crawler.init_session()
    
    try:
        keywords = ["小红书", "法式", "韩系"]
        results = await crawler.crawl_by_keywords(keywords, max_items_per_keyword=20)
        
        total = sum(len(items) for items in results.values())
        print(f"\n总共爬取 {total} 条数据")
        
        for keyword, items in results.items():
            print(f"  {keyword}: {len(items)} 条")
        
        crawler.save_crawled_data()
        
    finally:
        await crawler.close_session()


if __name__ == "__main__":
    asyncio.run(main())
