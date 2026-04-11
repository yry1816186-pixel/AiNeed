# AiNeed V3 - Docker 开发环境

## 服务清单

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL 16 + pgvector | 5432 | 主数据库 |
| Redis 7 | 6379 | 缓存+会话 |
| MinIO | 9000 (API) / 9001 (Console) | S3兼容对象存储 |
| Qdrant v1.12+ | 6333 (API) / 6334 (gRPC) | 向量数据库 |
| Neo4j 5 Community | 7474 (Browser) / 7687 (Bolt) | 知识图谱 |
| Elasticsearch 8 | 9200 | 全文搜索 |

## 快速启动

```bash
cd docker

# 启动所有服务 + 初始化
bash start.sh

# 或手动启动
docker compose up -d
```

## 停止服务

```bash
bash stop.sh

# 或手动停止
docker compose down
```

## 查看日志

```bash
# 所有服务日志
docker compose logs -f

# 单个服务日志
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f minio
docker compose logs -f qdrant
docker compose logs -f neo4j
docker compose logs -f elasticsearch
```

## 服务健康检查

```bash
# 查看所有服务状态
docker compose ps

# 检查单个服务健康状态
docker inspect --format='{{.State.Health.Status}}' aineed-postgres
```

## 连接信息

| 服务 | 连接串 |
|------|--------|
| PostgreSQL | `postgresql://aineed:aineed_dev_2026@localhost:5432/aineed_dev` |
| Redis | `redis://:aineed_redis_2026@localhost:6379` |
| MinIO Console | http://localhost:9001 (aineed_minio / aineed_minio_secret_2026) |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| Neo4j Browser | http://localhost:7474 (neo4j / aineed_neo4j_2026) |
| Elasticsearch | http://localhost:9200 |

环境变量统一在 `.env.docker` 文件中，后端可直接引用。

## 初始化脚本

启动后自动执行（也可手动运行）：

| 脚本 | 说明 |
|------|------|
| `init/init-minio.sh` | 创建默认 Bucket (aineed-uploads, aineed-designs, aineed-avatars) |
| `init/init-elasticsearch.sh` | 创建索引模板 + 中文分词设置 + 业务索引 |
| `init/init-qdrant.sh` | 创建默认 Collection (fashion-clip, bge-m3 等) |
| `init/init-neo4j.sh` | 创建约束和索引 |

## 重置数据

```bash
# 停止服务并删除数据
docker compose down -v
rm -rf ./data/

# 重新启动
bash start.sh
```

## Elasticsearch 中文分词插件

首次使用需安装 analysis-ik 插件：

```bash
docker exec aineed-elasticsearch bin/elasticsearch-plugin install https://get.infini.cloud/elasticsearch/analysis-ik/8.17.0
docker restart aineed-elasticsearch
```

## 注意事项

- 所有密码仅用于开发环境，生产环境通过环境变量覆盖
- 持久化数据统一存放在 `./data/` 目录
- Elasticsearch 在 Linux 环境下需要 `vm.max_map_count=262144`，可通过 `sudo sysctl -w vm.max_map_count=262144` 临时设置
- MinIO 初始化需要 `mc` 客户端，Neo4j 初始化需要 `cypher-shell`，未安装时会跳过对应初始化
