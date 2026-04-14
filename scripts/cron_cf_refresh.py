"""
Collaborative Filtering Materialized Views Periodic Refresh Script
Refreshes PostgreSQL materialized views for CF recommendations via BullMQ cron.

Views refreshed:
  - mv_user_item_matrix: User-item interaction matrix with implicit ratings
  - mv_user_similarity: User-user cosine similarity matrix
  - mv_item_cooccurrence: Item-item co-occurrence counts

Usage:
    python -m scripts.cron_cf_refresh
    python -m scripts.cron_cf_refresh --interval 7200
"""

import os
import sys
import asyncio
import logging
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("CFRefreshCron")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://xuno:postgres@127.0.0.1:5432/xuno?schema=public",
)
CF_REFRESH_INTERVAL = int(os.getenv("CF_REFRESH_INTERVAL", "7200"))


async def refresh_cf_views() -> bool:
    """Refresh all CF materialized views concurrently."""
    try:
        import asyncpg
    except ImportError:
        logger.error("asyncpg not installed. Run: pip install asyncpg")
        return False

    views = [
        ("mv_user_item_matrix", "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_item_matrix"),
        ("mv_user_similarity", "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_similarity"),
        ("mv_item_cooccurrence", "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_item_cooccurrence"),
    ]

    logger.info(f"Connecting to PostgreSQL...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        logger.error(f"PostgreSQL connection failed: {e}")
        return False

    success = True
    try:
        for view_name, refresh_sql in views:
            start = datetime.now()
            try:
                await conn.execute(refresh_sql)
                elapsed = (datetime.now() - start).total_seconds()
                logger.info(f"Refreshed {view_name} in {elapsed:.1f}s")
            except Exception as e:
                elapsed = (datetime.now() - start).total_seconds()
                logger.error(f"Failed to refresh {view_name} ({elapsed:.1f}s): {e}")
                success = False
    finally:
        await conn.close()

    return success


async def run_cron(interval: int):
    """Run CF view refresh on a fixed interval."""
    logger.info(f"Starting CF refresh cron (interval: {interval}s)")
    while True:
        start = datetime.now()
        success = await refresh_cf_views()
        elapsed = (datetime.now() - start).total_seconds()
        status = "SUCCESS" if success else "PARTIAL/FAILED"
        logger.info(f"CF refresh {status} in {elapsed:.1f}s. Next run in {interval}s.")
        await asyncio.sleep(interval)


def main():
    parser = argparse.ArgumentParser(
        description="Collaborative Filtering Materialized Views Periodic Refresh"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=CF_REFRESH_INTERVAL,
        help="Refresh interval in seconds (default: 7200)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run refresh once and exit",
    )
    args = parser.parse_args()

    if args.once:
        asyncio.run(refresh_cf_views())
    else:
        asyncio.run(run_cron(args.interval))


if __name__ == "__main__":
    main()
