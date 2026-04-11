"""
Code Chunker for RAG Indexing
Splits source code into semantically meaningful chunks

Strategies:
- function: Split by function/class definitions (best for code understanding)
- file: One chunk per file (good for file-level context)
- window: Fixed-size sliding window with overlap (fallback)
"""

import os
import re
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class ChunkStrategy(Enum):
    FUNCTION = "function"
    FILE = "file"
    WINDOW = "window"


@dataclass
class CodeChunk:
    id: str
    content: str
    file_path: str
    start_line: int
    end_line: int
    language: str
    chunk_type: str  # "function", "class", "section", "file", "window"
    name: Optional[str] = None  # function/class name
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "file_path": self.file_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "language": self.language,
            "chunk_type": self.chunk_type,
            "name": self.name,
            "metadata": self.metadata,
        }


LANGUAGE_EXTENSIONS = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".sql": "sql",
    ".prisma": "prisma",
    ".css": "css",
    ".scss": "scss",
    ".html": "html",
}

IGNORE_PATTERNS = [
    "node_modules",
    ".next",
    "dist",
    "build",
    ".git",
    "__pycache__",
    "*.pyc",
    ".venv",
    "venv",
    ".env",
    ".env.local",
    "coverage",
    ".nyc_output",
    "*.lock",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    ".DS_Store",
    "models/",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.ico",
    "*.woff",
    "*.woff2",
    "*.ttf",
    "*.eot",
]

FUNCTION_PATTERNS = {
    "typescript": [
        (r"^(export\s+)?(async\s+)?function\s+(\w+)\s*\(", "function"),
        (r"^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(\([^)]*\)|\([^)]*\)\s*:\s*\w+)\s*=>", "arrow_function"),
        (r"^(export\s+)?(default\s+)?class\s+(\w+)", "class"),
        (r"^(export\s+)?interface\s+(\w+)", "interface"),
        (r"^(export\s+)?type\s+(\w+)", "type_alias"),
        (r"^(export\s+)?enum\s+(\w+)", "enum"),
        (r"^(export\s+)?(abstract\s+)?(private|protected|public)?\s*(\w+)\s*\(", "method"),
        (r"^(?:@[\w]+\n\s*)*(get|set)\s+(\w+)\s*\(", "accessor"),
        (r"^(export\s+)?const\s+(\w+)\s*[:=]", "constant"),
        (r"^\s*@(?:Controller|Get|Post|Put|Delete|Patch|UseGuards|Injectable)\b", "decorator_section"),
    ],
    "python": [
        (r"^(def|async def)\s+(\w+)\s*\(", "function"),
        (r"^class\s+(\w+)", "class"),
        (r"^(\w+)\s*[:=]\s*(lambda)", "lambda"),
        (r"^(@[\w.]+)\b", "decorator"),
    ],
    "javascript": [
        (r"^(export\s+)?(async\s+)?function\s+(\w+)\s*\(", "function"),
        (r"^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?(\([^)]*\))\s*=>", "arrow_function"),
        (r"^(export\s+)?(default\s+)?class\s+(\w+)", "class"),
        (r"^(export\s+)?module\.exports\s*=", "module_export"),
    ],
    "prisma": [
        (r"^model\s+(\w+)\s*\{", "model"),
        (r"^enum\s+(\w+)\s*\{", "enum"),
    ],
}


def detect_language(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_EXTENSIONS.get(ext, "text")


def should_ignore(file_path: str, base_dir: str) -> bool:
    rel_path = os.path.relpath(file_path, base_dir)
    for pattern in IGNORE_PATTERNS:
        if pattern.startswith("*"):
            if rel_path.endswith(pattern[1:]):
                return True
        elif pattern.endswith("/"):
            if rel_path.startswith(pattern) or f"/{pattern}" in f"/{rel_path}":
                return True
        elif pattern in rel_path.split(os.sep):
            return True
    return False


class CodeChunker:
    """
    Splits source code into semantically meaningful chunks.

    Supports multiple strategies optimized for different use cases.
    """

    def __init__(
        self,
        strategy: ChunkStrategy = ChunkStrategy.FUNCTION,
        max_chunk_size: int = 1500,
        overlap_lines: int = 10,
        min_chunk_size: int = 20,
        include_header: bool = True,
    ):
        self.strategy = strategy
        self.max_chunk_size = max_chunk_size
        self.overlap_lines = overlap_lines
        self.min_chunk_size = min_chunk_size
        self.include_header = include_header

    def chunk_file(self, file_path: str, content: str) -> List[CodeChunk]:
        """Chunk a single file based on configured strategy."""
        if not content or not content.strip():
            return []

        language = detect_language(file_path)
        lines = content.split("\n")

        if self.strategy == ChunkStrategy.FILE:
            return self._chunk_file_level(file_path, lines, language)
        elif self.strategy == ChunkStrategy.FUNCTION:
            return self._chunk_function_level(file_path, lines, language)
        else:
            return self._chunk_window_level(file_path, lines, language)

    def _chunk_file_level(
        self, file_path: str, lines: list, language: str
    ) -> List[CodeChunk]:
        """Create one chunk per file."""
        header = self._make_header(file_path, language)
        content = header + "\n".join(lines) if self.include_header else "\n".join(lines)
        return [
            CodeChunk(
                id=f"file:{self._path_to_id(file_path)}",
                content=content,
                file_path=file_path,
                start_line=1,
                end_line=len(lines),
                language=language,
                chunk_type="file",
                name=Path(file_path).name,
                metadata={"total_lines": len(lines)},
            )
        ]

    def _chunk_function_level(
        self, file_path: str, lines: list, language: str
    ) -> List[CodeChunk]:
        """Split by function/class definitions."""
        patterns = FUNCTION_PATTERNS.get(language, FUNCTION_PATTERNS["typescript"])
        chunks = []
        current_chunk_start = 0
        current_name = None
        current_type = "section"
        brace_depth = 0
        paren_depth = 0
        in_multiline_comment = {"ts": False, "py": False}.get(language[:2], False)
        i = 0

        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            for pattern, chunk_type in patterns:
                match = re.match(pattern, stripped)
                if match:
                    if current_chunk_start < i and i - current_chunk_start >= self.min_chunk_size:
                        chunk_content = lines[current_chunk_start:i]
                        header = (
                            self._make_header(file_path, language, current_name, current_type)
                            if self.include_header
                            else ""
                        )
                        chunks.append(
                            CodeChunk(
                                id=f"fn:{self._path_to_id(file_path)}:{current_chunk_start}",
                                content=header + "\n".join(chunk_content),
                                file_path=file_path,
                                start_line=current_chunk_start + 1,
                                end_line=i,
                                language=language,
                                chunk_type=current_type,
                                name=current_name,
                                metadata={
                                    "lines_count": i - current_chunk_start,
                                },
                            )
                        )

                    groups = match.groups()
                    current_name = groups[-1] if groups else None
                    current_type = chunk_type
                    current_chunk_start = i
                    break

            brace_depth += stripped.count("{") - stripped.count("}")
            paren_depth += stripped.count("(") - stripped.count(")")
            i += 1

        remaining = lines[current_chunk_start:]
        if len(remaining) >= self.min_chunk_size:
            header = (
                self._make_header(file_path, language, current_name, current_type)
                if self.include_header
                else ""
            )
            chunks.append(
                CodeChunk(
                    id=f"fn:{self._path_to_id(file_path)}:{current_chunk_start}",
                    content=header + "\n".join(remaining),
                    file_path=file_path,
                    start_line=current_chunk_start + 1,
                    end_line=len(lines),
                    language=language,
                    chunk_type=current_type,
                    name=current_name,
                    metadata={"lines_count": len(remaining)},
                )
            )

        if not chunks:
            return self._chunk_file_level(file_path, lines, language)

        return chunks

    def _chunk_window_level(
        self, file_path: str, lines: list, language: str
    ) -> List[CodeChunk]:
        """Sliding window chunking as fallback."""
        chunks = []
        start = 0
        chunk_id = 0

        while start < len(lines):
            end = min(start + self.max_chunk_size, len(lines))
            window = lines[start:end]
            header = self._make_header(file_path, language) if self.include_header else ""
            chunks.append(
                CodeChunk(
                    id=f"win:{self._path_to_id(file_path)}:{chunk_id}",
                    content=header + "\n".join(window),
                    file_path=file_path,
                    start_line=start + 1,
                    end_line=end,
                    language=language,
                    chunk_type="window",
                    metadata={
                        "window_index": chunk_id,
                        "lines_count": end - start,
                    },
                )
            )
            chunk_id += 1
            start += self.max_chunk_size - self.overlap_lines
            if start >= len(lines):
                break

        return chunks

    def _make_header(
        self,
        file_path: str,
        language: str,
        symbol_name: Optional[str] = None,
        chunk_type: Optional[str] = None,
    ) -> str:
        parts = [f"// File: {file_path}"]
        parts.append(f"// Language: {language}")
        if symbol_name and chunk_type:
            parts.append(f"// Symbol: {symbol_name} ({chunk_type})")
        return "\n".join(parts) + "\n"

    @staticmethod
    def _path_to_id(file_path: str) -> str:
        return file_path.replace("/", "_").replace("\\", "_").replace(".", "_").replace("-", "_")

    def scan_directory(
        self,
        directory: str,
        extensions: Optional[List[str]] = None,
        exclude_dirs: Optional[List[str]] = None,
    ) -> Tuple[List[CodeChunk], dict]:
        """
        Scan a directory and chunk all matching files.

        Returns:
            Tuple of (chunks, stats)
        """
        stats = {
            "total_files_scanned": 0,
            "total_files_chunked": 0,
            "total_chunks": 0,
            "by_language": {},
            "by_chunk_type": {},
            "errors": [],
        }
        all_chunks = []
        extensions_set = set(extensions) if extensions else set(LANGUAGE_EXTENSIONS.keys())

        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in (exclude_dirs or [])]

            for filename in sorted(files):
                ext = Path(filename).suffix.lower()
                if ext not in extensions_set:
                    continue

                file_path = os.path.join(root, filename)
                if should_ignore(file_path, directory):
                    continue

                try:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        content = f.read()

                    stats["total_files_scanned"] += 1
                    chunks = self.chunk_file(file_path, content)

                    if chunks:
                        stats["total_files_chunked"] += 1
                        stats["total_chunks"] += len(chunks)
                        lang = detect_language(file_path)
                        stats["by_language"][lang] = stats["by_language"].get(lang, 0) + 1
                        for c in chunks:
                            stats["by_chunk_type"][c.chunk_type] = (
                                stats["by_chunk_type"].get(c.chunk_type, 0) + 1
                            )
                        all_chunks.extend(chunks)

                except Exception as e:
                    stats["errors"].append({"file": file_path, "error": str(e)})
                    logger.warning(f"Failed to chunk {file_path}: {e}")

        logger.info(
            f"Chunking complete: {stats['total_files_chunked']}/{stats['total_files_scanned']} files, "
            f"{stats['total_chunks']} chunks"
        )
        return all_chunks, stats
