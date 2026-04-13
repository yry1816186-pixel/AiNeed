from __future__ import annotations

from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    ML_SERVICE_HOST: str = "0.0.0.0"
    ML_SERVICE_PORT: int = 8001
    ML_API_KEY: str = ""

    GLM_API_KEY: str = ""
    ZHIPU_API_KEY: str = ""
    GLM_API_ENDPOINT: str = "https://open.bigmodel.cn/api/paas/v4"
    GLM_MODEL: str = "glm-5"

    DOUBAO_SEEDREAM_API_KEY: str = ""
    DOUBAO_SEEDREAM_API_URL: str = "https://visual.volcengineapi.com/v1/aigc/generate"
    DOUBAO_SEEDREAM_RESULT_URL: str = "https://visual.volcengineapi.com/v1/aigc/result"
    DOUBAO_SEEDREAM_MODEL: str = "doubao-seedream-3-0-t2i-250415"

    REDIS_URL: str = "redis://localhost:6379"
    QDRANT_URL: str = "http://localhost:6333"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8081"

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    MAX_CONCURRENT_TASKS: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
