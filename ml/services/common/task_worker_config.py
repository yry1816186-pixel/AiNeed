"""
Task Worker Configuration

Configuration settings for the AI task worker service.
"""

import os
from dataclasses import dataclass


@dataclass
class WorkerConfig:
    """Configuration for task worker."""

    # Redis settings
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # Queue settings
    queues: list = None  # Will be set based on worker type

    # Concurrency settings
    max_concurrent_tasks: int = int(os.getenv("MAX_CONCURRENT_TASKS", "3"))

    # Timeout settings (in seconds)
    default_timeout: int = 300
    style_analysis_timeout: int = 60
    virtual_tryon_timeout: int = 180
    wardrobe_match_timeout: int = 30

    # Retry settings
    max_retries: int = 3
    retry_delay: float = 1.0

    # Logging settings
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    def __post_init__(self):
        if self.queues is None:
            self.queues = ["ai_tasks"]


@dataclass
class QueueConfig:
    """Configuration for specific queues."""

    name: str
    timeout: int
    priority: int = 0
    enabled: bool = True


# Queue configurations
QUEUE_CONFIGS = {
    "style_analysis": QueueConfig(
        name="style_analysis",
        timeout=60,
        priority=2,
    ),
    "virtual_tryon": QueueConfig(
        name="virtual_tryon",
        timeout=180,
        priority=3,  # Highest priority
    ),
    "wardrobe_match": QueueConfig(
        name="wardrobe_match",
        timeout=30,
        priority=1,
    ),
    "ai_tasks": QueueConfig(
        name="ai_tasks",
        timeout=60,
        priority=0,
    ),
}


def get_config() -> WorkerConfig:
    """Get worker configuration."""
    return WorkerConfig()
