"""
端到端模型训练脚本
基于39篇论文算法，训练服装推荐模型

NOTE: KMP_DUPLICATE_LIB_OK removed - ensure clean OpenMP environment
"""

import os
# Removed: os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import sys
import json
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torchvision import transforms
from PIL import Image
import numpy as np
from pathlib import Path
from tqdm import tqdm
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import random

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.pcmf_model import PCMFModel, ModelConfig


@dataclass
class TrainingConfig:
    batch_size: int = 32
    num_epochs: int = 50
    learning_rate: float = 1e-4
    weight_decay: float = 1e-5
    warmup_steps: int = 500
    max_grad_norm: float = 1.0
    save_steps: int = 1000
    eval_steps: int = 500
    output_dir: str = "checkpoints"
    device: str = "auto"


class FashionDataset(Dataset):
    """服装搭配数据集"""
    
    def __init__(
        self,
        items_file: str,
        outfits_file: str,
        image_dir: str,
        transform=None,
        max_samples: int = None
    ):
        with open(items_file, 'r', encoding='utf-8') as f:
            self.items = json.load(f)
        
        with open(outfits_file, 'r', encoding='utf-8') as f:
            self.outfits = json.load(f)
        
        self.image_dir = Path(image_dir)
        self.transform = transform or self._default_transform()
        
        self.pairs = self._create_pairs()
        
        if max_samples:
            self.pairs = self.pairs[:max_samples]
        
        self.style_to_idx = self._build_vocab('style')
        self.category_to_idx = self._build_vocab('category')
        
        print(f"数据集加载完成: {len(self.pairs)} 对搭配")
    
    def _default_transform(self):
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def _create_pairs(self) -> List[Dict]:
        pairs = []
        
        for outfit_id, outfit in self.outfits.items():
            items = outfit.get('items', [])
            compatibility = outfit.get('compatibility_score', 0.8)
            
            for i in range(len(items)):
                for j in range(i + 1, len(items)):
                    item1_id = items[i]
                    item2_id = items[j]
                    
                    if item1_id in self.items and item2_id in self.items:
                        pairs.append({
                            'item1_id': item1_id,
                            'item2_id': item2_id,
                            'compatibility': compatibility,
                            'style': outfit.get('style', 'casual'),
                            'occasion': outfit.get('occasion', 'daily')
                        })
        
        negative_pairs = []
        item_ids = list(self.items.keys())
        for _ in range(len(pairs) // 2):
            item1_id = random.choice(item_ids)
            item2_id = random.choice(item_ids)
            
            if item1_id != item2_id:
                negative_pairs.append({
                    'item1_id': item1_id,
                    'item2_id': item2_id,
                    'compatibility': random.uniform(0.1, 0.4),
                    'style': 'mixed',
                    'occasion': 'any'
                })
        
        pairs.extend(negative_pairs)
        random.shuffle(pairs)
        
        return pairs
    
    def _build_vocab(self, attr_name: str) -> Dict[str, int]:
        vocab = {'<pad>': 0, '<unk>': 1}
        idx = 2
        
        for item_id, item in self.items.items():
            attrs = item.get('attributes', {})
            values = attrs.get(attr_name, [])
            
            if isinstance(values, str):
                values = [values]
            
            for v in values:
                if v not in vocab:
                    vocab[v] = idx
                    idx += 1
        
        return vocab
    
    def __len__(self):
        return len(self.pairs)
    
    def __getitem__(self, idx):
        pair = self.pairs[idx]
        
        item1 = self.items[pair['item1_id']]
        item2 = self.items[pair['item2_id']]
        
        img1 = self._load_image(item1.get('image_path', ''))
        img2 = self._load_image(item2.get('image_path', ''))
        
        text1 = self._tokenize_text(item1)
        text2 = self._tokenize_text(item2)
        
        cat1 = self._get_category_idx(item1)
        cat2 = self._get_category_idx(item2)
        
        style1 = self._get_style_idx(item1)
        style2 = self._get_style_idx(item2)
        
        user_id = torch.tensor(random.randint(0, 999), dtype=torch.long)
        
        return {
            'item1_visual': img1,
            'item1_text': text1,
            'item1_category': cat1,
            'item1_style': style1,
            'item2_visual': img2,
            'item2_text': text2,
            'item2_category': cat2,
            'item2_style': style2,
            'compatibility': torch.tensor(pair['compatibility'], dtype=torch.float32),
            'user_id': user_id,
        }
    
    def _load_image(self, image_path: str) -> torch.Tensor:
        try:
            if image_path and os.path.exists(image_path):
                img = Image.open(image_path).convert('RGB')
            else:
                img = Image.new('RGB', (224, 224), (128, 128, 128))
            
            return self.transform(img)
        except Exception:
            return torch.zeros(3, 224, 224)
    
    def _tokenize_text(self, item: Dict) -> torch.Tensor:
        attrs = item.get('attributes', {})
        text_parts = [
            item.get('name', ''),
            ' '.join(attrs.get('style', [])),
            ' '.join(attrs.get('occasions', [])),
            ' '.join(attrs.get('colors', [])),
        ]
        text = ' '.join(text_parts)
        
        tokens = [hash(c) % 10000 for c in text.lower().split()[:50]]
        
        while len(tokens) < 50:
            tokens.append(0)
        
        return torch.tensor(tokens[:50], dtype=torch.long)
    
    def _get_category_idx(self, item: Dict) -> torch.Tensor:
        category = item.get('category', 'tops')
        idx = self.category_to_idx.get(category, 1)
        return torch.tensor(idx, dtype=torch.long)
    
    def _get_style_idx(self, item: Dict) -> torch.Tensor:
        attrs = item.get('attributes', {})
        styles = attrs.get('style', ['casual'])
        
        if isinstance(styles, str):
            styles = [styles]
        
        idx = self.style_to_idx.get(styles[0] if styles else 'casual', 1)
        return torch.tensor(idx, dtype=torch.long)


class Trainer:
    """模型训练器"""
    
    def __init__(
        self,
        model: nn.Module,
        train_dataset: Dataset,
        eval_dataset: Dataset,
        config: TrainingConfig
    ):
        self.model = model
        self.config = config
        
        if config.device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(config.device)
        
        self.model = self.model.to(self.device)
        
        self.train_loader = DataLoader(
            train_dataset,
            batch_size=config.batch_size,
            shuffle=True,
            num_workers=0,
            pin_memory=True
        )
        
        self.eval_loader = DataLoader(
            eval_dataset,
            batch_size=config.batch_size,
            shuffle=False,
            num_workers=0,
            pin_memory=True
        )
        
        self.optimizer = AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay
        )
        
        self.scheduler = CosineAnnealingLR(
            self.optimizer,
            T_max=config.num_epochs * len(self.train_loader)
        )
        
        self.criterion = nn.BCELoss()
        
        self.global_step = 0
        self.best_eval_loss = float('inf')
        
        os.makedirs(config.output_dir, exist_ok=True)
    
    def train(self):
        """训练循环"""
        print(f"开始训练，设备: {self.device}")
        print(f"训练样本: {len(self.train_loader.dataset)}")
        print(f"验证样本: {len(self.eval_loader.dataset)}")
        
        for epoch in range(self.config.num_epochs):
            self.model.train()
            train_loss = 0.0
            
            progress_bar = tqdm(
                self.train_loader,
                desc=f"Epoch {epoch + 1}/{self.config.num_epochs}"
            )
            
            for batch in progress_bar:
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                self.optimizer.zero_grad()
                
                outputs = self.model(batch)
                
                loss = self.criterion(
                    outputs['compatibility'],
                    batch['compatibility']
                )
                
                loss.backward()
                
                torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(),
                    self.config.max_grad_norm
                )
                
                self.optimizer.step()
                self.scheduler.step()
                
                train_loss += loss.item()
                
                progress_bar.set_postfix({
                    'loss': loss.item(),
                    'lr': self.scheduler.get_last_lr()[0]
                })
                
                self.global_step += 1
                
                if self.global_step % self.config.eval_steps == 0:
                    eval_loss = self.evaluate()
                    
                    if eval_loss < self.best_eval_loss:
                        self.best_eval_loss = eval_loss
                        self.save_checkpoint(f"best_model.pth")
            
            avg_train_loss = train_loss / len(self.train_loader)
            eval_loss = self.evaluate()
            
            print(f"\nEpoch {epoch + 1} Summary:")
            print(f"  Train Loss: {avg_train_loss:.4f}")
            print(f"  Eval Loss: {eval_loss:.4f}")
            print(f"  Best Eval Loss: {self.best_eval_loss:.4f}")
            
            self.save_checkpoint(f"checkpoint_epoch_{epoch + 1}.pth")
        
        print("\n训练完成!")
        return self.model
    
    def evaluate(self) -> float:
        """评估模型"""
        self.model.eval()
        eval_loss = 0.0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for batch in self.eval_loader:
                batch = {k: v.to(self.device) for k, v in batch.items()}
                
                outputs = self.model(batch)
                
                loss = self.criterion(
                    outputs['compatibility'],
                    batch['compatibility']
                )
                eval_loss += loss.item()
                
                preds = (outputs['compatibility'] > 0.5).float()
                correct += (preds == batch['compatibility']).sum().item()
                total += batch['compatibility'].size(0)
        
        avg_loss = eval_loss / len(self.eval_loader)
        accuracy = correct / total
        
        print(f"  Eval - Loss: {avg_loss:.4f}, Accuracy: {accuracy:.4f}")
        
        self.model.train()
        return avg_loss
    
    def save_checkpoint(self, filename: str):
        """保存检查点"""
        checkpoint = {
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'global_step': self.global_step,
            'best_eval_loss': self.best_eval_loss,
        }
        
        path = os.path.join(self.config.output_dir, filename)
        torch.save(checkpoint, path)
        print(f"  保存检查点: {path}")


def main():
    print("="*60)
    print("  服装推荐模型训练")
    print("  基于39篇论文算法")
    print("="*60)
    
    model_config = ModelConfig(
        visual_dim=2048,
        textual_dim=300,
        hidden_dim=256,
        embedding_dim=128,
        num_epochs=30,
        batch_size=16,
        learning_rate=1e-4
    )
    
    training_config = TrainingConfig(
        batch_size=16,
        num_epochs=30,
        learning_rate=1e-4,
        output_dir="checkpoints"
    )
    
    print("\n加载数据集...")
    
    train_dataset = FashionDataset(
        items_file="data/processed/items.json",
        outfits_file="data/processed/outfits.json",
        image_dir="data/raw/images",
        max_samples=5000
    )
    
    eval_dataset = FashionDataset(
        items_file="data/processed/items.json",
        outfits_file="data/processed/outfits.json",
        image_dir="data/raw/images",
        max_samples=1000
    )
    
    print(f"训练集大小: {len(train_dataset)}")
    print(f"验证集大小: {len(eval_dataset)}")
    
    print("\n初始化模型...")
    
    model = PCMFModel(
        config=model_config,
        num_users=1000,
        num_items=len(train_dataset.items)
    )
    
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    
    print(f"总参数量: {total_params:,}")
    print(f"可训练参数量: {trainable_params:,}")
    
    print("\n开始训练...")
    
    trainer = Trainer(
        model=model,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        config=training_config
    )
    
    trained_model = trainer.train()
    
    print("\n导出模型...")
    
    model_path = os.path.join(training_config.output_dir, "final_model.pth")
    torch.save(trained_model.state_dict(), model_path)
    print(f"模型已保存: {model_path}")
    
    print("\n✅ 训练完成!")


if __name__ == "__main__":
    main()
