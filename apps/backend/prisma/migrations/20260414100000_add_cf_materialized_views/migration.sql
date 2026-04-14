-- Collaborative Filtering Materialized Views
-- Refresh periodically via BullMQ cron job

-- User-Item interaction matrix with implicit ratings
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_item_matrix AS
SELECT
  ub."userId",
  ub."itemId",
  SUM(CASE ub."type"
    WHEN 'view' THEN 1
    WHEN 'click' THEN 2
    WHEN 'like' THEN 3
    WHEN 'favorite' THEN 4
    WHEN 'addToCart' THEN 5
    WHEN 'purchase' THEN 8
    WHEN 'tryOn' THEN 6
    WHEN 'share' THEN 4
    WHEN 'dislike' THEN -2
    ELSE 1
  END) AS implicit_rating
FROM "UserBehavior" ub
WHERE ub."itemId" IS NOT NULL
GROUP BY ub."userId", ub."itemId";

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_uim_user_item ON mv_user_item_matrix ("userId", "itemId");

-- User similarity based on shared item interactions (top-K similar users per user)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_similarity AS
WITH user_vectors AS (
  SELECT
    "userId",
    ARRAY_AGG(implicit_rating ORDER BY "itemId") AS rating_vector
  FROM mv_user_item_matrix
  GROUP BY "userId"
  HAVING COUNT(*) >= 3
),
user_pairs AS (
  SELECT
    u1."userId" AS user_id,
    u2."userId" AS similar_user_id,
    u1.rating_vector AS vec1,
    u2.rating_vector AS vec2
  FROM user_vectors u1
  JOIN user_vectors u2 ON u1."userId" < u2."userId"
)
SELECT
  up.user_id,
  up.similar_user_id,
  (
    SELECT SUM(a * b) / (SQRT(SUM(a * a)) * SQRT(SUM(b * b)))
    FROM UNNEST(up.vec1, up.vec2) AS t(a, b)
    WHERE a IS NOT NULL AND b IS NOT NULL
  ) AS similarity
FROM user_pairs up
ORDER BY up.user_id, similarity DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_us_users ON mv_user_similarity (user_id, similar_user_id);

-- Item co-occurrence (items frequently interacted by same users)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_item_cooccurrence AS
SELECT
  i1."itemId" AS item_id,
  i2."itemId" AS co_item_id,
  COUNT(DISTINCT i1."userId") AS co_count
FROM mv_user_item_matrix i1
JOIN mv_user_item_matrix i2 ON i1."userId" = i2."userId" AND i1."itemId" < i2."itemId"
GROUP BY i1."itemId", i2."itemId"
ORDER BY item_id, co_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ic_items ON mv_item_cooccurrence (item_id, co_item_id);

-- Helper function to refresh all CF views at once
CREATE OR REPLACE FUNCTION refresh_cf_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_item_matrix;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_similarity;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_item_cooccurrence;
END;
$$ LANGUAGE plpgsql;
