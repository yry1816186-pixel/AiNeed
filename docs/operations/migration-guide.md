# Database Migration Guide

## Pre-Migration Checklist

- [ ] Review `schema.prisma` changes in PR diff
- [ ] Run `scripts/migrate-db.sh --dry-run` to see pending changes
- [ ] Verify backup is running and recent (<1hr old): `ls -lt /backups/ | head -5`
- [ ] Notify team in #engineering channel
- [ ] Ensure no long-running transactions (check `pg_stat_activity`)
- [ ] Confirm staging deploy verified healthy
- [ ] Record current image tag for rollback: `docker inspect prod-backend --format '{{.Config.Image}}'`

## 迁移步骤 (Migration Procedure)

1. **Preview changes:**
   ```bash
   bash scripts/migrate-db.sh --dry-run
   ```
2. **Apply migrations** (auto-backs up first):
   ```bash
   bash scripts/migrate-db.sh
   ```
3. **Verify migration status:**
   ```bash
   cd apps/backend && npx prisma migrate status
   ```
4. **Restart backend:**
   ```bash
   docker compose -f docker-compose.production.yml restart backend
   ```
5. **Run health check:**
   ```bash
   bash scripts/verify-deploy.sh
   ```

## Rollback Procedure

If migration causes issues:

1. **Stop backend:**
   ```bash
   docker compose -f docker-compose.production.yml stop backend ai-service
   ```
2. **Restore database** from pre-migration backup:
   ```bash
   bash scripts/restore-db.sh /backups/<pre-migration-timestamp>
   ```
3. **Revert to previous image:**
   ```bash
   bash scripts/rollback-deploy.sh <previous_image_tag>
   ```
4. **Verify rollback:**
   ```bash
   bash scripts/verify-deploy.sh
   ```

## Failure Recovery

### Migration fails mid-way

**Do NOT re-run the migration.** Prisma tracks applied migrations; re-running may skip or double-apply.

1. Restore from pre-migration backup: `bash scripts/restore-db.sh /backups/<timestamp>`
2. Fix the schema change in a new branch
3. Create a corrective migration: `npx prisma migrate dev --create`
4. Retry the full procedure

### Data loss detected

1. Immediately stop backend: `docker compose -f docker-compose.production.yml stop backend`
2. Restore from latest backup: `bash scripts/restore-db.sh /backups/<latest>`
3. Investigate root cause before retrying

### Performance degradation after migration

1. Check query plans: `EXPLAIN ANALYZE <slow query>`
2. If caused by missing index: add migration with `CREATE INDEX CONCURRENTLY`
3. If caused by schema change: consider rolling back with `scripts/rollback-deploy.sh`
4. Monitor Grafana dashboard for 15 minutes after any migration

## Migration Types

### Schema Migration (prisma migrate)

| Operation               | Safety            | Notes                                           |
| ----------------------- | ----------------- | ----------------------------------------------- |
| Adding columns          | Safe              | Use `@default()` for required columns           |
| Removing columns        | Caution           | Back up data first, use multi-step migration    |
| Renaming columns        | Caution           | Use `@map()` to avoid data loss                 |
| Adding required columns | Safe with default | Must have `@default()` value                    |
| Dropping tables         | Dangerous         | Export data first, verify nothing references it |
| Changing column types   | Caution           | May require data transformation                 |
| Adding indexes          | Safe              | Use `CONCURRENTLY` for large tables             |

### Data Migration (seed scripts)

- Run **after** schema migration completes
- Always write **idempotent** scripts (safe to re-run)
- Test on staging environment first
- Use Prisma's `$executeRaw` for bulk operations
- Example structure:

  ```typescript
  // apps/backend/prisma/seed-data.ts
  import { PrismaClient } from "@prisma/client";

  const prisma = new PrismaClient();

  async function main() {
    // Idempotent: use upsert, not create
    await prisma.user.upsert({
      where: { email: "demo@xuno.ai" },
      update: {},
      create: { email: "demo@xuno.ai", password: "hashed" },
    });
  }

  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
  ```

## CI/CD Integration

The `deploy-production.yml` workflow handles migration automatically:

1. Creates pre-deploy backup via SSH
2. Runs `prisma migrate deploy` against production DB
3. Verifies migration status
4. If migration fails, auto-rollback job triggers

For manual deploys or emergency migrations, use the scripts directly.
