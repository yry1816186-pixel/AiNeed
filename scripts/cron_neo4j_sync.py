"""
Neo4j Knowledge Graph Periodic Sync Script
Syncs clothing items from PostgreSQL to Neo4j knowledge graph via BullMQ cron.

Usage:
    python -m scripts.cron_neo4j_sync
    python -m scripts.cron_neo4j_sync --interval 3600
"""

import os
import sys
import asyncio
import logging
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

import aiohttp

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("Neo4jSyncCron")


NEO4J_URL = os.getenv("NEO4J_URL", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j123")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
SYNC_INTERVAL = int(os.getenv("NEO4J_SYNC_INTERVAL", "3600"))


async def sync_items_to_neo4j():
    """Fetch clothing items from backend API and sync to Neo4j."""
    try:
        from neo4j import GraphDatabase
    except ImportError:
        logger.error("neo4j-driver not installed. Run: pip install neo4j>=6.0.1")
        return False

    logger.info(f"Connecting to Neo4j at {NEO4J_URL}")
    try:
        driver = GraphDatabase.driver(
            NEO4J_URL,
            auth=(NEO4J_USER, NEO4J_PASSWORD),
        )
        driver.verify_connectivity()
    except Exception as e:
        logger.warning(f"Neo4j connection failed: {e}")
        return False

    logger.info("Fetching clothing items from backend API...")
    items = []
    try:
        async with aiohttp.ClientSession() as session:
            page = 1
            while True:
                async with session.get(
                    f"{BACKEND_URL}/api/v1/clothing",
                    params={"page": page, "limit": 100},
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        logger.error(f"API request failed: HTTP {resp.status}")
                        break
                    data = await resp.json()
                    batch = data.get("data", data.get("items", []))
                    items.extend(batch)
                    if len(batch) < 100:
                        break
                    page += 1
    except Exception as e:
        logger.error(f"Failed to fetch items: {e}")
        driver.close()
        return False

    if not items:
        logger.warning("No items to sync")
        driver.close()
        return True

    logger.info(f"Syncing {len(items)} items to Neo4j...")
    try:
        with driver.session() as session:
            session.run(
                """
                CREATE CONSTRAINT IF NOT EXISTS FOR (c:ClothingItem)
                REQUIRE c.id IS UNIQUE
                """
            )
            session.run(
                """
                CREATE CONSTRAINT IF NOT EXISTS FOR (cat:Category)
                REQUIRE cat.name IS UNIQUE
                """
            )

            for item in items:
                item_id = item.get("id", "")
                name = item.get("name", "")
                category = item.get("category", "")
                color = item.get("color", "")
                style = item.get("style", "")
                price = item.get("price", 0)

                session.run(
                    """
                    MERGE (c:ClothingItem {id: $id})
                    SET c.name = $name,
                        c.color = $color,
                        c.style = $style,
                        c.price = $price,
                        c.syncedAt = datetime()
                    WITH c
                    MERGE (cat:Category {name: $category})
                    MERGE (c)-[:BELONGS_TO]->(cat)
                    """,
                    id=item_id,
                    name=name,
                    category=category,
                    color=color,
                    style=style,
                    price=price,
                )

        logger.info(f"Successfully synced {len(items)} items to Neo4j")
    except Exception as e:
        logger.error(f"Neo4j sync failed: {e}")
        driver.close()
        return False
    finally:
        driver.close()

    return True


async def run_cron(interval: int):
    """Run sync on a fixed interval."""
    logger.info(f"Starting Neo4j sync cron (interval: {interval}s)")
    while True:
        start = datetime.now()
        success = await sync_items_to_neo4j()
        elapsed = (datetime.now() - start).total_seconds()
        status = "SUCCESS" if success else "FAILED"
        logger.info(f"Sync {status} in {elapsed:.1f}s. Next run in {interval}s.")
        await asyncio.sleep(interval)


def main():
    parser = argparse.ArgumentParser(description="Neo4j Knowledge Graph Periodic Sync")
    parser.add_argument(
        "--interval",
        type=int,
        default=SYNC_INTERVAL,
        help="Sync interval in seconds (default: 3600)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run sync once and exit",
    )
    args = parser.parse_args()

    if args.once:
        asyncio.run(sync_items_to_neo4j())
    else:
        asyncio.run(run_cron(args.interval))


if __name__ == "__main__":
    main()
