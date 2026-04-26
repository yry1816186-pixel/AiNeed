---
phase: 10-production-launch-competition
plan: 01
subsystem: infra
tags: [docker, nginx, tls, rate-limiting, production, deployment]

requires:
  - phase: 09-monetization-community-sharing
    provides: 完整应用服务栈
provides:
  - 8G 内存预算 Docker Compose 生产配置
  - Nginx rate limiting (API 30r/m, AI 10r/m)
  - xuno.cn 域名 TLS 证书路径
  - Grafana 监控代理
  - 一键部署脚本 deploy-production.sh
affects: [10-02, 10-04]

tech-stack:
  added: []
  patterns: [Docker Compose memory compression, Nginx limit_req_zone]

key-files:
  created:
    - infrastructure/scripts/deploy-production.sh
  modified:
    - docker-compose.production.yml
    - infrastructure/nginx/nginx.conf

key-decisions:
  - "ai-service 768M limit (仅 API 转发不加载模型, per D-04)"
  - "qdrant 3072M limit (D-03 明确指定)"
  - "backend replicas=1 (单机部署, D-03)"
  - "prometheus retention=7d (D-03)"
  - "monitoring 栈保留作为比赛技术展示亮点 (D-03)"

patterns-established:
  - "Docker Compose 内存压缩: limit 之和可略超物理内存 (~8.2G/8G), 因容器不会同时用满 limit"

requirements-completed: [PRD-01]

duration: 8min
completed: 2026-04-26
---

# Phase 10 Plan 01: 生产部署配置压缩与加固 Summary

Docker Compose 内存预算从 ~40G 压缩至 8176M (15 服务), Nginx 添加 rate limiting + xuno.cn TLS + 一键部署脚本

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-26T05:32:36Z
- **Completed:** 2026-04-26T05:40:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- 15 个 Docker 服务内存限制全部压缩至 8G 预算内 (总计 8176M)
- Nginx rate limiting 生效: API 30r/m burst=20, AI 10r/m burst=5, 返回 429
- TLS 证书路径更新为 xuno.cn 域名
- 一键部署脚本支持 --dry-run / --skip-pull, 含 secrets 检查和 TLS 验证

## Task Commits

1. **Task 1: 压缩 Docker Compose 生产配置至 8G 内存预算** - `9d640c2c` (feat)
2. **Task 2: Nginx 添加 rate limiting + xuno.cn TLS + 部署脚本** - `8085adc4` (feat)

## Files Created/Modified

- `docker-compose.production.yml` - 15 服务内存限制压缩, backend replicas=1, prometheus retention=7d, redis maxmemory=384mb, ai-service 移除 ml/models 挂载
- `infrastructure/nginx/nginx.conf` - rate limiting (2 zones), TLS cert xuno.ai -> xuno.cn, Grafana proxy location
- `infrastructure/scripts/deploy-production.sh` - 一键部署脚本 (Docker 验证, secrets 检查, TLS 检查, --dry-run 模式)

## Decisions Made

- ai-service 768M limit: 仅做 API 转发不加载本地模型 (D-04), 移除 ml/models volume 挂载
- 总 limit 8176M 略超 8G 物理内存, 但 limit != 实际使用, 各容器不会同时达到上限
- 保留 vault 服务 (128M), 降低资源但不移除, 避免依赖断裂

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- Docker Compose 配置可直接用于 4C8G 腾讯云部署
- deploy-production.sh 需要 .env.production 和 secrets/ 目录配合使用
- TLS 证书需通过 certbot 获取后才能启动 HTTPS
- Plan 02 (离线能力) 和 Plan 04 (压测) 可并行启动

---

_Phase: 10-production-launch-competition_
_Completed: 2026-04-26_

## Self-Check: PASSED

- FOUND: docker-compose.production.yml
- FOUND: infrastructure/nginx/nginx.conf
- FOUND: infrastructure/scripts/deploy-production.sh
- FOUND: 10-01-SUMMARY.md
- FOUND: commit 9d640c2c (Task 1)
- FOUND: commit 8085adc4 (Task 2)
