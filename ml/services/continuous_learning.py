"""
持续学习调度器
自动化数据收集、标注、训练和部署的完整流程
"""

import os
import sys
import json
import asyncio
import schedule
import time
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging
import threading

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.data_crawler import DataCrawler, ContinuousDataCollector
from services.llm_labeling_service import LLMLabelingService, LabeledItem
from services.incremental_training import IncrementalTrainer, IncrementalTrainingConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ContinuousLearningConfig:
    data_collection_interval_hours: int = 24
    training_interval_hours: int = 72
    min_new_items_for_training: int = 100
    
    keywords_to_track: List[str] = None
    
    auto_deploy: bool = True
    backup_previous_model: bool = True
    
    max_training_iterations: int = 10
    early_stop_accuracy_threshold: float = 0.95
    
    feedback_weight: float = 0.3
    crawled_weight: float = 0.7
    
    def __post_init__(self):
        if self.keywords_to_track is None:
            self.keywords_to_track = [
                "小红书同款", "法式慵懒", "韩系甜美", "日系简约",
                "街头潮流", "极简风", "复古风", "运动风"
            ]


class FeedbackCollector:
    def __init__(self, feedback_dir: str = "./data/feedback"):
        self.feedback_dir = Path(feedback_dir)
        self.feedback_dir.mkdir(parents=True, exist_ok=True)
        
        self.positive_feedback: List[Dict] = []
        self.negative_feedback: List[Dict] = []
        
        self.load_feedback()

    def load_feedback(self):
        feedback_file = self.feedback_dir / "user_feedback.json"
        if feedback_file.exists():
            with open(feedback_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.positive_feedback = data.get("positive", [])
            self.negative_feedback = data.get("negative", [])

    def save_feedback(self):
        feedback_file = self.feedback_dir / "user_feedback.json"
        with open(feedback_file, 'w', encoding='utf-8') as f:
            json.dump({
                "positive": self.positive_feedback,
                "negative": self.negative_feedback,
                "updated_at": datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)

    def add_positive_feedback(self, item_id: str, user_id: str, context: Dict = None):
        self.positive_feedback.append({
            "item_id": item_id,
            "user_id": user_id,
            "context": context or {},
            "timestamp": datetime.now().isoformat()
        })
        self.save_feedback()

    def add_negative_feedback(self, item_id: str, user_id: str, context: Dict = None):
        self.negative_feedback.append({
            "item_id": item_id,
            "user_id": user_id,
            "context": context or {},
            "timestamp": datetime.now().isoformat()
        })
        self.save_feedback()

    def get_training_samples(self) -> Tuple[List[Dict], List[Dict]]:
        positive = [fb for fb in self.positive_feedback]
        negative = [fb for fb in self.negative_feedback]
        return positive, negative


class ContinuousLearningPipeline:
    def __init__(self, config: Optional[ContinuousLearningConfig] = None):
        self.config = config or ContinuousLearningConfig()
        
        self.crawler = DataCrawler()
        self.collector = ContinuousDataCollector(self.crawler)
        self.labeler = LLMLabelingService(use_mock=True)
        self.feedback_collector = FeedbackCollector()
        
        self.training_config = IncrementalTrainingConfig()
        self.trainer: Optional[IncrementalTrainer] = None
        
        self.state = {
            "last_collection": None,
            "last_training": None,
            "total_items_collected": 0,
            "total_training_runs": 0,
            "current_model_version": "v1.0.0",
            "status": "idle"
        }
        
        self.state_file = Path("./data/continuous_learning_state.json")
        self.load_state()
        
        self._running = False
        self._scheduler_thread: Optional[threading.Thread] = None

    def load_state(self):
        if self.state_file.exists():
            with open(self.state_file, 'r', encoding='utf-8') as f:
                saved_state = json.load(f)
            self.state.update(saved_state)

    def save_state(self):
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2)

    async def collect_data(self) -> List[Dict]:
        logger.info("开始数据收集...")
        self.state["status"] = "collecting"
        self.save_state()
        
        await self.crawler.init_session()
        
        try:
            all_items = []
            
            for keyword in self.config.keywords_to_track:
                items = await self.crawler.crawl_pinterest_style(
                    keyword,
                    max_items=20
                )
                all_items.extend(items)
            
            logger.info(f"收集了 {len(all_items)} 条新数据")
            
            self.crawler.save_crawled_data()
            
            self.state["last_collection"] = datetime.now().isoformat()
            self.state["total_items_collected"] += len(all_items)
            self.save_state()
            
            return [asdict(item) for item in all_items]
            
        finally:
            await self.crawler.close_session()

    async def label_data(self, items: List[Dict]) -> List[Dict]:
        logger.info(f"开始标注 {len(items)} 条数据...")
        self.state["status"] = "labeling"
        self.save_state()
        
        labeled_items = await self.labeler.batch_label_items(items, use_llm=True)
        
        labeled_data = [asdict(item) for item in labeled_items]
        
        output_path = Path("./data/labeled/labeled_items.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                "items": labeled_data,
                "labeled_at": datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2)
        
        logger.info(f"标注完成，保存到 {output_path}")
        
        return labeled_data

    async def train_model(self, new_items: List[Dict]) -> Dict[str, float]:
        logger.info("开始模型训练...")
        self.state["status"] = "training"
        self.save_state()
        
        if self.trainer is None:
            self.trainer = IncrementalTrainer(self.training_config)
            self.trainer.load_base_model()
        
        existing_items = self._load_existing_items()
        
        positive_feedback, negative_feedback = self.feedback_collector.get_training_samples()
        
        feedback_items = self._convert_feedback_to_items(positive_feedback)
        
        all_items = new_items + feedback_items
        
        if len(all_items) < self.config.min_new_items_for_training:
            logger.warning(f"数据量不足: {len(all_items)} < {self.config.min_new_items_for_training}")
            return {"status": "skipped", "reason": "insufficient_data"}
        
        train_loader, val_loader = self.trainer.prepare_data(all_items, existing_items)
        
        results = self.trainer.train(train_loader, val_loader)
        
        self.state["last_training"] = datetime.now().isoformat()
        self.state["total_training_runs"] += 1
        
        version_parts = self.state["current_model_version"].split(".")
        version_parts[-1] = str(int(version_parts[-1]) + 1)
        self.state["current_model_version"] = ".".join(version_parts)
        
        self.state["status"] = "idle"
        self.save_state()
        
        logger.info(f"训练完成: {results}")
        
        return results

    def _load_existing_items(self) -> List[Dict]:
        items_file = Path("./data/processed/items.json")
        if items_file.exists():
            with open(items_file, 'r', encoding='utf-8') as f:
                return list(json.load(f).values())
        return []

    def _convert_feedback_to_items(self, feedback: List[Dict]) -> List[Dict]:
        items = []
        for fb in feedback:
            items.append({
                "item_id": fb.get("item_id", ""),
                "style_tags": fb.get("context", {}).get("style_tags", []),
                "category": fb.get("context", {}).get("category", "tops"),
                "user_feedback": "positive"
            })
        return items

    async def run_full_pipeline(self):
        logger.info("="*60)
        logger.info("开始持续学习流水线")
        logger.info("="*60)
        
        try:
            items = await self.collect_data()
            
            if items:
                labeled_items = await self.label_data(items)
                
                results = await self.train_model(labeled_items)
                
                logger.info("持续学习流水线完成")
                return results
            else:
                logger.warning("没有收集到新数据")
                return {"status": "no_data"}
                
        except Exception as e:
            logger.error(f"流水线执行失败: {e}")
            self.state["status"] = "error"
            self.save_state()
            raise

    def start_scheduled_learning(self):
        logger.info("启动定时学习调度器...")
        
        schedule.every(self.config.data_collection_interval_hours).hours.do(
            self._run_async_task, self.run_full_pipeline
        )
        
        self._running = True
        self._scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self._scheduler_thread.start()
        
        logger.info("调度器已启动")

    def stop_scheduled_learning(self):
        self._running = False
        schedule.clear()
        logger.info("调度器已停止")

    def _run_scheduler(self):
        while self._running:
            schedule.run_pending()
            time.sleep(60)

    def _run_async_task(self, coro):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(coro)
        finally:
            loop.close()

    def get_status(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "config": asdict(self.config),
            "feedback_stats": {
                "positive_count": len(self.feedback_collector.positive_feedback),
                "negative_count": len(self.feedback_collector.negative_feedback)
            },
            "next_scheduled_run": self._get_next_scheduled_run()
        }

    def _get_next_scheduled_run(self) -> Optional[str]:
        next_run = schedule.next_run()
        if next_run:
            return next_run.isoformat()
        return None


class ContinuousLearningAPI:
    def __init__(self):
        self.pipeline = ContinuousLearningPipeline()

    async def trigger_learning(self) -> Dict:
        results = await self.pipeline.run_full_pipeline()
        return results

    async def add_feedback(
        self,
        item_id: str,
        user_id: str,
        is_positive: bool,
        context: Optional[Dict] = None
    ) -> Dict:
        if is_positive:
            self.pipeline.feedback_collector.add_positive_feedback(
                item_id, user_id, context
            )
        else:
            self.pipeline.feedback_collector.add_negative_feedback(
                item_id, user_id, context
            )
        
        return {"status": "success", "feedback_type": "positive" if is_positive else "negative"}

    def get_status(self) -> Dict:
        return self.pipeline.get_status()

    def start_auto_learning(self):
        self.pipeline.start_scheduled_learning()
        return {"status": "started"}

    def stop_auto_learning(self):
        self.pipeline.stop_scheduled_learning()
        return {"status": "stopped"}


async def test_continuous_learning():
    pipeline = ContinuousLearningPipeline()
    
    print("="*60)
    print("持续学习系统测试")
    print("="*60)
    
    print("\n当前状态:")
    status = pipeline.get_status()
    print(json.dumps(status, indent=2, ensure_ascii=False))
    
    print("\n触发一次学习...")
    results = await pipeline.run_full_pipeline()
    print(f"结果: {results}")


if __name__ == "__main__":
    asyncio.run(test_continuous_learning())
