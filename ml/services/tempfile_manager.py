"""
Secure Temporary File Management
Provides automatic cleanup and tracking of temporary files.
"""

import os
import tempfile
import logging
import atexit
import threading
import time
from typing import Optional, Set, List
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime, timedelta
from contextlib import contextmanager

logger = logging.getLogger(__name__)


@dataclass
class TempFileInfo:
    path: str
    created_at: datetime
    size_bytes: int
    purpose: str


class TempFileManager:
    """
    Secure Temporary File Manager
    
    Features:
    - Automatic cleanup on exit
    - Tracking of all temp files
    - Periodic cleanup of old files
    - Context manager for safe file handling
    """
    
    _instance: Optional['TempFileManager'] = None
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
        self._temp_files: Set[str] = set()
        self._file_info: dict[str, TempFileInfo] = {}
        self._temp_dir = Path(tempfile.gettempdir()) / "xuno_temp"
        self._temp_dir.mkdir(exist_ok=True)
        self._cleanup_interval = 300
        self._max_age_hours = 24
        self._cleanup_thread: Optional[threading.Thread] = None
        self._cleanup_running = False
        
        atexit.register(self.cleanup_all)
        
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self):
        self._cleanup_running = True
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()
    
    def _cleanup_loop(self):
        while self._cleanup_running:
            try:
                self.cleanup_expired()
            except Exception as e:
                logger.error(f"Cleanup loop error: {e}")
            
            time.sleep(self._cleanup_interval)
    
    def create_temp_file(
        self,
        suffix: str = "",
        prefix: str = "xuno_",
        purpose: str = "general"
    ) -> str:
        """
        Create a tracked temporary file.
        
        Args:
            suffix: File suffix/extension
            prefix: File prefix
            purpose: Purpose description for tracking
            
        Returns:
            Path to the temporary file
        """
        fd, path = tempfile.mkstemp(suffix=suffix, prefix=prefix, dir=str(self._temp_dir))
        os.close(fd)
        
        self._temp_files.add(path)
        self._file_info[path] = TempFileInfo(
            path=path,
            created_at=datetime.now(),
            size_bytes=0,
            purpose=purpose
        )
        
        logger.debug(f"Created temp file: {path} (purpose: {purpose})")
        return path
    
    def write_temp_file(
        self,
        content: bytes,
        suffix: str = "",
        prefix: str = "xuno_",
        purpose: str = "general"
    ) -> str:
        """
        Create and write to a tracked temporary file.
        
        Args:
            content: File content
            suffix: File suffix/extension
            prefix: File prefix
            purpose: Purpose description
            
        Returns:
            Path to the temporary file
        """
        path = self.create_temp_file(suffix=suffix, prefix=prefix, purpose=purpose)
        
        with open(path, 'wb') as f:
            f.write(content)
        
        size = os.path.getsize(path)
        if path in self._file_info:
            self._file_info[path].size_bytes = size
        
        return path
    
    def remove_temp_file(self, path: str) -> bool:
        """
        Remove a tracked temporary file.
        
        Args:
            path: Path to the file
            
        Returns:
            True if removed successfully
        """
        try:
            if os.path.exists(path):
                os.remove(path)
            
            self._temp_files.discard(path)
            self._file_info.pop(path, None)
            
            logger.debug(f"Removed temp file: {path}")
            return True
            
        except Exception as e:
            logger.warning(f"Failed to remove temp file {path}: {e}")
            return False
    
    def cleanup_expired(self) -> int:
        """
        Clean up expired temporary files.
        
        Returns:
            Number of files removed
        """
        removed = 0
        cutoff = datetime.now() - timedelta(hours=self._max_age_hours)
        
        paths_to_remove = [
            path for path, info in self._file_info.items()
            if info.created_at < cutoff
        ]
        
        for path in paths_to_remove:
            if self.remove_temp_file(path):
                removed += 1
        
        if removed > 0:
            logger.info(f"Cleaned up {removed} expired temp files")
        
        return removed
    
    def cleanup_all(self):
        """
        Clean up all tracked temporary files.
        Called automatically on exit.
        """
        removed = 0
        
        for path in list(self._temp_files):
            try:
                if os.path.exists(path):
                    os.remove(path)
                removed += 1
            except Exception as e:
                logger.warning(f"Failed to remove temp file {path}: {e}")
        
        self._temp_files.clear()
        self._file_info.clear()
        
        logger.info(f"Cleaned up {removed} temp files on exit")
    
    def get_stats(self) -> dict:
        """
        Get statistics about tracked temporary files.
        """
        total_size = sum(info.size_bytes for info in self._file_info.values())
        
        return {
            "tracked_files": len(self._temp_files),
            "total_size_bytes": total_size,
            "total_size_mb": total_size / (1024 * 1024),
            "temp_dir": str(self._temp_dir),
            "max_age_hours": self._max_age_hours
        }
    
    @contextmanager
    def temp_file_context(
        self,
        suffix: str = "",
        prefix: str = "xuno_",
        purpose: str = "general"
    ):
        """
        Context manager for temporary files.
        Automatically removes the file when exiting the context.
        
        Usage:
            with temp_file_manager.temp_file_context('.txt') as path:
                with open(path, 'w') as f:
                    f.write('content')
        """
        path = self.create_temp_file(suffix=suffix, prefix=prefix, purpose=purpose)
        
        try:
            yield path
        finally:
            self.remove_temp_file(path)


temp_file_manager = TempFileManager()
