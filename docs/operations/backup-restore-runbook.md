# xuno Backup & Restore Runbook

## Backup Schedule

| Schedule | Type | Retention | Target |
|----------|------|-----------|--------|
| Daily 02:00 | Full | 30 days | Local + S3 (optional) |
| Weekly Sunday | Full + Verify | 90 days | S3 |

## Backup Contents

| Data Store | Method | Format | Typical Size |
|------------|--------|--------|-------------|
| PostgreSQL 16 | pg_dump + gzip | .sql.gz | ~50-200 MB |
| Redis 7 | BGSAVE + docker cp | .rdb | ~10-50 MB |
| MinIO | docker cp + tar.gz | .tar.gz | ~500 MB - 5 GB |
| Qdrant | docker cp + tar.gz | .tar.gz | ~100-500 MB |

---

## Manual Backup Procedure

### Full Backup (All Data Stores)

**Windows:**
```cmd
scripts\backup\backup.bat --full
```

**Linux:**
```bash
./scripts/backup/backup.sh --full
```

### Database-Only Backup

```cmd
scripts\backup\backup.bat --db-only
```

### Upload to S3 After Backup

```cmd
scripts\backup\backup.bat --full --upload
```

### Verify Backup Integrity

After backup completes, check:
1. Backup directory exists: `C:\backups\xuno_backup_YYYYMMDD\`
2. All expected files present: `postgres_*.sql.gz`, `redis_*.rdb`, `minio_*.tar.gz`, `qdrant_*.tar.gz`
3. File sizes are non-zero
4. (Linux) SHA256 checksums match `manifest.json`

---

## Restore Procedure

### Full Restore (All Data Stores)

**Linux:**
```bash
./scripts/backup/restore.sh /backups/xuno_backup_YYYYMMDD
```

**With Verification:**
```bash
./scripts/backup/restore.sh --verify /backups/xuno_backup_YYYYMMDD
```

### Selective Restore

```bash
# PostgreSQL only
./scripts/backup/restore.sh --postgres /backups/xuno_backup_YYYYMMDD

# Redis only
./scripts/backup/restore.sh --redis /backups/xuno_backup_YYYYMMDD

# MinIO only
./scripts/backup/restore.sh --minio /backups/xuno_backup_YYYYMMDD

# Qdrant only
./scripts/backup/restore.sh --qdrant /backups/xuno_backup_YYYYMMDD
```

### Manual PostgreSQL Restore

```bash
# 1. Decompress backup
gunzip -c /backups/xuno_backup_YYYYMMDD/postgres_TIMESTAMP.sql.gz > restore.sql

# 2. Stop backend to prevent writes
docker-compose stop backend

# 3. Restore database
docker exec -i stylemind-postgres psql -U postgres -d stylemind < restore.sql

# 4. Restart backend
docker-compose start backend

# 5. Verify
curl http://localhost:3001/api/v1/health/ready
```

### Manual Redis Restore

```bash
# 1. Stop Redis
docker-compose stop redis

# 2. Copy RDB file
docker cp /backups/xuno_backup_YYYYMMDD/redis_TIMESTAMP.rdb stylemind-redis:/data/dump.rdb

# 3. Start Redis
docker-compose start redis

# 4. Verify
docker exec stylemind-redis redis-cli -a PASSWORD ping
```

---

## Restore Verification Checklist

After restoring, verify:

- [ ] PostgreSQL: `docker exec stylemind-postgres psql -U postgres -d stylemind -c "SELECT count(*) FROM \"User\";"`
- [ ] Redis: `docker exec stylemind-redis redis-cli -a PASSWORD dbsize`
- [ ] MinIO: Access console at http://localhost:9001, verify buckets and files
- [ ] Qdrant: `curl http://localhost:6333/collections`
- [ ] Backend health: `curl http://localhost:3001/api/v1/health`
- [ ] Login works: `curl -X POST http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test123456!"}'`

---

## Disaster Recovery Targets

| Metric | Target | Notes |
|--------|--------|-------|
| RPO (Recovery Point Objective) | 24 hours | Based on daily backup schedule |
| RTO (Recovery Time Objective) | 60 minutes | Full restore + verification |

## Known Limitations

1. **Incremental backup not implemented** — All backups are full, which takes longer as data grows
2. **Windows restore** — The restore script (`restore.sh`) is Linux-only; Windows restore requires manual steps above
3. **Backup verification** — SHA256 checksums are generated on Linux only; Windows backup.bat does not generate checksums
4. **K8s CronJob** — The K8s backup CronJob is configured but requires a running K8s cluster with proper RBAC
