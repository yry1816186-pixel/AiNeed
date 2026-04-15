"""
Secure API Key Management for LLM Services
Provides secure storage, validation, and rotation for API keys.
"""

import os
import logging
import hashlib
import hmac
import secrets
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import wraps
import threading

logger = logging.getLogger(__name__)


@dataclass
class APIKeyConfig:
    key_name: str
    min_length: int = 32
    rotation_days: int = 90
    warn_days_before_expiry: int = 14


@dataclass
class APIKeyStatus:
    key_name: str
    is_valid: bool
    last_validated: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    rotation_due: bool = False
    masked_value: str = ""


class SecureAPIKeyManager:
    """
    Secure API Key Management
    
    Features:
    - Secure key storage (never logged in plain text)
    - Key validation
    - Rotation tracking
    - Masked logging
    """
    
    _instance: Optional['SecureAPIKeyManager'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._keys: Dict[str, str] = {}
        self._key_configs: Dict[str, APIKeyConfig] = {}
        self._key_metadata: Dict[str, Dict[str, Any]] = {}
        self._last_rotation: Dict[str, datetime] = {}
        
        self._register_default_keys()
    
    def _register_default_keys(self):
        self.register_key("GLM_API_KEY", APIKeyConfig(
            key_name="GLM_API_KEY",
            min_length=32,
            rotation_days=90
        ))
        self.register_key("OPENAI_API_KEY", APIKeyConfig(
            key_name="OPENAI_API_KEY",
            min_length=48,
            rotation_days=90
        ))
        self.register_key("ZHIPU_API_KEY", APIKeyConfig(
            key_name="ZHIPU_API_KEY",
            min_length=32,
            rotation_days=90
        ))
    
    def register_key(self, key_name: str, config: APIKeyConfig):
        self._key_configs[key_name] = config
        value = os.getenv(key_name)
        if value:
            self._keys[key_name] = value
            self._key_metadata[key_name] = {
                "loaded_at": datetime.now(),
                "hash": self._hash_key(value)
            }
            logger.info(f"API key registered: {key_name} (length: {len(value)})")
        else:
            logger.warning(f"API key not found in environment: {key_name}")
    
    def _hash_key(self, key: str) -> str:
        return hashlib.sha256(key.encode()).hexdigest()[:16]
    
    def _mask_key(self, key: str) -> str:
        if len(key) <= 8:
            return "****"
        return f"{key[:4]}...{key[-4:]}"
    
    def get_key(self, key_name: str = "GLM_API_KEY") -> str:
        if key_name not in self._keys:
            raise ValueError(f"API key not configured: {key_name}")
        
        key = self._keys[key_name]
        config = self._key_configs.get(key_name)
        
        if config and len(key) < config.min_length:
            raise ValueError(
                f"API key {key_name} is too short (min: {config.min_length}, got: {len(key)})"
            )
        
        return key
    
    def validate_key(self, key_name: str = "GLM_API_KEY") -> APIKeyStatus:
        config = self._key_configs.get(key_name)
        
        if key_name not in self._keys:
            return APIKeyStatus(
                key_name=key_name,
                is_valid=False,
                masked_value="NOT_CONFIGURED"
            )
        
        key = self._keys[key_name]
        is_valid = True
        
        if config and len(key) < config.min_length:
            is_valid = False
        
        rotation_due = False
        expires_at = None
        
        if config and key_name in self._last_rotation:
            expires_at = self._last_rotation[key_name] + timedelta(days=config.rotation_days)
            rotation_due = datetime.now() > expires_at - timedelta(days=config.warn_days_before_expiry)
        
        return APIKeyStatus(
            key_name=key_name,
            is_valid=is_valid,
            last_validated=datetime.now(),
            expires_at=expires_at,
            rotation_due=rotation_due,
            masked_value=self._mask_key(key)
        )
    
    def get_all_status(self) -> Dict[str, APIKeyStatus]:
        return {name: self.validate_key(name) for name in self._key_configs}
    
    def verify_key(self, key_name: str, provided_key: str) -> bool:
        """Verify a provided API key against the stored key using constant-time comparison.

        Uses hmac.compare_digest() to prevent timing attacks that could
        leak information about the stored key through response time differences.

        Args:
            key_name: The registered key name (e.g. "GLM_API_KEY").
            provided_key: The key value to verify.

        Returns:
            True if the provided key matches the stored key, False otherwise.
        """
        if key_name not in self._keys:
            # Compare against a dummy value to maintain constant time even
            # when the key name doesn't exist (prevents key-name enumeration)
            dummy = secrets.token_bytes(64)
            stored_bytes = dummy
            provided_bytes = provided_key.encode("utf-8") if provided_key else b""
            hmac.compare_digest(stored_bytes, provided_bytes)
            return False

        stored_key = self._keys[key_name]

        # Encode both keys to bytes for constant-time comparison
        stored_bytes = stored_key.encode("utf-8")
        provided_bytes = provided_key.encode("utf-8") if provided_key else b""

        return hmac.compare_digest(stored_bytes, provided_bytes)

    def should_rotate(self, key_name: str) -> bool:
        status = self.validate_key(key_name)
        return status.rotation_due


def secure_api_key(key_name: str = "GLM_API_KEY"):
    """
    Decorator to securely inject API key into function.
    The key is never logged or exposed in error messages.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            manager = SecureAPIKeyManager()
            
            try:
                key = manager.get_key(key_name)
                kwargs['api_key'] = key
                return await func(*args, **kwargs)
            except ValueError as e:
                logger.error(f"API key error for {key_name}: configuration issue")
                raise RuntimeError(f"API key not properly configured: {key_name}")
            except Exception as e:
                logger.error(f"Unexpected error with API key {key_name}")
                raise
        
        return wrapper
    return decorator


api_key_manager = SecureAPIKeyManager()
