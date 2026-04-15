"""
智能造型师服务 - GLM-5 驱动的个人形象定制系统
真正的大语言模型驱动，而非简单的模板匹配
"""

import os
import json
import asyncio
import time
import logging
import hashlib
import threading
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from functools import wraps
from enum import Enum
from collections import OrderedDict
import aiohttp

from .secure_api_key import SecureAPIKeyManager, api_key_manager
from .rate_limiter import rate_limiter

# Lazy import RAG to avoid circular dependencies
_fashion_rag = None

def get_fashion_rag():
    """Get Fashion RAG instance (lazy loading)"""
    global _fashion_rag
    if _fashion_rag is None:
        try:
            from .fashion_knowledge_rag import FashionKnowledgeRAG, FashionRAGConfig
            config = FashionRAGConfig(
                qdrant_host=os.getenv("QDRANT_URL", "http://localhost:6333").replace("http://", "").split(":")[0],
                qdrant_port=int(os.getenv("QDRANT_URL", "http://localhost:6333").split(":")[-1].split("/")[0])
            )
            _fashion_rag = FashionKnowledgeRAG(config)
            logger.info("Fashion RAG initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Fashion RAG: {e}")
    return _fashion_rag


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ResponseCache:
    """LRU cache for LLM responses with TTL support"""
    
    def __init__(self, max_size: int = 500, ttl_seconds: int = 1800):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, tuple] = OrderedDict()
        self._lock = threading.RLock()
        self._hits = 0
        self._misses = 0
    
    def _compute_key(self, *args, **kwargs) -> str:
        """Compute cache key from arguments"""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.sha256(key_data.encode('utf-8')).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached response if exists and not expired"""
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None
            
            value, timestamp = self._cache[key]
            
            if time.time() - timestamp > self.ttl_seconds:
                del self._cache[key]
                self._misses += 1
                return None
            
            self._cache.move_to_end(key)
            self._hits += 1
            return value
    
    def set(self, key: str, value: Any) -> None:
        """Store response in cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
            
            self._cache[key] = (value, time.time())
            
            while len(self._cache) > self.max_size:
                self._cache.popitem(last=False)
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern prefix"""
        with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
            return len(keys_to_delete)
    
    def clear(self) -> None:
        """Clear all cached entries"""
        with self._lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = self._hits / total if total > 0 else 0
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": round(hit_rate, 4),
                "ttl_seconds": self.ttl_seconds
            }


class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """Circuit breaker for LLM API calls"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        half_open_max_calls: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        self.failure_count = 0
        self.last_failure_time: Optional[float] = None
        self.state = CircuitState.CLOSED
        self.half_open_calls = 0
    
    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if self.last_failure_time and time.time() - self.last_failure_time >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
                logger.info("Circuit breaker entering HALF_OPEN state")
                return True
            return False
        if self.state == CircuitState.HALF_OPEN:
            if self.half_open_calls < self.half_open_max_calls:
                self.half_open_calls += 1
                return True
            return False
        return False
    
    def record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            logger.info("Circuit breaker recovered to CLOSED state")
    
    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning("Circuit breaker returned to OPEN state")
        elif self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(f"Circuit breaker opened after {self.failure_count} failures")


class RetryableError(Exception):
    """可重试的错误（5xx、429、网络错误、超时）"""
    pass


class NonRetryableError(Exception):
    """不可重试的错误（4xx 客户端错误、token 超限等）"""
    pass


def with_retry_and_circuit_breaker(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    circuit_breaker: Optional[CircuitBreaker] = None
):
    """Decorator for retry with exponential backoff and circuit breaker

    A-P2-1: 增强重试逻辑
    - 区分可重试错误（RetryableError）和不可重试错误（NonRetryableError）
    - 可重试错误触发指数退避重试
    - 不可重试错误立即抛出，不重试
    - 熔断器仅对可重试错误计数
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if circuit_breaker and not circuit_breaker.can_execute():
                raise NonRetryableError("Circuit breaker is OPEN - LLM service unavailable")

            last_exception = None
            for attempt in range(max_retries):
                try:
                    result = await func(*args, **kwargs)
                    if circuit_breaker:
                        circuit_breaker.record_success()
                    return result
                except NonRetryableError as e:
                    # 不可重试错误：立即抛出
                    logger.error(f"Non-retryable error, aborting: {e}")
                    raise
                except (RetryableError, Exception) as e:
                    last_exception = e
                    if circuit_breaker:
                        circuit_breaker.record_failure()

                    if attempt < max_retries - 1:
                        delay = min(base_delay * (exponential_base ** attempt), max_delay)
                        # 如果是 429 错误，尝试从异常信息中提取 Retry-After
                        retry_after = getattr(e, 'retry_after', None)
                        if retry_after and retry_after > 0:
                            delay = max(delay, min(retry_after, max_delay))
                        logger.warning(
                            f"LLM API call failed (attempt {attempt + 1}/{max_retries}): {e}. "
                            f"Retrying in {delay:.1f}s..."
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(f"LLM API call failed after {max_retries} attempts: {e}")

            raise last_exception
        return wrapper
    return decorator


@dataclass
class UserProfile:
    body_type: Optional[str] = None
    skin_tone: Optional[str] = None
    color_season: Optional[str] = None
    face_shape: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    age_range: Optional[str] = None
    gender: Optional[str] = None
    style_preferences: List[str] = field(default_factory=list)
    style_avoidances: List[str] = field(default_factory=list)
    color_preferences: List[str] = field(default_factory=list)
    budget_range: Optional[Dict[str, int]] = None
    lifestyle: List[str] = field(default_factory=list)
    occupation: Optional[str] = None
    fashion_goals: List[str] = field(default_factory=list)


@dataclass
class SceneContext:
    occasion: Optional[str] = None
    weather: Optional[str] = None
    season: Optional[str] = None
    time_of_day: Optional[str] = None
    formality_level: Optional[str] = None
    special_requirements: List[str] = field(default_factory=list)


@dataclass
class OutfitItem:
    category: str
    subcategory: Optional[str] = None
    name: str = ""
    description: str = ""
    color: str = ""
    material: Optional[str] = None
    style_tags: List[str] = field(default_factory=list)
    price_range: Optional[str] = None
    why_recommended: str = ""
    alternatives: List[str] = field(default_factory=list)


@dataclass
class OutfitPlan:
    title: str
    overall_style: str
    items: List[OutfitItem]
    styling_tips: List[str]
    color_harmony: str
    body_flattering_points: List[str]
    occasion_fit: str
    estimated_budget: str
    confidence_score: float = 0.0


class GLMStylistEngine:
    """
    P1-006修复: 增强版GLM引擎，包含准确的token计数和prompt截断机制
    """

    # GLM模型的token限制
    # GLM-4: 128K context, GLM-3-Turbo: 128K context
    # 为安全起见，使用保守的限制值
    MAX_CONTEXT_TOKENS = 128000  # 最大上下文token数
    MAX_OUTPUT_TOKENS = 4096     # 最大输出token数
    SAFETY_MARGIN = 500          # 安全边界，防止估算误差

    def __init__(self):
        self._key_manager = SecureAPIKeyManager()
        self.api_endpoint = os.getenv("GLM_API_ENDPOINT", "https://open.bigmodel.cn/api/paas/v4")
        self.model = os.getenv("GLM_MODEL", "glm-5")
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            half_open_max_calls=3
        )
        self._token_counter = 0
        self._request_counter = 0
        self._truncation_counter = 0  # 截断计数

    @property
    def api_key(self) -> str:
        return self._key_manager.get_key("GLM_API_KEY")

    def _count_tokens(self, text: str) -> int:
        """
        A-P1-7: Improved token counting with tiktoken fallback.

        Token counting strategy (in order of preference):
        1. tiktoken library (if available) - most accurate for GPT-compatible tokenizers
        2. Character-based estimation with improved accuracy for mixed CJK/Latin text

        Estimation rules for fallback:
        - CJK characters: ~1.5 tokens/char (refined from 1.8 based on empirical data)
        - Full-width punctuation/kana: ~1.2 tokens/char
        - English words: ~1.3 tokens/word (average across word lengths)
        - Punctuation and whitespace: ~0.3 tokens/char
        - Numbers: ~0.5 tokens/digit group
        """
        if not text:
            return 0

        # Strategy 1: Try tiktoken for accurate counting
        try:
            import tiktoken
            # Use cl100k_base encoding (GPT-4/GLM compatible)
            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except ImportError:
            pass
        except Exception:
            pass

        # Strategy 2: Improved character-based estimation
        token_count = 0.0
        i = 0
        while i < len(text):
            char = text[i]

            # CJK Unified Ideographs (common Chinese characters)
            if '\u4e00' <= char <= '\u9fff':
                token_count += 1.5
            # CJK Extension A and B (rare characters)
            elif '\u3400' <= char <= '\u4dbf' or '\U00020000' <= char <= '\U0002a6df':
                token_count += 1.5
            # Full-width punctuation, CJK symbols
            elif '\u3000' <= char <= '\u303f':
                token_count += 1.2
            # Hiragana and Katakana
            elif '\u3040' <= char <= '\u309f' or '\u30a0' <= char <= '\u30ff':
                token_count += 1.2
            # Hangul syllables
            elif '\uac00' <= char <= '\ud7af':
                token_count += 1.5
            # English letters and numbers - process as word groups
            elif char.isascii() and char.isalnum():
                word_start = i
                while i < len(text) and text[i].isascii() and text[i].isalnum():
                    i += 1
                word_length = i - word_start
                # English word token ratio: shorter words have higher ratio
                # 1 char ~1 token, 2 chars ~1.5, 3+ chars ~1.3/word
                if word_length <= 1:
                    token_count += 1.0
                elif word_length <= 2:
                    token_count += 1.5
                else:
                    token_count += max(1.0, word_length * 0.4)
                continue  # Skip i increment, already advanced
            # ASCII punctuation and whitespace
            elif char.isascii():
                token_count += 0.3
            # Other Unicode (emoji, etc.)
            else:
                token_count += 1.5

            i += 1

        return max(1, int(token_count))

    def _truncate_prompt(
        self,
        system_prompt: str,
        user_prompt: str,
        max_output_tokens: int = 4096
    ) -> tuple:
        """
        P1-006修复: Prompt截断逻辑

        当输入token超过限制时，智能截断用户prompt，保留系统prompt完整性。

        截断策略：
        1. 始终保留系统prompt（包含核心指令）
        2. 优先截断用户prompt的中部和尾部
        3. 保留用户prompt的开头和结尾关键信息
        4. 添加截断标记提示

        Args:
            system_prompt: 系统提示词
            user_prompt: 用户提示词
            max_output_tokens: 最大输出token数

        Returns:
            tuple: (截断后的system_prompt, 截断后的user_prompt, 是否被截断)
        """
        system_tokens = self._count_tokens(system_prompt)
        user_tokens = self._count_tokens(user_prompt)

        # 计算可用的输入token空间
        available_input_tokens = (
            self.MAX_CONTEXT_TOKENS
            - max_output_tokens
            - self.SAFETY_MARGIN
            - system_tokens
        )

        # 如果用户prompt在限制内，无需截断
        if user_tokens <= available_input_tokens:
            return system_prompt, user_prompt, False

        logger.warning(
            f"Prompt truncation required: user_tokens={user_tokens}, "
            f"available={available_input_tokens}"
        )

        # 执行截断
        self._truncation_counter += 1

        # 计算需要保留的字符比例
        target_ratio = available_input_tokens / user_tokens

        # 截断策略：保留开头60%和结尾40%的目标内容
        # 这样可以保留问题的背景和具体请求
        keep_ratio_head = 0.6 * target_ratio
        keep_ratio_tail = 0.4 * target_ratio

        truncate_point_head = int(len(user_prompt) * keep_ratio_head)
        truncate_point_tail = int(len(user_prompt) * (1 - keep_ratio_tail))

        # 在句子边界截断（寻找标点符号）
        # 向前寻找最近的句子结束点
        for offset in range(min(100, truncate_point_head)):
            idx = truncate_point_head - offset
            if idx > 0 and user_prompt[idx] in '。！？\n':
                truncate_point_head = idx + 1
                break

        # 向后寻找最近的句子开始点
        for offset in range(min(100, len(user_prompt) - truncate_point_tail)):
            idx = truncate_point_tail + offset
            if idx < len(user_prompt) and user_prompt[idx] in '。！？\n':
                truncate_point_tail = idx + 1
                break

        # 构建截断后的prompt
        truncation_marker = "\n\n[...内容已省略...]\n\n"
        truncated_user_prompt = (
            user_prompt[:truncate_point_head]
            + truncation_marker
            + user_prompt[truncate_point_tail:]
        )

        # 验证截断后的token数
        new_user_tokens = self._count_tokens(truncated_user_prompt)
        if new_user_tokens > available_input_tokens:
            # 如果仍然超限，执行更激进的截断
            # 只保留开头部分
            safe_length = int(len(user_prompt) * target_ratio * 0.8)
            truncated_user_prompt = (
                user_prompt[:safe_length]
                + "\n\n[...内容因长度限制已省略，请根据以上信息提供建议...]"
            )

        logger.info(
            f"Prompt truncated: original={user_tokens} tokens, "
            f"truncated={self._count_tokens(truncated_user_prompt)} tokens"
        )

        return system_prompt, truncated_user_prompt, True

    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for cost tracking (使用增强的计数方法)"""
        return self._count_tokens(text)

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics"""
        return {
            "total_requests": self._request_counter,
            "estimated_tokens": self._token_counter,
            "truncation_count": self._truncation_counter,
            "circuit_breaker_state": self.circuit_breaker.state.value
        }

    @with_retry_and_circuit_breaker(max_retries=3, base_delay=1.0)
    async def generate(self, system_prompt: str, user_prompt: str, max_tokens: int = 4000) -> str:
        # P1-006修复: 执行prompt截断检查
        system_prompt, user_prompt, was_truncated = self._truncate_prompt(
            system_prompt, user_prompt, max_tokens
        )

        if was_truncated:
            logger.warning("Prompt was truncated to fit within token limits")

        estimated_tokens = self._count_tokens(system_prompt) + self._count_tokens(user_prompt) + max_tokens

        if not await rate_limiter.wait_and_acquire("glm", estimated_tokens, max_wait_ms=30000):
            raise Exception("Rate limit exceeded - please try again later")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": 0.8,
            "top_p": 0.9
        }

        self._request_counter += 1
        self._token_counter += self._count_tokens(system_prompt) + self._count_tokens(user_prompt)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_endpoint}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=180)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                        self._token_counter += self._count_tokens(content)
                        return content
                    elif response.status == 429:
                        # A-P2-1: 429 为可重试错误，提取 Retry-After
                        retry_after_header = response.headers.get("Retry-After")
                        err = RetryableError("Rate limit exceeded - please try again later")
                        if retry_after_header:
                            try:
                                err.retry_after = float(retry_after_header)
                            except (ValueError, TypeError):
                                pass
                        raise err
                    elif response.status >= 500:
                        # A-P2-1: 5xx 为可重试错误
                        raise RetryableError(f"Server error: {response.status}")
                    else:
                        error_text = await response.text()
                        # P1-006修复: 处理token超限错误
                        if "token" in error_text.lower() or "length" in error_text.lower():
                            raise NonRetryableError(f"Token limit exceeded: {error_text}")
                        # A-P2-1: 其他 4xx 为不可重试错误
                        raise NonRetryableError(f"GLM API error: {response.status} - {error_text}")
        except asyncio.TimeoutError:
            # A-P2-1: 超时为可重试错误
            raise RetryableError("API request timed out after 180s")
        except aiohttp.ClientError as e:
            # A-P2-1: 网络错误为可重试错误
            raise RetryableError(f"Network error: {e}")


class ConversationMemory:
    """
    对话历史管理器
    
    功能：
    - 基于会话 ID 的对话历史存储
    - 支持 Redis 持久化（可选）
    - 自动过期清理
    - 上下文窗口管理
    """
    
    def __init__(
        self,
        max_history_turns: int = 10,
        ttl_seconds: int = 3600,
        use_redis: bool = False,
        redis_client = None
    ):
        self.max_history_turns = max_history_turns
        self.ttl_seconds = ttl_seconds
        self.use_redis = use_redis
        self.redis_client = redis_client
        self._local_cache: Dict[str, List[Dict[str, str]]] = {}
        self._lock = threading.RLock()
    
    def _get_redis_key(self, session_id: str) -> str:
        return f"stylist:conversation:{session_id}"
    
    async def get_history(self, session_id: str) -> List[Dict[str, str]]:
        """
        获取会话的对话历史
        
        Args:
            session_id: 会话 ID
            
        Returns:
            对话历史列表
        """
        if self.use_redis and self.redis_client:
            try:
                key = self._get_redis_key(session_id)
                data = await self.redis_client.get(key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.warning(f"Redis get failed for session {session_id}: {e}")
        
        with self._lock:
            return self._local_cache.get(session_id, [])
    
    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str
    ) -> List[Dict[str, str]]:
        """
        添加消息到对话历史
        
        Args:
            session_id: 会话 ID
            role: 角色 (user/assistant/system)
            content: 消息内容
            
        Returns:
            更新后的对话历史
        """
        with self._lock:
            history = self._local_cache.get(session_id, [])
            
            # 添加新消息
            history.append({
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            # 保持历史记录在限制内（保留最近 N 轮对话）
            max_messages = self.max_history_turns * 2
            if len(history) > max_messages:
                history = history[-max_messages:]
            
            self._local_cache[session_id] = history
        
        # 持久化到 Redis
        if self.use_redis and self.redis_client:
            try:
                key = self._get_redis_key(session_id)
                await self.redis_client.setex(
                    key,
                    self.ttl_seconds,
                    json.dumps(history)
                )
            except Exception as e:
                logger.warning(f"Redis set failed for session {session_id}: {e}")
        
        return history
    
    async def clear_history(self, session_id: str) -> None:
        """
        清除会话的对话历史
        
        Args:
            session_id: 会话 ID
        """
        with self._lock:
            if session_id in self._local_cache:
                del self._local_cache[session_id]
        
        if self.use_redis and self.redis_client:
            try:
                key = self._get_redis_key(session_id)
                await self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"Redis delete failed for session {session_id}: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        with self._lock:
            return {
                "active_sessions": len(self._local_cache),
                "total_messages": sum(len(h) for h in self._local_cache.values()),
                "max_history_turns": self.max_history_turns,
                "ttl_seconds": self.ttl_seconds,
                "use_redis": self.use_redis
            }


class IntelligentStylistService:
    SYSTEM_PROMPT = """你是一位世界顶级的私人形象顾问和时尚造型师，拥有以下专业能力：

## 专业背景
- 20年高端时尚行业经验，曾为众多名人和企业高管提供形象咨询服务
- 深谙色彩理论、体型分析、面部美学等专业领域
- 熟悉各大时装周趋势、当季流行元素和经典穿搭法则
- 擅长根据个人特点打造独特且适合的风格

## 核心能力
1. **个人形象深度分析**
   - 体型特征识别与优化建议
   - 肤色分析与最佳色彩推荐
   - 脸型与发型、配饰搭配
   - 个人风格定位

2. **场景化穿搭设计**
   - 根据具体场合（面试、约会、商务等）定制方案
   - 考虑天气、季节、时间等环境因素
   - 平衡正式度与个人风格表达

3. **时尚趋势整合**
   - 将当季流行元素融入日常穿搭
   - 推荐适合用户风格的潮流单品
   - 经典款与时尚款的平衡搭配

4. **个性化建议**
   - 基于用户预算提供分价位选择
   - 考虑用户生活方式和穿衣习惯
   - 提供可落地的购买和搭配建议

## 输出原则
- 建议必须具体、可操作，避免空洞的描述
- 每个推荐都要说明理由，让用户理解"为什么适合我"
- 尊重用户的个人偏好，不强推不适合的风格
- 考虑实用性，推荐的单品应该易于购买和搭配

请始终以专业、亲切、个性化的方式与用户交流，帮助他们发现最适合自己的风格。"""

    TREND_PROMPT_TEMPLATE = """基于以下用户信息，请分析并推荐最适合的穿搭方案：

## 用户档案
{user_profile}

## 场景需求
{scene_context}

## 当前时尚趋势（{current_season}）
{fashion_trends}

## 用户具体需求
{user_request}

请提供：
1. 个人形象分析（简要，不超过100字）
2. 2套完整的穿搭方案（每套包含上下装、鞋履、配饰，每个单品描述不超过30字）
3. 每套方案的搭配理由和适用场景
4. 简要的购买建议

请以JSON格式输出，结构如下（注意：内容要简洁，避免过长）：
{{
  "personal_analysis": {{
    "body_type_analysis": "体型分析（简短）",
    "color_analysis": "肤色色彩分析（简短）",
    "style_positioning": "个人风格定位（简短）",
    "key_recommendations": ["核心建议1", "核心建议2"]
  }},
  "outfit_plans": [
    {{
      "title": "方案名称",
      "overall_style": "整体风格描述",
      "items": [
        {{
          "category": "上装/下装/鞋履/配饰",
          "name": "具体单品名称",
          "description": "简短描述",
          "color": "推荐颜色",
          "why_recommended": "推荐理由（简短）",
          "price_range": "价格区间"
        }}
      ],
      "styling_tips": ["搭配技巧1"],
      "color_harmony": "色彩搭配说明",
      "occasion_fit": "适用场景",
      "estimated_budget": "预估总价"
    }}
  ],
  "shopping_guide": {{
    "priority_items": ["优先购买的单品"],
    "budget_friendly_alternatives": ["平价替代"]
  }}
}}"""

    FASHION_TRENDS_2025 = {
        "spring": {
            "colors": ["柔和紫", "薄荷绿", "奶油白", "珊瑚粉", "经典蓝"],
            "key_items": ["轻薄风衣", "针织开衫", "阔腿牛仔裤", "芭蕾舞鞋", "编织包"],
            "patterns": ["细条纹", "小碎花", "几何印花"],
            "materials": ["亚麻", "轻薄针织", "真丝混纺"],
            "styles": ["法式慵懒", "新中式", "运动休闲融合"],
            "accessories": ["珍珠项链", "丝巾", "编织草帽", "极简手表"]
        },
        "summer": {
            "colors": ["柠檬黄", "天空蓝", "纯白", "薄荷绿", "西瓜红"],
            "key_items": ["亚麻衬衫", "棉质T恤", "高腰短裤", "凉鞋", "草编包"],
            "patterns": ["热带印花", "波点", "纯色"],
            "materials": ["棉", "麻", "天丝"],
            "styles": ["度假风", "极简风", "运动风"],
            "accessories": ["墨镜", "编织腰带", "帆布包", "运动手表"]
        },
        "fall": {
            "colors": ["焦糖色", "酒红", "墨绿", "驼色", "深蓝"],
            "key_items": ["风衣", "针织毛衣", "西装外套", "高腰西裤", "切尔西靴"],
            "patterns": ["格纹", "千鸟格", "素色"],
            "materials": ["羊毛", "灯芯绒", "皮革"],
            "styles": ["复古风", "商务休闲", "街头潮流"],
            "accessories": ["围巾", "皮带", "公文包", "踝靴"]
        },
        "winter": {
            "colors": ["黑色", "深灰", "酒红", "墨绿", "奶油白"],
            "key_items": ["羊毛大衣", "羽绒服", "高领毛衣", "加绒牛仔裤", "雪地靴"],
            "patterns": ["纯色", "粗花呢", "提花"],
            "materials": ["羊毛", "羊绒", "羽绒", "皮革"],
            "styles": ["极简风", "经典优雅", "温暖舒适"],
            "accessories": ["毛线帽", "手套", "围巾", "厚底靴"]
        }
    }

    BODY_TYPE_GUIDE = {
        "rectangle": {
            "name": "H型/矩形身材",
            "characteristics": "肩、腰、臀宽度相近，曲线不明显",
            "optimize_tips": [
                "选择有腰线设计的单品，创造曲线感",
                "上身或下身选择有量感的款式增加层次",
                "高腰设计可以优化比例",
                "层叠穿搭增加视觉层次"
            ],
            "avoid": ["过于直筒的连衣裙", "没有腰线的宽松上衣"],
            "best_items": ["收腰连衣裙", "A字裙", "高腰裤", "有垫肩的外套"]
        },
        "triangle": {
            "name": "A型/梨形身材",
            "characteristics": "臀部比肩部宽，下半身较丰满",
            "optimize_tips": [
                "上身选择亮色或有设计感的款式吸引视线",
                "下装选择深色、简洁款式",
                "A字裙或阔腿裤平衡臀宽",
                "船领、一字领等扩展肩部线条"
            ],
            "avoid": ["紧身铅笔裤", "臀部有装饰的裤子", "过于修身的连衣裙"],
            "best_items": ["船领上衣", "A字裙", "阔腿裤", "深色直筒牛仔裤"]
        },
        "inverted_triangle": {
            "name": "Y型/倒三角身材",
            "characteristics": "肩部比臀部宽，上身较壮",
            "optimize_tips": [
                "下装选择有量感或亮色的款式",
                "V领、U领柔和肩部线条",
                "避免垫肩或肩部有装饰的款式",
                "A字裙或阔腿裤增加下身量感"
            ],
            "avoid": ["垫肩外套", "船领上衣", "紧身裤"],
            "best_items": ["V领上衣", "阔腿裤", "A字裙", "深色上装"]
        },
        "hourglass": {
            "name": "X型/沙漏身材",
            "characteristics": "肩臀宽度相近，腰线明显",
            "optimize_tips": [
                "选择收腰设计的单品展示曲线",
                "合身剪裁比宽松款更显身材优势",
                "腰带是很好的配饰选择",
                "避免过于宽松掩盖腰线"
            ],
            "avoid": ["直筒连衣裙", "过于宽松的上衣", "低腰裤"],
            "best_items": ["收腰连衣裙", "高腰裤", "铅笔裙", "合身衬衫"]
        },
        "oval": {
            "name": "O型/苹果身材",
            "characteristics": "腰腹较丰满，四肢相对纤细",
            "optimize_tips": [
                "V领设计拉长颈部线条",
                "选择垂感好的面料",
                "长款外套修饰腰腹",
                "展示纤细的四肢"
            ],
            "avoid": ["紧身款", "腰部有装饰的款式", "短款上衣"],
            "best_items": ["V领上衣", "长款开衫", "直筒裤", "A字连衣裙"]
        }
    }

    COLOR_SEASON_GUIDE = {
        "spring": {
            "name": "春季型",
            "characteristics": "肤色偏暖，有桃红或杏色调",
            "best_colors": ["珊瑚粉", "桃红", "杏色", "暖黄", "草绿", "浅蓝绿"],
            "avoid_colors": ["纯黑", "纯白", "冷灰", "深紫"],
            "neutrals": ["米色", "奶油白", "暖灰"]
        },
        "summer": {
            "name": "夏季型",
            "characteristics": "肤色偏冷，有粉色调",
            "best_colors": ["玫瑰粉", "薰衣草紫", "天蓝", "薄荷绿", "灰粉"],
            "avoid_colors": ["橙色", "金黄", "暖棕"],
            "neutrals": ["冷灰", "银灰", "白色"]
        },
        "autumn": {
            "name": "秋季型",
            "characteristics": "肤色偏暖，有金色调",
            "best_colors": ["焦糖色", "酒红", "墨绿", "棕色", "橙色", "芥末黄"],
            "avoid_colors": ["荧光色", "冷粉", "纯白"],
            "neutrals": ["驼色", "米色", "深棕"]
        },
        "winter": {
            "name": "冬季型",
            "characteristics": "肤色偏冷，对比度高",
            "best_colors": ["正红", "宝蓝", "纯白", "黑色", "玫红", "翠绿"],
            "avoid_colors": ["暖橙", "土黄", "暖棕"],
            "neutrals": ["黑色", "白色", "深灰"]
        }
    }

    OCCASION_GUIDE = {
        "interview": {
            "name": "面试",
            "formality": "high",
            "keywords": ["专业", "得体", "自信", "稳重"],
            "style_hints": ["商务正装", "轻正式", "简约大方"],
            "color_palette": ["深蓝", "灰色", "黑色", "白色", "米色"],
            "avoid": ["过于时尚", "暴露", "休闲", "夸张配饰"]
        },
        "work": {
            "name": "通勤/上班",
            "formality": "medium_high",
            "keywords": ["专业", "舒适", "得体", "效率"],
            "style_hints": ["商务休闲", "轻正式", "极简风"],
            "color_palette": ["深蓝", "灰色", "米色", "白色", "驼色"],
            "avoid": ["过于休闲", "过于正式", "不便活动"]
        },
        "date": {
            "name": "约会",
            "formality": "medium",
            "keywords": ["魅力", "自信", "精致", "舒适"],
            "style_hints": ["法式慵懒", "韩系", "浪漫风"],
            "color_palette": ["粉色", "酒红", "米色", "浅蓝", "白色"],
            "avoid": ["过于正式", "邋遢", "不舒适"]
        },
        "travel": {
            "name": "出游/旅行",
            "formality": "low",
            "keywords": ["舒适", "方便", "上镜", "实用"],
            "style_hints": ["休闲风", "运动风", "度假风"],
            "color_palette": ["白色", "蓝色", "卡其", "绿色", "黄色"],
            "avoid": ["不便活动", "易皱", "难打理"]
        },
        "party": {
            "name": "聚会/派对",
            "formality": "medium",
            "keywords": ["时尚", "精致", "有记忆点", "社交"],
            "style_hints": ["街头潮流", "复古风", "时髦风"],
            "color_palette": ["黑色", "金色", "银色", "红色", "亮片"],
            "avoid": ["过于保守", "不修边幅"]
        },
        "daily": {
            "name": "日常",
            "formality": "low",
            "keywords": ["舒适", "百搭", "实用", "自在"],
            "style_hints": ["休闲风", "极简风", "韩系"],
            "color_palette": ["白色", "黑色", "灰色", "蓝色", "米色"],
            "avoid": ["过于正式", "不便活动"]
        },
        "campus": {
            "name": "校园",
            "formality": "low",
            "keywords": ["年轻", "活力", "舒适", "学生气"],
            "style_hints": ["韩系", "日系", "学院风"],
            "color_palette": ["白色", "蓝色", "灰色", "卡其", "粉色"],
            "avoid": ["过于正式", "过于成熟"]
        }
    }

    def __init__(self, use_redis: bool = False, redis_client = None):
        self.engine = GLMStylistEngine()
        self.current_season = self._get_current_season()
        self._response_cache = ResponseCache(max_size=500, ttl_seconds=1800)
        self._conversation_memory = ConversationMemory(
            max_history_turns=10,
            ttl_seconds=3600,
            use_redis=use_redis,
            redis_client=redis_client
        )
        # P1-7: Degradation strategy - cache last successful results for fallback
        self._last_successful_recommendations: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._degradation_lock = threading.Lock()
        self._max_fallback_cache = 50
        # P1-7: Default timeout for GLM API calls (30 seconds)
        self._api_timeout_seconds = 30
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get response cache statistics"""
        return self._response_cache.get_stats()
    
    def get_conversation_stats(self) -> Dict[str, Any]:
        """Get conversation memory statistics"""
        return self._conversation_memory.get_stats()
    
    def clear_cache(self) -> None:
        """Clear the response cache"""
        self._response_cache.clear()
    
    async def get_conversation_history(self, session_id: str) -> List[Dict[str, str]]:
        """
        获取会话的对话历史
        
        Args:
            session_id: 会话 ID
            
        Returns:
            对话历史列表
        """
        return await self._conversation_memory.get_history(session_id)
    
    async def add_to_conversation(
        self,
        session_id: str,
        role: str,
        content: str
    ) -> List[Dict[str, str]]:
        """
        添加消息到对话历史
        
        Args:
            session_id: 会话 ID
            role: 角色 (user/assistant)
            content: 消息内容
            
        Returns:
            更新后的对话历史
        """
        return await self._conversation_memory.add_message(session_id, role, content)
    
    async def clear_conversation(self, session_id: str) -> None:
        """
        清除会话的对话历史
        
        Args:
            session_id: 会话 ID
        """
        await self._conversation_memory.clear_history(session_id)
    
    def _compute_cache_key(self, prefix: str, *args, **kwargs) -> str:
        """Compute cache key for method calls"""
        key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        key_hash = hashlib.sha256(key_data.encode('utf-8')).hexdigest()
        return f"{prefix}:{key_hash}"

    def _get_current_season(self) -> str:
        month = datetime.now().month
        if month in [3, 4, 5]:
            return "spring"
        elif month in [6, 7, 8]:
            return "summer"
        elif month in [9, 10, 11]:
            return "fall"
        else:
            return "winter"

    def _format_user_profile(self, profile: UserProfile) -> str:
        parts = []
        
        if profile.body_type:
            guide = self.BODY_TYPE_GUIDE.get(profile.body_type, {})
            parts.append(f"体型：{guide.get('name', profile.body_type)}")
            if guide.get('characteristics'):
                parts.append(f"特征：{guide['characteristics']}")
        
        if profile.skin_tone:
            parts.append(f"肤色：{profile.skin_tone}")
        
        if profile.color_season:
            guide = self.COLOR_SEASON_GUIDE.get(profile.color_season, {})
            parts.append(f"色彩季型：{guide.get('name', profile.color_season)}")
            if guide.get('best_colors'):
                parts.append(f"最佳色彩：{', '.join(guide['best_colors'][:5])}")
        
        if profile.height and profile.weight:
            bmi = profile.weight / ((profile.height / 100) ** 2)
            parts.append(f"身高：{profile.height}cm，体重：{profile.weight}kg")
        
        if profile.style_preferences:
            parts.append(f"偏好风格：{', '.join(profile.style_preferences)}")
        
        if profile.style_avoidances:
            parts.append(f"避免风格：{', '.join(profile.style_avoidances)}")
        
        if profile.budget_range:
            parts.append(f"预算范围：{profile.budget_range.get('min', 0)}-{profile.budget_range.get('max', '不限')}元")
        
        if profile.lifestyle:
            parts.append(f"生活方式：{', '.join(profile.lifestyle)}")
        
        if profile.occupation:
            parts.append(f"职业：{profile.occupation}")
        
        if profile.fashion_goals:
            parts.append(f"穿搭目标：{', '.join(profile.fashion_goals)}")
        
        return "\n".join(parts)

    def _format_scene_context(self, context: SceneContext) -> str:
        parts = []
        
        if context.occasion:
            guide = self.OCCASION_GUIDE.get(context.occasion, {})
            parts.append(f"场合：{guide.get('name', context.occasion)}")
            if guide.get('keywords'):
                parts.append(f"关键词：{', '.join(guide['keywords'])}")
            if guide.get('style_hints'):
                parts.append(f"推荐风格：{', '.join(guide['style_hints'])}")
        
        if context.weather:
            parts.append(f"天气：{context.weather}")
        
        if context.season:
            parts.append(f"季节：{context.season}")
        else:
            parts.append(f"季节：{self.current_season}")
        
        if context.formality_level:
            parts.append(f"正式程度：{context.formality_level}")
        
        if context.special_requirements:
            parts.append(f"特殊需求：{', '.join(context.special_requirements)}")
        
        return "\n".join(parts)

    def _format_fashion_trends(self) -> str:
        trends = self.FASHION_TRENDS_2025.get(self.current_season, {})
        parts = [f"【{self.current_season.upper()} 季时尚趋势】\n"]
        
        if trends.get('colors'):
            parts.append(f"流行色彩：{', '.join(trends['colors'])}")
        
        if trends.get('key_items'):
            parts.append(f"必备单品：{', '.join(trends['key_items'])}")
        
        if trends.get('styles'):
            parts.append(f"流行风格：{', '.join(trends['styles'])}")
        
        if trends.get('materials'):
            parts.append(f"热门材质：{', '.join(trends['materials'])}")
        
        if trends.get('accessories'):
            parts.append(f"配饰趋势：{', '.join(trends['accessories'])}")
        
        return "\n".join(parts)

    async def generate_outfit_recommendation(
        self,
        user_profile: UserProfile,
        scene_context: SceneContext,
        user_request: str = ""
    ) -> Dict[str, Any]:
        """
        生成穿搭推荐（支持 RAG 增强）
        
        Args:
            user_profile: 用户档案
            scene_context: 场景上下文
            user_request: 用户请求
            
        Returns:
            穿搭推荐结果
        """
        # 尝试使用 RAG 增强上下文
        rag_context = await self._get_rag_context(user_profile, scene_context, user_request)
        
        cache_key = self._compute_cache_key(
            "outfit",
            body_type=user_profile.body_type,
            skin_tone=user_profile.skin_tone,
            color_season=user_profile.color_season,
            style_prefs=tuple(sorted(user_profile.style_preferences)),
            occasion=scene_context.occasion,
            season=scene_context.season or self.current_season,
            request=user_request
        )
        
        cached = self._response_cache.get(cache_key)
        if cached is not None:
            logger.info("Returning cached outfit recommendation")
            return cached
        
        profile_str = self._format_user_profile(user_profile)
        context_str = self._format_scene_context(scene_context)
        trends_str = self._format_fashion_trends()
        
        # 如果有 RAG 上下文，添加到 prompt 中
        rag_str = ""
        if rag_context:
            rag_str = f"\n## 专业知识库参考\n{rag_context}\n"
        
        user_prompt = self.TREND_PROMPT_TEMPLATE.format(
            user_profile=profile_str,
            scene_context=context_str,
            current_season=self.current_season,
            fashion_trends=trends_str,
            user_request=user_request or "请根据我的情况提供最适合的穿搭建议"
        )
        
        # 添加 RAG 上下文
        if rag_str:
            user_prompt = user_prompt.replace(
                "## 用户具体需求",
                f"{rag_str}\n## 用户具体需求"
            )
        
        response = await self._call_glm_with_degradation(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=user_prompt,
            user_profile=user_profile,
            scene_context=scene_context,
            max_tokens=4000
        )
        
        cleaned_response = response
        if "```json" in cleaned_response:
            cleaned_response = cleaned_response.split("```json")[-1]
        if "```" in cleaned_response:
            cleaned_response = cleaned_response.split("```")[0]
        
        try:
            json_start = cleaned_response.find("{")
            json_end = cleaned_response.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                json_str = cleaned_response[json_start:json_end]
                result = json.loads(json_str)
                self._response_cache.set(cache_key, result)
                # P1-7: Store successful result for degradation fallback
                self._store_fallback_result(user_profile, scene_context, result)
                return result
        except json.JSONDecodeError:
            pass
        
        result = {
            "raw_response": response,
            "personal_analysis": {
                "summary": "基于AI分析的个人形象建议"
            },
            "outfit_plans": [],
            "error": "Failed to parse JSON response"
        }
        self._response_cache.set(cache_key, result)
        return result

    # ============================================================
    # P1-7: Degradation Strategy Methods
    # ============================================================

    def _store_fallback_result(
        self,
        user_profile: UserProfile,
        scene_context: SceneContext,
        result: Dict[str, Any],
    ) -> None:
        """P1-7: Store a successful recommendation result for degradation fallback.

        When GLM API is unavailable, we can return the most recent successful
        recommendation for similar user profiles/occasions.
        """
        with self._degradation_lock:
            # Create a fallback key from profile + occasion
            fallback_key = f"{user_profile.body_type or 'unknown'}:{user_profile.color_season or 'unknown'}:{scene_context.occasion or 'daily'}"
            self._last_successful_recommendations[fallback_key] = {
                "result": result,
                "stored_at": time.time(),
                "profile_summary": {
                    "body_type": user_profile.body_type,
                    "color_season": user_profile.color_season,
                    "occasion": scene_context.occasion,
                },
            }
            # Evict oldest entries if cache is full
            while len(self._last_successful_recommendations) > self._max_fallback_cache:
                self._last_successful_recommendations.popitem(last=False)

    def _get_fallback_result(
        self,
        user_profile: UserProfile,
        scene_context: SceneContext,
    ) -> Optional[Dict[str, Any]]:
        """P1-7: Retrieve a cached fallback result when GLM API is unavailable.

        Returns the most recent successful recommendation for a similar
        profile/occasion, or None if no suitable fallback exists.
        """
        with self._degradation_lock:
            fallback_key = f"{user_profile.body_type or 'unknown'}:{user_profile.color_season or 'unknown'}:{scene_context.occasion or 'daily'}"

            # Exact match first
            if fallback_key in self._last_successful_recommendations:
                cached = self._last_successful_recommendations[fallback_key]
                result = cached["result"].copy()
                result["_degraded"] = True
                result["_degradation_reason"] = "GLM API unavailable, returning cached recommendation"
                logger.info("Returning degraded fallback result for key: %s", fallback_key)
                return result

            # Partial match: same body_type + occasion
            partial_key = f"{user_profile.body_type or 'unknown'}:*:{scene_context.occasion or 'daily'}"
            for key, cached in reversed(self._last_successful_recommendations.items()):
                parts = key.split(":")
                if len(parts) == 3 and parts[0] == (user_profile.body_type or "unknown") and parts[2] == (scene_context.occasion or "daily"):
                    result = cached["result"].copy()
                    result["_degraded"] = True
                    result["_degradation_reason"] = "GLM API unavailable, returning similar profile cached recommendation"
                    logger.info("Returning partial-match fallback result for key: %s", key)
                    return result

            # Any match for the occasion
            for key, cached in reversed(self._last_successful_recommendations.items()):
                parts = key.split(":")
                if len(parts) == 3 and parts[2] == (scene_context.occasion or "daily"):
                    result = cached["result"].copy()
                    result["_degraded"] = True
                    result["_degradation_reason"] = "GLM API unavailable, returning occasion-based cached recommendation"
                    logger.info("Returning occasion-match fallback result for key: %s", key)
                    return result

            return None

    async def _call_glm_with_degradation(
        self,
        system_prompt: str,
        user_prompt: str,
        user_profile: UserProfile,
        scene_context: SceneContext,
        max_tokens: int = 4000,
    ) -> str:
        """P1-7: Call GLM API with timeout and degradation fallback.

        - Sets a 30-second timeout for the API call
        - On failure/timeout, returns a cached fallback result if available
        - Raises the original exception if no fallback is available
        """
        try:
            return await asyncio.wait_for(
                self.engine.generate(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_tokens=max_tokens,
                ),
                timeout=self._api_timeout_seconds,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "GLM API call timed out after %ds, attempting degradation fallback",
                self._api_timeout_seconds,
            )
            fallback = self._get_fallback_result(user_profile, scene_context)
            if fallback is not None:
                return json.dumps(fallback, ensure_ascii=False)
            raise Exception(
                f"GLM API timed out after {self._api_timeout_seconds}s and no fallback available"
            )
        except Exception as e:
            logger.warning("GLM API call failed: %s, attempting degradation fallback", str(e))
            fallback = self._get_fallback_result(user_profile, scene_context)
            if fallback is not None:
                return json.dumps(fallback, ensure_ascii=False)
            raise

    async def _get_rag_context(
        self,
        user_profile: UserProfile,
        scene_context: SceneContext,
        user_request: str = ""
    ) -> Optional[str]:
        """
        从 RAG 系统获取专业知识上下文
        
        Args:
            user_profile: 用户档案
            scene_context: 场景上下文
            user_request: 用户请求
            
        Returns:
            RAG 检索到的上下文，如果不可用则返回 None
        """
        try:
            rag = get_fashion_rag()
            if rag is None:
                return None
            
            # 构建查询
            context = rag.get_context_for_stylist(
                body_type=user_profile.body_type,
                color_season=user_profile.color_season,
                occasion=scene_context.occasion,
                preferred_styles=user_profile.style_preferences,
                query=user_request
            )
            
            if context:
                logger.info(f"RAG context retrieved: {len(context)} chars")
                return context
            
        except Exception as e:
            logger.warning(f"RAG context retrieval failed: {e}")
        
        return None

    async def analyze_body_type(self, description: str) -> Dict[str, Any]:
        analyze_prompt = f"""作为专业形象顾问，请分析以下用户描述，判断其体型类型并提供专业建议：

用户描述：
{description}

请分析：
1. 最可能的体型类型（rectangle/triangle/inverted_triangle/hourglass/oval）
2. 体型特征分析
3. 穿搭优化建议
4. 推荐和不推荐的单品类型

请以JSON格式输出：
{{
  "body_type": "体型代码",
  "confidence": 0.0-1.0的置信度,
  "analysis": "详细分析",
  "optimize_tips": ["建议1", "建议2"],
  "recommended_items": ["推荐单品"],
  "avoid_items": ["避免单品"]
}}"""
        
        response = await self.engine.generate(
            system_prompt=self.SYSTEM_PROMPT,
            user_prompt=analyze_prompt,
            max_tokens=1500
        )
        
        cleaned_response = response
        if "```json" in cleaned_response:
            cleaned_response = cleaned_response.split("```json")[-1]
        if "```" in cleaned_response:
            cleaned_response = cleaned_response.split("```")[0]
        
        try:
            json_start = cleaned_response.find("{")
            json_end = cleaned_response.rfind("}") + 1
            return json.loads(cleaned_response[json_start:json_end])
        except json.JSONDecodeError as e:
            logger.warning(f"JSON解析失败: {e}, 返回默认响应")
            return {"body_type": "unknown", "analysis": response}
        except Exception as e:
            logger.error(f"体型分析响应解析失败: {e}", exc_info=True)
            return {"body_type": "unknown", "analysis": response}

    async def chat_interaction(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        user_profile: Optional[UserProfile] = None
    ) -> str:
        """
        多轮对话交互接口
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            user_profile: 用户档案（可选）
            
        Returns:
            AI 助手回复
        """
        context_parts = []
        
        if user_profile:
            context_parts.append(f"【用户档案】\n{self._format_user_profile(user_profile)}")
        
        context_str = "\n".join(context_parts) if context_parts else "用户档案暂未完善"
        
        messages = [
            {"role": "system", "content": f"{self.SYSTEM_PROMPT}\n\n【当前对话上下文】\n{context_str}"}
        ]
        
        # 保留最近10轮对话（20条消息）
        for msg in conversation_history[-20:]:
            messages.append(msg)
        
        messages.append({"role": "user", "content": user_message})
        
        # 使用带重试和熔断的调用
        return await self._call_llm_with_resilience(messages, max_tokens=2000)
    
    @with_retry_and_circuit_breaker(max_retries=3, base_delay=1.0)
    async def _call_llm_with_resilience(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 2000
    ) -> str:
        """
        带熔断和重试机制的 LLM 调用
        
        Args:
            messages: 对话消息列表
            max_tokens: 最大输出 token 数
            
        Returns:
            LLM 响应内容
        """
        # 估算 token 数量
        total_tokens = sum(self.engine._count_tokens(m.get("content", "")) for m in messages) + max_tokens
        
        # 使用 rate_limiter 控制请求频率
        if not await rate_limiter.wait_and_acquire("glm", total_tokens, max_wait_ms=30000):
            raise Exception("Rate limit exceeded - please try again later")
        
        # 检查熔断器状态
        if not self.engine.circuit_breaker.can_execute():
            raise Exception("Circuit breaker is OPEN - LLM service unavailable")
        
        headers = {
            "Authorization": f"Bearer {self.engine.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.engine.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.8,
            "top_p": 0.9
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.engine.api_endpoint}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                        self.engine.circuit_breaker.record_success()
                        return content
                    elif response.status == 429:
                        self.engine.circuit_breaker.record_failure()
                        # A-P2-1: 429 为可重试错误
                        err = RetryableError("Rate limit exceeded - please try again later")
                        retry_after_header = response.headers.get("Retry-After")
                        if retry_after_header:
                            try:
                                err.retry_after = float(retry_after_header)
                            except (ValueError, TypeError):
                                pass
                        raise err
                    elif response.status >= 500:
                        self.engine.circuit_breaker.record_failure()
                        # A-P2-1: 5xx 为可重试错误
                        raise RetryableError(f"Server error: {response.status}")
                    else:
                        error_text = await response.text()
                        self.engine.circuit_breaker.record_failure()
                        # A-P2-1: 其他 4xx 为不可重试错误
                        raise NonRetryableError(f"GLM API error: {response.status} - {error_text}")
        except asyncio.TimeoutError:
            self.engine.circuit_breaker.record_failure()
            # A-P2-1: 超时为可重试错误
            raise RetryableError("API request timed out after 120s")
        except aiohttp.ClientError as e:
            self.engine.circuit_breaker.record_failure()
            # A-P2-1: 网络错误为可重试错误
            raise RetryableError(f"Network error: {e}")


service_instance = IntelligentStylistService()


async def get_stylist_service() -> IntelligentStylistService:
    return service_instance
