# Alerting Runbook — XunO (xuno)

**Last updated:** 2026-05-07
**Scope:** How alerts are routed, receivers, testing, and critical alert reference.
For per-alert diagnostic steps, see `docs/operations/monitoring-runbook.md`.

---

## 1. How Alerts Are Routed

```
┌──────────┐     Firing alert     ┌──────────────┐     routed by labels     ┌──────────┐
│Prometheus│ ──────────────────── │ Alertmanager  │ ──────────────────────── │ Receivers│
│ (metrics)│                      │ (group/dedup) │                          │ (notify) │
└──────────┘                      └──────────────┘                          └──────────┘
```

### Routing Tree (Alertmanager 0.26+ matchers syntax)

| Priority | Matcher | Receiver | Group Wait | Repeat Interval | Notes |
|----------|---------|----------|------------|-----------------|-------|
| 1 (highest) | `severity = critical` | `critical-alerts` + `email-notifications` | 10s | 1h | Webhook + PagerDuty + email |
| 2 | `team = ai` | `dingtalk-ai-team` + `email-notifications` | 30s | 2h | DingTalk AI group |
| 3 | `team = database` | `dingtalk-db-team` + `email-notifications` | 1m | 3h | DingTalk DBA group |
| 4 | `team = business` | `email-notifications` | 5m | 12h | Business alerts, off-hours muted |
| 5 (default) | * (fallback) | `email-notifications` | 30s | 4h | Any unmatched alert |

**Important**: Routes are evaluated top-to-bottom. A `severity = critical` alert always wins regardless of its `team` label.

### Grouping / Deduplication
- **group_by**: Alerts with the same `alertname` and `cluster` are grouped into one notification
- **group_wait**: New alerts wait 10s–5m before first notification (merges bursts)
- **group_interval**: Once a group has fired, new alerts to that group are batched every 1m–30m
- **repeat_interval**: Same unresolved alert re-notifies every 1h–12h

### Inhibition Rules
- `severity = critical` suppresses `severity = warning` with the same `alertname` + `cluster`
- `NodeDown` alert suppresses all `warning|info` alerts on the same `instance`

### Mute Time Windows
- **maintenance-window**: Sundays 02:00–04:00 UTC
- **off-hours**: Mon–Fri 18:00–09:00 (applies only to `team = business` route)

---

## 2. Configured Receivers

| Receiver Name | Type | Destination | Status |
|---------------|------|-------------|--------|
| `email-notifications` | Email (SMTP) | `ops-team@xuno.com` | PLACEHOLDER — real SMTP config needed |
| `critical-alerts` | Webhook | `http://stylemind-backend:3001/api/v1/webhooks/alerts` | PLACEHOLDER — endpoint must be implemented |
| `critical-alerts` | PagerDuty | `${PAGERDUTY_SERVICE_KEY}` | PLACEHOLDER — set env var |
| `dingtalk-ai-team` | Webhook | `${DINGTALK_AI_WEBHOOK_URL}` | PLACEHOLDER — set env var |
| `dingtalk-db-team` | Webhook | `${DINGTALK_DB_WEBHOOK_URL}` | PLACEHOLDER — set env var |
| `dingtalk-business-team` | Webhook | `${DINGTALK_BUSINESS_WEBHOOK_URL}` | PLACEHOLDER — set env var |

### Production vs Dev/Local

**Production** (`docker-compose.production.yml`):
- All receivers above are configured via environment variables
- SMTP credentials via `${SMTP_AUTH_PASSWORD}`
- Webhook auth token via `${ALERT_WEBHOOK_TOKEN}`
- **(GAP)** No `null`/`log-only` receiver for dev — SMTP config uses smtp.example.com placeholder

**Dev/Local** (not yet configured):
- Currently no alertmanager in dev/local compose files
- For local dev: Alertmanager will log all alerts but fail to send (receivers use placeholder env vars)
- Suggestion: Add a `null` receiver for local dev that writes to stdout:
  ```yaml
  receivers:
    - name: 'null-dev'
      # No notification configs — alerts appear in Alertmanager UI only
  ```

---

## 3. How to Add New Receivers

### Example: Add Slack receiver

1. **Add receiver** in `infrastructure/alertmanager/alertmanager.yml`:
   ```yaml
   receivers:
     - name: 'slack-notifications'
       slack_configs:
         - api_url: '${SLACK_WEBHOOK_URL}'
           channel: '#alerts-xuno'
           send_resolved: true
           title: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
           text: '{{ .CommonAnnotations.description }}'
   ```

2. **Add route** in the `route.routes` list:
   ```yaml
   routes:
     - matchers:
         - team = my-team
       receiver: 'slack-notifications'
   ```

3. **Set environment variable** in `.env.production`:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../...
   ```

4. **Restart Alertmanager** (or hot-reload):
   ```bash
   curl -X POST http://localhost:9093/-/reload
   ```

### Receiver Type Documentation
- [Email config](https://prometheus.io/docs/alerting/latest/configuration/#email_config)
- [Webhook config](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Slack config](https://prometheus.io/docs/alerting/latest/configuration/#slack_config)
- [PagerDuty config](https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config)

---

## 4. How to Test Alerts

### Quick: Prometheus UI
Navigate to `http://localhost:9090/alerts` to see all firing/pending alerts.

### Manual: Fire a test alert via API
```bash
# 1. Check Alertmanager is healthy
curl -s http://localhost:9093/-/healthy

# 2. Send a test alert directly to Alertmanager
curl -H "Content-Type: application/json" -d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "warning",
    "team": "ai",
    "service": "test"
  },
  "annotations": {
    "summary": "This is a test alert",
    "description": "Testing alert routing pipeline"
  },
  "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
}]' http://localhost:9093/api/v2/alerts

# 3. Check Alertmanager UI for the test alert
# Open http://localhost:9093 in browser
```

### End-to-End: Trigger an alert rule
```bash
# Method A: Use promtool to test rules against metrics
promtool test rules /etc/prometheus/alert.rules.yml

# Method B: Create a metric that fires an alert
# (requires metrics endpoint to be writable — typically not)
# Better: use Alertmanager API directly as above
```

### Validate configs without restarting
```bash
# Validate prometheus config
promtool check config /path/to/prometheus.yml

# Validate alert rules
promtool check rules /path/to/alert.rules.yml

# Validate alertmanager config
amtool check-config /path/to/alertmanager.yml
```

### Integration test with docker-compose
```bash
# Start only monitoring stack
docker compose -f docker-compose.observability.yml up -d

# Wait for health checks
docker compose -f docker-compose.observability.yml ps

# Check prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check alertmanager
curl -s http://localhost:9093/api/v2/status
```

---

## 5. Which Alerts Are Critical

These alerts have `severity: critical` and trigger PagerDuty + webhook + email:

| Alert Name | What It Means | Runbook Section |
|------------|---------------|-----------------|
| `HighErrorRate` | 5xx error rate > 5% for 5m | See `monitoring-runbook.md#HighErrorRate` |
| `ServiceDown` | Any service unreachable for 1m | Check `docker ps`, service logs |
| `DatabaseConnectionPoolHigh` | PostgreSQL active connections > 80 | Check slow queries, connection leaks |
| `BruteForceDetected` | Login failure rate > 10/s | Investigate auth logs, IP bans |
| `TryOnServiceDown` | >20 try-on errors in 5m | Check GLM API status, AI service logs |

Plus from infrastructure alert rules (mounted in observability compose):
| `BackendErrorRateHigh` | Backend 5xx > 5% | Check backend logs |
| `BackendMemoryHigh` | Container memory > 85% limit | OOM risk — increase limit or fix leak |
| `AIServiceErrorRateHigh` | AI errors > 10% | Check GLM API, trigger CC-07 degredation |
| `TryOnFailureRateHigh` | Try-on failures > 15% | Core feature down |
| `AIStylistUnavailable` | AI Stylist no response in 10m | Trigger CC-07 fallback |
| `GPUModelNotLoaded` | GPU model not loaded for 5m | AI service cannot function |
| `RedisConnectionRejected` | Redis rejecting connections | Check maxclients |
| `PostgreSQLConnectionPoolNearExhaustion` | Connection pool > 80% | Urgent — may reject new connections |
| `PaymentSuccessRateLow` | Payment success < 95% | Revenue impact — contact payment provider |
| `UserEngagementDrop` | Active users down 50% vs yesterday | Possible major outage |

---

## 6. What to Do When an Alert Fires

### Immediate Triage (first 2 minutes)
1. Open Alertmanager UI (`http://localhost:9093`) — see which alerts are firing
2. Open Prometheus Alerts (`http://localhost:9090/alerts`) — check expression values
3. Open Grafana (`http://localhost:3002`) — check affected dashboards
4. Check `docker compose -f docker-compose.production.yml ps` for restarted/crashed services
5. Check recent logs: `docker logs --tail=100 prod-backend`

### Escalation by Severity
- **critical**: Immediate response (< 5 min). Post in team chat. Start incident document.
- **warning**: Respond within 30 min. Check dashboards, open ticket if needed.
- **info**: Review during next standup. May indicate trends.

### Silencing (temporary)
If you need to silence a known issue during fix:
```bash
# Via Alertmanager UI: http://localhost:9093 → "Silences" → "New Silence"
# Or via API:
curl -H "Content-Type: application/json" -d '{
  "matchers": [{"name": "alertname", "value": "HighErrorRate", "isRegex": false}],
  "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "endsAt": "'$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ)'",
  "createdBy": "ops-team",
  "comment": "Investigating — see INC-1234"
}' http://localhost:9093/api/v2/silences
```

### Post-Incident
1. Resolve the root cause
2. Verify alert clears: `http://localhost:9090/alerts`
3. Update this runbook if the response procedure changed
4. Create post-mortem in `docs/operations/incidents/`

---

## 7. Configuration Files Reference

| Environment | Prometheus Config | Alert Rules | Alertmanager Config |
|-------------|-------------------|-------------|---------------------|
| Production | `monitoring/prometheus/prometheus.yml` | `monitoring/alerts/alert.rules.yml` | `infrastructure/alertmanager/alertmanager.yml` |
| Observability (full) | `infrastructure/prometheus/prometheus.yml` | `infrastructure/prometheus/alerts/*.yml` | `infrastructure/alertmanager/alertmanager.yml` |
| Staging | (not configured) | (not configured) | (not configured) |
| Dev/Local | (not configured) | (not configured) | (not configured) |

### Hot Reload (no restart needed)
```bash
# Prometheus
curl -X POST http://localhost:9090/-/reload

# Alertmanager
curl -X POST http://localhost:9093/-/reload
```

---

## 8. Known Gaps & TODO

| Gap | Impact | Mitigation |
|-----|--------|------------|
| SMTP uses `smtp.example.com` placeholder | Email alerts won't deliver until real SMTP is configured | Set `SMTP_AUTH_PASSWORD` + real SMTP host in `.env.production` |
| `DINGTALK_*_WEBHOOK_URL` env vars not set | DingTalk notifications won't deliver | Configure webhook URLs in `.env.production` |
| `PAGERDUTY_SERVICE_KEY` not set | PagerDuty won't receive critical alerts | Set in `.env.production` when PagerDuty is provisioned |
| Critical webhook endpoint `stylemind-backend:3001/api/v1/webhooks/alerts` not implemented | Backend can't receive alert webhooks | Implement the webhook receiver in backend |
| Dev/local/staging have no monitoring services | No alerting in non-prod environments | Add `docker-compose.observability.yml` override or services to dev compose |
| `ai-task-worker:8003` target may not exist | Scrape will fail if worker service name differs | Verify service name in docker-compose. Monitor target health in Prometheus |
| No 4xx alert rules severity escalation | `BackendHighErrorRate4xx` only fires `warning` | Review if 4xx spikes should trigger critical when sustained |
