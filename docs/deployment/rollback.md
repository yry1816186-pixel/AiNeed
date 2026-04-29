# Production Rollback Runbook

## When to Rollback

Trigger rollback when ANY of these conditions occur after a production deployment:

| Signal                     | Threshold                                             | Action                     |
| -------------------------- | ----------------------------------------------------- | -------------------------- |
| Health check failure       | Backend/AI returns non-200 for > 3 consecutive checks | Immediate rollback         |
| Error rate spike           | 5xx rate > 5% for > 2 minutes                         | Immediate rollback         |
| Latency threshold          | P99 > 5s for > 3 minutes                              | Evaluate + rollback        |
| Database migration failure | Migration apply fails                                 | Rollback migration + image |
| Container crash loop       | Any service restarts > 3 times in 5 min               | Rollback affected service  |

## Rollback Scenario 1: Image Rollback (Most Common)

Roll back to a previously deployed Docker image tag while keeping infrastructure running.

```bash
cd $DEPLOY_PATH

export IMAGE_TAG="<previous-version-tag>"
export REGISTRY="ghcr.io"
export IMAGE_NAME="<owner>/backend"

docker login $REGISTRY -u "<actor>" --password-stdin <<< "$GITHUB_TOKEN"

docker compose -f docker-compose.production.yml pull backend
docker compose -f docker-compose.production.yml up -d --no-deps backend
```

### Verify after image rollback

```bash
bash scripts/verify-deploy.sh docker-compose.production.yml
```

## Rollback Scenario 2: Configuration Rollback

Application config changed (env vars, feature flags) but image is fine.

```bash
cd $DEPLOY_PATH

git checkout HEAD~1 -- .env.production

docker compose -f docker-compose.production.yml restart backend ai-service
```

### Verify after config rollback

```bash
bash scripts/verify-deploy.sh docker-compose.production.yml
```

## Rollback Scenario 3: Full Infrastructure Rollback

Nuclear option — tear everything down and restore from backup.

```bash
cd $DEPLOY_PATH

docker compose -f docker-compose.production.yml down

pg_restore -d stylemind -1 /tmp/<backup-file>.sql.gz

git checkout <previous-stable-tag> -- docker-compose.production.yml

docker compose -f docker-compose.production.yml up -d
```

### Verify after full rollback

```bash
bash scripts/verify-deploy.sh docker-compose.production.yml 180
```

## Blue-Green Slot Rollback

The production deploy uses blue-green deployment. If health checks fail on the new slot, traffic stays on the old slot. The `auto-rollback` job in `deploy-production.yml` handles this automatically.

Manual slot switch:

```bash
cd $DEPLOY_PATH

CURRENT_SLOT=$(cat /tmp/current_slot 2>/dev/null || echo "blue")
if [ "$CURRENT_SLOT" = "blue" ]; then
  ROLLBACK_SLOT="green"
else
  ROLLBACK_SLOT="blue"
fi

echo "Switching from $CURRENT_SLOT to $ROLLBACK_SLOT"
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
echo "$ROLLBACK_SLOT" > /tmp/current_slot
```

## Database Migration Rollback

```bash
cd apps/backend

npx prisma migrate resolve --rolled-back "<migration-name>"

npx prisma migrate deploy
```

Only rollback migrations that have NOT been applied to production data. If a migration has already applied schema changes with data loss, a full database restore from backup is required.

## Post-Rollback Checklist

- [ ] All services healthy (`scripts/verify-deploy.sh`)
- [ ] Error rate returned to baseline (< 1%)
- [ ] Latency returned to baseline (< 500ms P99)
- [ ] Notify team in Slack with rollback details
- [ ] Create incident ticket with root cause
- [ ] Review failed deployment logs before next attempt
