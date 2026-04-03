"""
GPU Memory Monitoring and Management
Provides GPU memory tracking and automatic cache clearing.
"""

import os
import logging
import threading
import time
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class GPUMemoryInfo:
    total_mb: float
    used_mb: float
    free_mb: float
    utilization_percent: float
    timestamp: datetime


class GPUResourceManager:
    """
    GPU Resource Manager
    
    Features:
    - Memory monitoring
    - Automatic cache clearing
    - Memory threshold alerts
    """
    
    def __init__(
        self,
        memory_threshold_mb: float = 1000,
        check_interval_seconds: int = 30,
        auto_clear_cache: bool = True
    ):
        self.memory_threshold = memory_threshold_mb
        self.check_interval = check_interval_seconds
        self.auto_clear_cache = auto_clear_cache
        self._device = self._detect_device()
        self._monitoring = False
        self._monitor_thread: Optional[threading.Thread] = None
        self._callbacks: list[Callable[[GPUMemoryInfo], None]] = []
        self._last_info: Optional[GPUMemoryInfo] = None
    
    def _detect_device(self) -> str:
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except ImportError:
            pass
        return "cpu"
    
    def get_memory_info(self) -> Optional[GPUMemoryInfo]:
        if self._device != "cuda":
            return GPUMemoryInfo(
                total_mb=0,
                used_mb=0,
                free_mb=0,
                utilization_percent=0,
                timestamp=datetime.now()
            )
        
        try:
            import torch
            
            total = torch.cuda.get_device_properties(0).total_memory / (1024 ** 2)
            used = torch.cuda.memory_allocated(0) / (1024 ** 2)
            reserved = torch.cuda.memory_reserved(0) / (1024 ** 2)
            free = total - reserved
            
            info = GPUMemoryInfo(
                total_mb=total,
                used_mb=used,
                free_mb=free,
                utilization_percent=(used / total) * 100 if total > 0 else 0,
                timestamp=datetime.now()
            )
            
            self._last_info = info
            return info
            
        except Exception as e:
            logger.error(f"Failed to get GPU memory info: {e}")
            return None
    
    def check_and_clear_cache(self) -> bool:
        info = self.get_memory_info()
        
        if info and info.free_mb < self.memory_threshold:
            logger.warning(
                f"GPU memory low: {info.free_mb:.0f}MB free "
                f"(threshold: {self.memory_threshold}MB), clearing cache"
            )
            
            if self.auto_clear_cache:
                self.clear_cache()
                return True
        
        return False
    
    def clear_cache(self):
        if self._device == "cuda":
            try:
                import torch
                torch.cuda.empty_cache()
                logger.info("GPU cache cleared")
            except Exception as e:
                logger.error(f"Failed to clear GPU cache: {e}")
    
    def add_callback(self, callback: Callable[[GPUMemoryInfo], None]):
        self._callbacks.append(callback)
    
    def _monitor_loop(self):
        while self._monitoring:
            try:
                info = self.get_memory_info()
                
                if info:
                    for callback in self._callbacks:
                        try:
                            callback(info)
                        except Exception as e:
                            logger.error(f"Callback error: {e}")
                    
                    self.check_and_clear_cache()
                
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
            
            time.sleep(self.check_interval)
    
    def start_monitoring(self):
        if self._monitoring:
            return
        
        self._monitoring = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info(f"GPU monitoring started (interval: {self.check_interval}s)")
    
    def stop_monitoring(self):
        self._monitoring = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
        logger.info("GPU monitoring stopped")
    
    def get_stats(self) -> Dict[str, Any]:
        info = self.get_memory_info()
        
        return {
            "device": self._device,
            "monitoring": self._monitoring,
            "memory_threshold_mb": self.memory_threshold,
            "current_memory": {
                "total_mb": info.total_mb if info else 0,
                "used_mb": info.used_mb if info else 0,
                "free_mb": info.free_mb if info else 0,
                "utilization_percent": info.utilization_percent if info else 0
            } if info else None
        }


gpu_manager = GPUResourceManager()
