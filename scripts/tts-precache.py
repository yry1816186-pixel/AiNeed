#!/usr/bin/env python3
"""
Edge-TTS Precache Script for Competition Demo Stability.

Per D-11: Pre-cache common voice responses to reduce real-time TTS latency.
Priority: greeting -> interview fixed phrases -> common recommendation explanations.

Usage:
    pip install edge-tts
    python scripts/tts-precache.py
    python scripts/tts-precache.py --output-dir ml/data/tts-cache
    python scripts/tts-precache.py --voice zh-CN-XiaoxiaoNeural

Output:
    ml/data/tts-cache/{key}_{voice}_{hash}.mp3
"""

import argparse
import hashlib
import os
import sys
import asyncio
from pathlib import Path
from typing import Dict

# Precache phrase list (per D-11 priority: greeting -> interview -> recommendation)
PRECACHE_PHRASES: Dict[str, str] = {
    # --- Greetings (highest priority) ---
    "greeting_1": "嘿！有什么穿搭问题都可以问我哦",
    "greeting_2": "你好呀！今天想聊什么风格？",
    "greeting_3": "早上好！今天有什么安排吗？",
    # --- Interview fixed phrases ---
    "interview_ask_company": "什么类型的公司？互联网、金融、还是外企？",
    "interview_ask_position": "什么岗位呢？",
    "interview_ask_budget": "预算大概多少？",
    "interview_confirm": "好的，我帮你搭一套 Smart Casual，互联网公司面试刚刚好",
    # --- Outfit recommendations ---
    "outfit_intro": "为你找到了几套搭配方案，看看哪个更合心意？",
    "outfit_recommend_a": "方案 A 深蓝休闲西装配白 T，利落又不会太正式",
    # --- Try-on feedback ---
    "try_on_loading": "正在为你生成试穿效果图，请稍等...",
    "try_on_ready": "效果出来了！感觉怎么样？",
    # --- Studio fallback ---
    "fallback_studio": "看来线上挑不到完全满意的？要不试试工作室定制？",
    # --- Wrap-up ---
    "wrap_up": "很高兴能帮到你！下次需要穿搭建议随时找我",
    # --- Style memory (demo highlight) ---
    "style_memory": "你说过不喜欢高领，我记住了",
}


async def generate_audio(
    text: str,
    voice: str,
    output_path: Path,
) -> bool:
    """Generate a single audio file using edge-tts.

    Returns True on success, False on failure.
    """
    try:
        import edge_tts

        communicate = edge_tts.Communicate(text, voice, rate="-10%")
        await communicate.save(str(output_path))
        return True
    except ImportError:
        print(
            "ERROR: edge-tts not installed. Run: pip install edge-tts",
            file=sys.stderr,
        )
        return False
    except Exception as exc:
        print(f"  FAILED: {exc}", file=sys.stderr)
        return False


def compute_file_key(phrase_key: str, voice: str, text: str) -> str:
    """Compute a stable filename for a cached audio file."""
    content_hash = hashlib.md5(text.encode("utf-8")).hexdigest()[:8]
    return f"{phrase_key}_{voice}_{content_hash}.mp3"


async def precache_all(
    output_dir: Path,
    voice: str,
) -> Dict[str, str]:
    """Generate all precache audio files.

    Returns a dict mapping phrase_key -> relative file path.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    results: Dict[str, str] = {}
    success_count = 0
    fail_count = 0

    print(f"Edge-TTS Precache: {len(PRECACHE_PHRASES)} phrases")
    print(f"  Voice: {voice}")
    print(f"  Output: {output_dir}")
    print()

    for key, text in PRECACHE_PHRASES.items():
        filename = compute_file_key(key, voice, text)
        filepath = output_dir / filename

        if filepath.exists():
            print(f"  SKIP (exists): {key} -> {filename}")
            results[key] = str(filepath)
            success_count += 1
            continue

        print(f"  Generating: {key} ...", end=" ", flush=True)
        ok = await generate_audio(text, voice, filepath)
        if ok:
            file_size = filepath.stat().st_size
            print(f"OK ({file_size:,} bytes) -> {filename}")
            results[key] = str(filepath)
            success_count += 1
        else:
            print("FAILED")
            fail_count += 1

    print()
    print(f"Results: {success_count} success, {fail_count} failed, {len(PRECACHE_PHRASES)} total")

    # Write manifest JSON for the backend to reference
    manifest_path = output_dir / "manifest.json"
    import json

    manifest = {
        "voice": voice,
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "phrases": {key: compute_file_key(key, voice, text) for key, text in PRECACHE_PHRASES.items()},
        "phrase_texts": PRECACHE_PHRASES,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest: {manifest_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Edge-TTS precache for competition demo")
    parser.add_argument(
        "--output-dir",
        default=os.path.join("ml", "data", "tts-cache"),
        help="Output directory for cached audio files (default: ml/data/tts-cache)",
    )
    parser.add_argument(
        "--voice",
        default="zh-CN-XiaoxiaoNeural",
        help="Voice to use (default: zh-CN-XiaoxiaoNeural)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    voice = args.voice

    asyncio.run(precache_all(output_dir, voice))


if __name__ == "__main__":
    main()
