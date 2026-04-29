# 数据库备份与恢复手册 (Backup & Restore Runbook)

## 备份策略

| 项目     | 配置                                          |
| -------- | --------------------------------------------- |
| 执行频率 | 每天凌晨 2:00 (`BACKUP_SCHEDULE="0 2 * * *"`) |
| 保留策略 | 7 天 (`BACKUP_RETENTION_DAYS=7`)              |
| 存储位置 | MinIO 离机存储 (`BACKUP_DEST=minio`)          |
| RPO      | 24 小时                                       |
| RTO      | 60 分钟                                       |

## 备份内容

| 数据库        | 方式             | 格式      | 典型大小   |
| ------------- | ---------------- | --------- | ---------- |
| PostgreSQL 16 | pg_dump + gzip   | .sql.gz   | 50-200 MB  |
| Qdrant        | Snapshot API     | .snapshot | 100-500 MB |
| Neo4j         | neo4j-admin dump | .dump     | 50-300 MB  |

---

## 手动备份

```bash
# 完整备份 (PostgreSQL + Qdrant + Neo4j)
BACKUP_RETENTION_DAYS=7 bash scripts/backup-db.sh

# 仅本地备份 (不上传 MinIO)
BACKUP_DEST=local bash scripts/backup-db.sh
```

备份文件生成于 `/backups/YYYYMMDD-HHMMSS/`，包含:

- `postgres-YYYYMMDD-HHMMSS.sql.gz` — PostgreSQL 数据
- `qdrant-xuno_clothing-YYYYMMDD-HHMMSS.snapshot` — Qdrant 向量索引
- `neo4j-YYYYMMDD-HHMMSS.dump` — Neo4j 知识图谱
- `manifest.json` — 备份元数据
- `*.sha256` — 校验文件

---

## 恢复步骤

### 前置检查

1. 确认备份目录存在且包含所有 3 个 dump 文件
2. 检查磁盘空间 (至少 2 倍备份大小)
3. 确认 Docker 容器正在运行: `docker compose -f docker-compose.production.yml ps`

### 执行恢复

```bash
# 1. 停止依赖服务 (防止写入冲突)
docker compose -f docker-compose.production.yml stop backend ai-service

# 2. 验证备份文件完整性
sha256sum -c /backups/YYYYMMDD-HHMMSS/*.sha256

# 3. 执行恢复
bash scripts/restore-db.sh /backups/YYYYMMDD-HHMMSS

# 4. 重启依赖服务
docker compose -f docker-compose.production.yml start ai-service backend

# 5. 健康检查
curl -s http://localhost:3001/api/v1/health

# 6. 验证数据完整性
docker exec prod-postgres psql -U xuno -d xuno -c "SELECT count(*) FROM \"User\";"
curl -s http://localhost:6333/collections/xuno_clothing | jq '.result.points_count'

# 7. 检查应用日志
docker compose -f docker-compose.production.yml logs --tail=50 backend

# 8. 端到端功能验证
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456!"}'
```

---

## 灾难恢复场景

### 场景 1: 主机完全故障

1. 在新主机上部署 Docker 环境
2. 从 MinIO 下载最新备份: `docker exec prod-minio mc cp local/xuno-backups/backups/LATEST.tar.gz /tmp/`
3. 解压到 `/backups/`
4. 执行恢复步骤 (见上方)

### 场景 2: 数据库损坏

1. 停止依赖服务
2. 定位损坏的数据库
3. 仅恢复该数据库 (手动操作对应步骤)
4. 验证恢复后重启服务

### 场景 3: 误删除数据

1. 停止所有写入: `docker compose stop backend ai-service`
2. 从最近的备份恢复 (最多丢失 24 小时数据)
3. 如果需要更精确恢复, 使用 PostgreSQL PITR (需提前配置 WAL 归档)

---

## 恢复演练计划

| 频率      | 动作                        | 负责人 |
| --------- | --------------------------- | ------ |
| 每月 1 次 | 执行完整恢复到 staging 环境 | 运维   |
| 每季度    | 从 MinIO 下载备份并验证     | 运维   |
| 上线前    | 端到端灾难恢复演练          | 全体   |

### 演练步骤

1. 在 staging 环境创建测试数据
2. 执行备份
3. 清空数据库
4. 执行恢复
5. 验证数据完整性
6. 记录 RTO 实际耗时

---

## 环境变量

| 变量                    | 默认值        | 说明                         |
| ----------------------- | ------------- | ---------------------------- |
| `BACKUP_RETENTION_DAYS` | 7             | 备份保留天数                 |
| `BACKUP_SCHEDULE`       | `0 2 * * *`   | Cron 表达式                  |
| `BACKUP_DEST`           | minio         | 备份目标: `minio` 或 `local` |
| `BACKUP_DIR`            | `/backups`    | 本地备份目录                 |
| `PG_CONTAINER`          | prod-postgres | PostgreSQL 容器名            |
| `QDRANT_CONTAINER`      | prod-qdrant   | Qdrant 容器名                |
| `NEO4J_CONTAINER`       | prod-neo4j    | Neo4j 容器名                 |

---

## 注意事项

1. **恢复前必做**: 创建当前数据的安全备份 (restore 脚本会自动创建 PostgreSQL 安全备份)
2. **生产容器名**: 脚本使用 `prod-*` 前缀, 开发环境需覆盖环境变量
3. **Neo4j 可选**: 如果 Neo4j 未部署, 备份/恢复脚本会安全跳过
4. **校验验证**: 每个备份文件都附带 SHA256 校验, 恢复前自动验证
