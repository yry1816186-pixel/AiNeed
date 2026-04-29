# Production Deployment Checklist

## Pre-Deploy

- [ ] All CI checks passing (lint, typecheck, test, build)
- [ ] Migration dry-run reviewed: `bash scripts/migrate-db.sh --dry-run`
- [ ] Latest backup confirmed: `ls -lt /backups/ | head -5`
- [ ] Rollback image tag recorded: `docker inspect prod-backend --format '{{.Config.Image}}'`
- [ ] Team notified in #engineering channel
- [ ] Staging deploy verified healthy
- [ ] Review Grafana dashboards for current baseline metrics
- [ ] Confirm no critical alerts firing in Prometheus

## Deploy

- [ ] Run migration: `bash scripts/migrate-db.sh`
- [ ] Deploy new image: trigger `deploy-production.yml` workflow
- [ ] Monitor deploy logs: `docker compose -f docker-compose.production.yml logs -f backend`
- [ ] Wait for health check to pass (max 2 minutes)

## Post-Deploy

- [ ] Run smoke tests: `bash scripts/verify-deploy.sh`
- [ ] Check Grafana dashboard for anomalies (5 min window)
- [ ] Run k6 quick smoke: `k6 run --vus 5 --duration 30s scripts/load-test/load-test.js`
- [ ] Verify API docs accessible: `curl -sf http://localhost:3001/api/v1/health`
- [ ] Check alert rules not firing: Prometheus alerts page
- [ ] Announce completion in #engineering channel

## Rollback (if needed)

- [ ] `bash scripts/rollback-deploy.sh <PREVIOUS_TAG> --with-db-restore /backups/<timestamp>`
- [ ] Verify rollback: `bash scripts/verify-deploy.sh`
- [ ] Announce rollback in #engineering channel with RCA timeline

---

**Deploy Owner:** ****\_\_\_****
**Date/Time:** ****\_\_\_****
**New Image Tag:** ****\_\_\_****
**Previous Image Tag:** ****\_\_\_****
**Result:** [ ] Success [ ] Rolled Back
