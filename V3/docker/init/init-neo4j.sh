#!/bin/bash
set -e

NEO4J_URL="bolt://localhost:7687"
NEO4J_USER="neo4j"
NEO4J_PASSWORD="aineed_neo4j_2026"

echo "=== Neo4j 初始化 ==="

until cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" "RETURN 1" > /dev/null 2>&1; do
  echo "等待 Neo4j 启动..."
  sleep 5
done

echo "Neo4j 已就绪"

echo "创建唯一性约束..."
cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT color_id IF NOT EXISTS FOR (c:Color) REQUIRE c.id IS UNIQUE" 2>/dev/null && echo "  Color.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT style_id IF NOT EXISTS FOR (s:Style) REQUIRE s.id IS UNIQUE" 2>/dev/null && echo "  Style.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT occasion_id IF NOT EXISTS FOR (o:Occasion) REQUIRE o.id IS UNIQUE" 2>/dev/null && echo "  Occasion.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT bodytype_id IF NOT EXISTS FOR (b:BodyType) REQUIRE b.id IS UNIQUE" 2>/dev/null && echo "  BodyType.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT season_id IF NOT EXISTS FOR (s:Season) REQUIRE s.id IS UNIQUE" 2>/dev/null && echo "  Season.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT fabric_id IF NOT EXISTS FOR (f:Fabric) REQUIRE f.id IS UNIQUE" 2>/dev/null && echo "  Fabric.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT trend_id IF NOT EXISTS FOR (t:Trend) REQUIRE t.id IS UNIQUE" 2>/dev/null && echo "  Trend.id 约束" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE CONSTRAINT clothing_id IF NOT EXISTS FOR (c:Clothing) REQUIRE c.id IS UNIQUE" 2>/dev/null && echo "  Clothing.id 约束" || true

echo "创建索引..."
cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE INDEX color_category_idx IF NOT EXISTS FOR (c:Color) ON (c.category)" 2>/dev/null && echo "  Color.category 索引" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE INDEX clothing_category_idx IF NOT EXISTS FOR (c:Clothing) ON (c.category)" 2>/dev/null && echo "  Clothing.category 索引" || true

cypher-shell -a "${NEO4J_URL}" -u "${NEO4J_USER}" -p "${NEO4J_PASSWORD}" \
  "CREATE INDEX trend_keywords_idx IF NOT EXISTS FOR (t:Trend) ON (t.keywords)" 2>/dev/null && echo "  Trend.keywords 索引" || true

echo "=== Neo4j 初始化完成 ==="
