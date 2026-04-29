# 监控告警响应手册

**最后更新:** 2026-04-29
**适用环境:** 生产环境 (docker-compose.production.yml + docker-compose.observability.yml)

## 通用诊断命令

```bash
docker compose -f docker-compose.production.yml ps
docker logs --tail=100 stylemind-backend
curl -s localhost:3001/health | jq .
df -h
free -m
docker stats --no-stream
```

---

## Critical 级别告警

### HighErrorRate — API 5xx 错误率超过 5%

| 项目         | 内容                                           |
| ------------ | ---------------------------------------------- |
| **严重级别** | critical                                       |
| **含义**     | 过去 5 分钟内 API 返回 5xx 状态码的比例超过 5% |
| **用户感知** | App 请求失败、页面加载错误、操作超时           |

**诊断步骤:**

1. 检查后端日志定位错误类型:
   ```bash
   docker logs --tail=200 stylemind-backend 2>&1 | grep -i "error\|exception\|5xx"
   ```
2. 检查上游服务是否正常:
   ```bash
   curl -s localhost:3001/health
   curl -s http://ai-service:8000/health
   ```
3. 检查数据库连接:
   ```bash
   docker exec stylemind-postgres pg_stat_activity -c "SELECT count(*) FROM pg_stat_activity;"
   ```
4. 检查 Redis 连接:
   ```bash
   docker exec stylemind-redis redis-cli ping
   ```

**解决方案:**

1. 数据库连接耗尽 → 重启后端服务: `docker compose restart backend`
2. 外部 API 故障 → 启用降级模式，检查 GLM/Qwen 服务状态
3. 内存不足 → 检查 `docker stats`，必要时扩容
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### ServiceDown — 服务不可达

| 项目         | 内容                                            |
| ------------ | ----------------------------------------------- |
| **严重级别** | critical                                        |
| **含义**     | Prometheus scrape 目标连续 1 分钟返回 down 状态 |
| **用户感知** | 相关功能完全不可用                              |

**诊断步骤:**

1. 确认容器状态:
   ```bash
   docker compose -f docker-compose.production.yml ps
   ```
2. 检查特定服务日志:
   ```bash
   docker logs --tail=100 <container-name>
   ```
3. 检查宿主机资源:
   ```bash
   df -h
   free -m
   docker stats --no-stream
   ```
4. 检查网络连通性:
   ```bash
   docker network inspect ainetwork
   ```

**解决方案:**

1. 容器已停止 → `docker compose up -d <service>`
2. 容器反复重启 → 检查日志中的 OOM 或启动错误
3. 磁盘满 → 清理 Docker 日志: `docker system prune -f`
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### DatabaseConnectionPoolHigh — PostgreSQL 连接数过高

| 项目         | 内容                       |
| ------------ | -------------------------- |
| **严重级别** | critical                   |
| **含义**     | 活跃数据库连接数超过 80    |
| **用户感知** | 请求延迟上升、部分操作超时 |

**诊断步骤:**

1. 查看活跃连接分布:
   ```bash
   docker exec stylemind-postgres psql -U postgres -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
   ```
2. 查看慢查询:
   ```bash
   docker exec stylemind-postgres psql -U postgres -c "SELECT query, state, duration FROM pg_stat_activity WHERE state='active' ORDER BY duration DESC LIMIT 10;"
   ```
3. 检查后端连接池配置

**解决方案:**

1. 慢查询阻塞 → 终止长事务: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle in transaction' AND query_start < now() - interval '5 minutes';`
2. 连接泄漏 → 重启后端服务: `docker compose restart backend`
3. 流量激增 → 扩大连接池或增加后端实例
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### BruteForceDetected — 暴力破解检测

| 项目         | 内容                       |
| ------------ | -------------------------- |
| **严重级别** | critical                   |
| **含义**     | 每分钟登录失败超过 10 次   |
| **用户感知** | 无直接感知（后台安全事件） |

**诊断步骤:**

1. 检查失败登录来源:
   ```bash
   docker logs --tail=500 stylemind-backend 2>&1 | grep "login.*failed"
   ```
2. 检查是否为集中 IP:
   ```bash
   docker logs --tail=500 stylemind-backend 2>&1 | grep "login.*failed" | grep -oP '\d+\.\d+\.\d+\.\d+' | sort | uniq -c | sort -rn
   ```

**解决方案:**

1. 确认攻击 → 封禁 IP 于防火墙/WAF
2. 误报（负载测试）→ 添加 IP 白名单
3. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### TryOnServiceDown — 虚拟试穿服务异常

| 项目         | 内容                      |
| ------------ | ------------------------- |
| **严重级别** | critical                  |
| **含义**     | 5 分钟内试穿错误数超过 20 |
| **用户感知** | 试穿功能不可用或返回错误  |

**诊断步骤:**

1. 检查 AI 服务状态:
   ```bash
   docker compose ps ai-service
   curl -s http://ai-service:8000/health
   ```
2. 检查 GPU/模型加载状态:
   ```bash
   docker logs --tail=100 ai-service 2>&1 | grep -i "error\|cuda\|model"
   ```
3. 检查 GLM API 配额:
   ```bash
   docker logs --tail=50 ai-service 2>&1 | grep -i "quota\|rate\|limit"
   ```

**解决方案:**

1. GLM API 限流 → 切换到 Qwen fallback
2. GPU OOM → 重启 AI 服务: `docker compose restart ai-service`
3. 模型加载失败 → 检查模型文件完整性
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

## Warning 级别告警

### HighLatency — API P95 延迟超过 2 秒

| 项目         | 内容                                 |
| ------------ | ------------------------------------ |
| **严重级别** | warning                              |
| **含义**     | 过去 5 分钟内 95%的请求延迟超过 2 秒 |
| **用户感知** | 操作响应缓慢                         |

**诊断步骤:**

1. 检查后端资源:
   ```bash
   docker stats --no-stream stylemind-backend
   ```
2. 检查数据库慢查询:
   ```bash
   docker exec stylemind-postgres psql -U postgres -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
   ```
3. 检查 Redis 命中率:
   ```bash
   docker exec stylemind-redis redis-cli info stats | grep keyspace
   ```

**解决方案:**

1. 数据库慢查询 → 添加缺失索引
2. 缓存命中率低 → 检查缓存配置和 TTL
3. AI 服务延迟传导 → 检查 GLM/Qwen 响应时间
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### DiskFull — 磁盘使用超过 80%

| 项目         | 内容                             |
| ------------ | -------------------------------- |
| **严重级别** | warning                          |
| **含义**     | 任意挂载点可用空间低于 20%       |
| **用户感知** | 无直接感知（但可能导致服务崩溃） |

**诊断步骤:**

1. 检查磁盘使用:
   ```bash
   df -h
   ```
2. 查找大文件:
   ```bash
   du -sh /var/lib/docker/* | sort -rh | head -10
   ```
3. 检查日志文件大小:
   ```bash
   find /var/lib/docker/containers -name "*.log" -exec ls -lh {} \; | sort -k5 -rh | head -10
   ```

**解决方案:**

1. Docker 日志过大 → 清理: `docker system prune -f` 或 truncate 日志
2. 镜像占用 → 清理未使用镜像: `docker image prune -a -f`
3. 数据增长 → 扩展磁盘或迁移数据
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### HighMemory — 可用内存低于 15%

| 项目         | 内容                    |
| ------------ | ----------------------- |
| **严重级别** | warning                 |
| **含义**     | 系统可用内存不足 15%    |
| **用户感知** | 响应变慢、偶发 OOM 错误 |

**诊断步骤:**

1. 检查内存使用:
   ```bash
   free -m
   docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
   ```
2. 检查 OOM 事件:
   ```bash
   dmesg | grep -i oom
   ```

**解决方案:**

1. 单容器占用高 → 检查该容器日志，考虑内存限制调整
2. 全局内存不足 → 增加 swap 或扩容实例
3. 内存泄漏 → 重启相关服务: `docker compose restart <service>`
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### AIQuotaExceeded — AI 配额超限

| 项目         | 内容                       |
| ------------ | -------------------------- |
| **严重级别** | warning                    |
| **含义**     | 检测到 AI 服务配额超限事件 |
| **用户感知** | AI 功能降级或不可用        |

**诊断步骤:**

1. 检查 AI 服务日志:
   ```bash
   docker logs --tail=100 ai-service 2>&1 | grep -i "quota\|exceeded\|limit"
   ```
2. 检查当前 API 用量:
   ```bash
   curl -s http://ai-service:8000/metrics | grep ai_quota
   ```
3. 检查 fallback 是否生效:
   ```bash
   docker logs --tail=50 backend 2>&1 | grep -i "fallback\|qwen"
   ```

**解决方案:**

1. GLM 配额耗尽 → 确认 Qwen fallback 已自动启用
2. 所有 AI 配额耗尽 → 联系 API 提供商充值
3. 异常用量激增 → 检查是否有滥用，考虑添加 per-user 限制
4. 持续超过 30 分钟 → 联系 [INSERT ON-CALL CONTACT]

---

### 其他 Warning 告警

| 告警                       | 诊断                                                | 解决                         |
| -------------------------- | --------------------------------------------------- | ---------------------------- |
| **RedisMemoryHigh**        | `docker exec stylemind-redis redis-cli info memory` | 清理过期 key，增加 maxmemory |
| **AIApiLatency**           | `docker logs --tail=50 ai-service`                  | 检查模型加载、网络延迟       |
| **TryOnFailureRate**       | `docker logs --tail=50 ai-service \| grep tryon`    | 检查 GPU 状态、模型可用性    |
| **DiskSpaceLow**           | `df -h`                                             | 同 DiskFull 处理             |
| **RedisCacheHitRateLow**   | `docker exec stylemind-redis redis-cli info stats`  | 检查缓存策略和 key 过期      |
| **AIServiceErrorRateHigh** | `docker logs --tail=100 ai-service \| grep error`   | 检查 GLM/Qwen 服务状态       |
| **PaymentFailureSpike**    | `docker logs --tail=50 backend \| grep payment`     | 检查支付网关状态             |

---

## 升级流程

1. **0-15 分钟:** 按上述诊断步骤排查
2. **15-30 分钟:** 尝试对应解决方案
3. **超过 30 分钟:** 升级到 [INSERT ON-CALL CONTACT]
   - 提供信息: 告警名称、已执行诊断步骤、当前影响范围、已尝试的解决方案
4. **超过 1 小时:** 升级到 [INSERT ESCALATION CONTACT]
