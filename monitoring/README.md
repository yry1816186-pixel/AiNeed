# AiNeed Monitoring System

Complete monitoring solution for the AiNeed platform using Prometheus and Grafana.

## Architecture

```
                    +-----------------+
                    |   Prometheus    |
                    |   (Port 9090)   |
                    +--------+--------+
                             |
              +--------------+---------------+
              |              |               |
    +---------v----+ +------v------+ +------v------+
    |    Backend    | |  AI Service  | |  Exporters  |
    |  (Port 3001)  | |  (Port 8001)  | | (Various)   |
    +----------------+ +---------------+ +-------------+
              |              |               |
              +--------------+---------------+
                             |
                    +--------v--------+
                    |     Grafana     |
                    |   (Port 3002)   |
                    +-----------------+
```

## Components

### Prometheus (Port 9090)
- Time-series database for metrics
- Scrapes metrics from all services
- Evaluates alerting rules
- 15-day data retention

### Grafana (Port 3002)
- Visualization and dashboards
- Pre-configured datasources
- Pre-built dashboards

### Exporters
- **postgres-exporter** (9187): PostgreSQL metrics
- **redis-exporter** (9121): Redis metrics
- **node-exporter** (9100): System metrics
- **cadvisor** (8080): Container metrics

## Quick Start

### 1. Start Monitoring Stack

```bash
cd C:\AiNeed
docker-compose up -d prometheus grafana postgres-exporter redis-exporter node-exporter cadvisor
```

### 2. Access Grafana

- URL: http://localhost:3002
- Default credentials:
  - Username: `admin`
  - Password: `admin123`

### 3. Available Dashboards

| Dashboard | Description |
|----------|-------------|
| System Overview | CPU, Memory, Disk, Network metrics |
| LLM Monitoring | Token usage, latency, costs, GPU memory |
| Database Monitoring | PostgreSQL, Redis, Qdrant metrics |
| Business Metrics | User activity, recommendations, try-ons |

## Metrics Endpoints

### Backend (NestJS)
- URL: `http://localhost:3001/metrics`
- Metrics collected:
  - HTTP request duration and count
  - Database connections
  - Redis cache hits/misses
  - Business metrics (user registrations, orders, etc.)

### AI Service (Python)
- URL: `http://localhost:8001/metrics`
- Metrics collected:
  - LLM token consumption
  - Vector search latency
  - Model inference duration
  - GPU memory usage

## Alert Rules

### Critical Alerts
| Alert | Condition | Threshold |
|-------|-----------|-----------|
| LLMHighErrorRate | LLM error rate | > 5% |
| APIHighLatency | P95 response time | > 2s |
| PostgresConnectionPoolExhausted | Connection usage | > 90% |
| GPUMemoryCritical | GPU memory | > 95% |

### Warning Alerts
| Alert | Condition | Threshold |
|-------|-----------|-----------|
| HighCPUUsage | CPU usage | > 90% |
| HighMemoryUsage | Memory usage | > 90% |
| DiskSpaceLow | Free disk | < 10% |

## Environment Variables

### Grafana
```bash
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123
```

### Prometheus
Configuration is in `monitoring/prometheus/prometheus.yml`

## Directory Structure

```
C:\AiNeed\monitoring\
├── prometheus\
│   └── prometheus.yml       # Prometheus configuration
├── grafana\
│   └── provisioning\
│       ├── datasources\      # Auto-configured datasources
│       │   └── datasources.yml
│       └── dashboards\
│           ├── dashboards.yml # Dashboard provisioning config
│           └── json\         # Dashboard JSON files
│               ├── system-overview.json
│               ├── llm-monitoring.json
│               ├── database-monitoring.json
│               └── business-metrics.json
└── alerts\
    └── alert.rules.yml       # Alerting rules
```

## Common Queries

### LLM Token Usage (Last Hour)
```promql
sum(increase(llm_tokens_total[1h]))
```

### API Error Rate
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

### P95 Response Time
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Active Database Connections
```promql
pg_stat_activity_count{datname="stylemind"}
```

### Redis Cache Hit Rate
```promql
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

## Integration Examples

### NestJS Backend

```typescript
import { MetricsService } from './modules/metrics/metrics.service';

// In your service
constructor(private readonly metricsService: MetricsService) {}

// Record a business metric
this.metricsService.recordTryOnRequest();
this.metricsService.recordRecommendationServed('style');

// Record HTTP metrics (automatic via middleware)
// Already handled by MetricsMiddleware
```

### Python AI Service

```python
from services.metrics_service import (
    track_llm_call,
    track_vector_search,
    record_llm_tokens,
    update_gpu_memory
)

# Using decorators
@track_llm_call(model='gpt-4o-mini', provider='openai')
async def call_llm(prompt: str):
    # ... LLM call
    pass

# Manual recording
record_llm_tokens('gpt-4o-mini', prompt_tokens=100, completion_tokens=500)
update_gpu_memory(gpu_id=0, used_bytes=8*1024*1024*1024, total_bytes=12*1024*1024*1024)
```

## Troubleshooting

### Prometheus not scraping metrics
1. Check target is accessible: `curl http://backend:3001/metrics`
2. Check Prometheus targets page: http://localhost:9090/targets

### Grafana dashboards not loading
1. Check provisioning logs: `docker logs stylemind-grafana`
2. Verify datasource connection in Grafana UI

### Missing metrics
1. Ensure the service is running
2. Check /metrics endpoint directly
3. Verify Prometheus is scraping the target

## Best Practices

1. **Label Consistency**: Use consistent label names across services
2. **Histogram Buckets**: Choose appropriate buckets for your latency SLAs
3. **Alert Fatigue**: Set appropriate thresholds to avoid alert spam
4. **Cardinality**: Avoid high-cardinality labels (e.g., user IDs)
5. **Retention**: Adjust retention based on storage constraints

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [prom-client (Python)](https://github.com/prometheus/client_python)
- @willsoto/nestjs-prometheus
