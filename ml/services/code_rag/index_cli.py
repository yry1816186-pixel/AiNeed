#!/usr/bin/env python3
"""
Code RAG Indexer CLI
Run this to index your codebase into Qdrant for semantic search.

Usage:
    # Full index build
    python -m ml.services.code_rag.index_cli --project-root C:/AiNeed

    # Incremental update (only changed files)
    python -m ml.services.code_rag.index_cli --project-root C:/AiNeed --incremental

    # Check status
    python -m ml.services.code_rag.index_cli --project-root C:/AiNeed --status
"""

import argparse
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from ml.services.code_rag import CodeIndexer, CodeIndexerConfig, CodeRetriever


def main():
    parser = argparse.ArgumentParser(description="AiNeed Code RAG Indexer")
    parser.add_argument(
        "--project-root",
        type=str,
        default="C:/AiNeed",
        help="Project root directory",
    )
    parser.add_argument(
        "--qdrant-host",
        type=str,
        default="127.0.0.1",
        help="Qdrant host",
    )
    parser.add_argument(
        "--qdrant-port",
        type=int,
        default=6333,
        help="Qdrant port",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force rebuild index from scratch",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Incremental update (only changed files)",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current index status only",
    )
    parser.add_argument(
        "--test-query",
        type=str,
        default=None,
        help="Test a search query after indexing",
    )

    args = parser.parse_args()

    config = CodeIndexerConfig(
        project_root=args.project_root,
        qdrant_host=args.qdrant_host,
        qdrant_port=args.qdrant_port,
    )

    if args.status:
        retriever = CodeRetriever(
            qdrant_host=args.qdrant_host,
            qdrant_port=args.qdrant_port,
        )
        summary = retriever.get_project_summary()
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return

    indexer = CodeIndexer(config)

    if args.incremental:
        print(f"📦 Running incremental update on: {args.project_root}")
        result = indexer.incremental_update()
    else:
        print(f"🔨 Building code index for: {args.project_root}")
        print(f"   Force rebuild: {args.force}")
        result = indexer.build_index(force=args.force)

    print(json.dumps(result, indent=2, ensure_ascii=False))

    if args.test_query and result.get("status") == "success":
        print(f"\n🔍 Testing query: {args.test_query}")
        retriever = CodeRetriever(
            qdrant_host=args.qdrant_host,
            qdrant_port=args.qdrant_port,
        )
        results = retriever.search(args.test_query, top_k=5)
        print(f"Found {len(results)} results:")
        for r in results:
            print(f"\n  [{r.score:.3f}] {r.file_path}:{r.start_line}-{r.end_line} ({r.chunk_type}: {r.name})")
            preview = r.content[:200].replace("\n", " ")
            print(f"  Preview: {preview}...")


if __name__ == "__main__":
    main()
