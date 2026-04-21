# 任务: 安全审计与环境配置

## 项目路径

C:\AiNeed

## 步骤

### 1. npm audit

```bash
cd /c/AiNeed && pnpm audit 2>&1 | tail -50
```

修复所有 HIGH 和 CRITICAL 漏洞:

```bash
pnpm audit --fix
```

### 2. 检查环境变量模板

```bash
ls -la /c/AiNeed/apps/backend/.env.example
ls -la /c/AiNeed/apps/mobile/.env.example
ls -la /c/AiNeed/.env.example
```

确保 .env.example 包含所有必需变量:

- DATABASE_URL (PostgreSQL)
- REDIS_URL
- MINIO_ENDPOINT / ACCESS_KEY / SECRET_KEY
- QDRANT_URL
- JWT_SECRET / JWT_REFRESH_SECRET
- GLM_API_KEY (智谱 AI)
- OPENAI_API_KEY (如果使用)
- SENTRY_DSN (如果使用)

### 3. 检查硬编码密钥

```bash
grep -rn "password\s*=" apps/backend/src/ | grep -v ".spec." | grep -v "test" | grep -v "mock"
grep -rn "secret\s*=" apps/backend/src/ | grep -v ".spec." | grep -v "test"
grep -rn "api_key\s*=" apps/backend/src/ | grep -v ".spec." | grep -v "test"
grep -rn "sk-" apps/backend/src/ | grep -v ".spec."
```

如果发现硬编码密钥，移到环境变量。

### 4. 检查 .gitignore

```bash
cat /c/AiNeed/.gitignore | grep -E "\.env|secret|key|credential"
```

确保以下内容在 .gitignore 中:

```
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
```

### 5. 生产安全检查

读取 `docker-compose.production.yml`，检查:

- [ ] Nginx TLS 配置存在
- [ ] Vault/监控端口不暴露到公网 (ports 不包含 0.0.0.0)
- [ ] API 密钥通过环境变量/secrets 注入，不写在 yml 里
- [ ] 健康检查端点存在

### 6. 输出

- npm audit 结果摘要
- 缺失的环境变量列表
- 发现的硬编码密钥
- docker-compose.production.yml 安全评估
