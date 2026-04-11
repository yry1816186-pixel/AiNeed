#!/bin/bash
set -e

ES_URL="http://localhost:9200"

echo "=== Elasticsearch 初始化 ==="

until curl -sf "${ES_URL}/_cluster/health?wait_for_status=yellow&timeout=30s" > /dev/null 2>&1; do
  echo "等待 Elasticsearch 启动..."
  sleep 5
done

echo "Elasticsearch 已就绪"

echo "检查 analysis-ik 插件..."
PLUGINS=$(curl -sf "${ES_URL}/_cat/plugins?format=json" 2>/dev/null || echo "[]")
if echo "$PLUGINS" | grep -q "analysis-ik"; then
  echo "analysis-ik 插件已安装"
else
  echo "警告: analysis-ik 插件未安装，中文分词将不可用"
  echo "安装方法: docker exec aineed-elasticsearch bin/elasticsearch-plugin install https://get.infini.cloud/elasticsearch/analysis-ik/8.17.0"
fi

echo "创建索引模板..."
curl -sf -X PUT "${ES_URL}/_index_template/aineed-template" -H 'Content-Type: application/json' -d '{
  "index_patterns": ["aineed-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 0,
      "analysis": {
        "analyzer": {
          "ik_smart_analyzer": {
            "type": "custom",
            "tokenizer": "ik_smart"
          },
          "ik_max_word_analyzer": {
            "type": "custom",
            "tokenizer": "ik_max_word"
          },
          "ik_search_analyzer": {
            "type": "custom",
            "tokenizer": "ik_smart"
          }
        }
      }
    },
    "mappings": {
      "dynamic": true,
      "properties": {
        "id": { "type": "keyword" },
        "created_at": { "type": "date" },
        "updated_at": { "type": "date" }
      }
    }
  }
}' > /dev/null 2>&1 && echo "索引模板创建成功" || echo "索引模板已存在或创建失败"

echo "创建 clothing_items 索引..."
curl -sf -X PUT "${ES_URL}/aineed-clothing" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart",
        "fields": {
          "keyword": { "type": "keyword" },
          "pinyin": { "type": "text", "analyzer": "standard" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "brand": { "type": "keyword" },
      "category": { "type": "keyword" },
      "gender": { "type": "keyword" },
      "colors": { "type": "keyword" },
      "style_tags": { "type": "keyword" },
      "materials": { "type": "keyword" },
      "seasons": { "type": "keyword" },
      "occasions": { "type": "keyword" },
      "price": { "type": "float" },
      "is_active": { "type": "boolean" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}' > /dev/null 2>&1 && echo "clothing_items 索引创建成功" || echo "clothing_items 索引已存在或创建失败"

echo "创建 community_posts 索引..."
curl -sf -X PUT "${ES_URL}/aineed-community" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "user_id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "content": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "tags": { "type": "keyword" },
      "status": { "type": "keyword" },
      "is_featured": { "type": "boolean" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}' > /dev/null 2>&1 && echo "community_posts 索引创建成功" || echo "community_posts 索引已存在或创建失败"

echo "创建 custom_designs 索引..."
curl -sf -X PUT "${ES_URL}/aineed-designs" -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "user_id": { "type": "keyword" },
      "name": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "product_type": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "is_public": { "type": "boolean" },
      "status": { "type": "keyword" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" }
    }
  }
}' > /dev/null 2>&1 && echo "custom_designs 索引创建成功" || echo "custom_designs 索引已存在或创建失败"

echo "=== Elasticsearch 初始化完成 ==="
