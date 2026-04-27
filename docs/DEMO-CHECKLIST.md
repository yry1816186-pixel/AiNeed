# 寻裳 XUNO — 演示前检查清单

> **用途**: 比赛演示前逐项确认，确保零崩溃、零延迟
> **执行时间**: 演示前 30 分钟开始，逐项确认
> **总检查项**: 15 项

---

## 一、环境准备 (演示前 30 分钟)

> **自动化**: 运行 `bash scripts/demo-preflight.sh` 可自动检查 1-3 项

### 1. Docker Desktop 运行状态

- [ ] **Docker Desktop 已启动，磁盘空间 >10GB**
  - 自动检查: `bash scripts/demo-preflight.sh` (check 1)
  - 手动检查: `docker info`
  - 预期: Server Version 显示，无报错
  - 磁盘检查: `docker system df` 确认 Available > 10GB

### 2. 配置文件完整性

- [ ] **`.env.production` 配置文件存在且完整**

  - 自动检查: `bash scripts/demo-preflight.sh` (check 2)
  - 手动检查: `cat .env.production | grep -E "POSTGRES_PASSWORD|REDIS_PASSWORD|GLM_API_KEY|JWT_SECRET"`
  - 预期: 4 个关键变量均有值

- [ ] **`secrets/` 目录包含所有必要 secret 文件** (生产环境)
  - 自动检查: `bash scripts/demo-preflight.sh` (check 2)
  - 手动检查: `ls secrets/`
  - 预期: jwt_secret.txt, database_url.txt 存在

### 3. Docker 服务启动

- [ ] **`demo-local.sh` 执行成功**

  - 执行: `bash infrastructure/scripts/demo-local.sh`
  - 预期: 15 个服务全部 up，无报错退出

- [ ] **所有服务 `healthy`**
  - 自动检查: `bash scripts/demo-preflight.sh` (check 3)
  - 手动检查: `docker compose -f docker-compose.production.yml ps`
  - 预期: 所有服务 Status 列显示 `healthy`
  - 核心服务 (6): postgres, redis, minio, qdrant, ai-service, backend
  - 监控服务 (9): prometheus, grafana, loki, promtail, vault, postgres-exporter, redis-exporter, node-exporter, cadvisor

---

## 二、预热验证 (演示前 10 分钟)

> **自动化**: 运行 `bash scripts/demo-warmup.sh` 可自动执行 4-7 项

### 4. 预热脚本执行

- [ ] **`demo-warmup.sh` 执行成功，显示 PASS/FAIL 摘要**
  - 执行: `bash scripts/demo-warmup.sh`
  - 预期: 显示 "预热完成"，所有核心项 PASS，耗时 <120 秒
  - 超时保护: 单项 >30s 自动跳过并警告

### 5. Backend API 健康

- [ ] **Backend API 响应 200**
  - 自动检查: demo-warmup.sh Step 1
  - 手动验证: `curl -s http://localhost:3001/api/v1/health`
  - 预期: 返回 `{"status":"ok"}` 或类似 200 响应

### 6. AI Service 健康

- [ ] **AI Service 响应 200**
  - 自动检查: demo-warmup.sh Step 2
  - 手动验证: `curl -s http://localhost:8002/health`
  - 预期: 返回 `{"status":"ok"}` 或类似 200 响应

### 7. Seed 用户数据和推荐缓存

- [ ] **Seed 用户推荐缓存已热起**
  - 自动检查: demo-warmup.sh Step 4
  - 预期: 至少 1 个 seed 用户推荐缓存成功
  - 手动验证: `curl -s http://localhost:3001/api/v1/recommendations?userId=demo-user-01&scenario=interview`

---

## 三、App 验证 (演示前 5 分钟)

> **手动执行**: 以下需要在模拟器/真机上逐项验证

### 8. 模拟器连接

- [ ] **Android 模拟器已启动并可连接本地后端**
  - 模拟器连接地址: `http://10.0.2.2:3001` (Android 模拟器专用)
  - 真机连接地址: `http://<电脑局域网IP>:3001`
  - 前提: `DEMO_MODE=true` 或端口绑定 `0.0.0.0`
  - 验证: 模拟器浏览器访问 `http://10.0.2.2:3001/api/v1/health` 返回 200

### 9. 冷启动验证

- [ ] **App 冷启动无白屏、无崩溃**
  - 步骤: 杀掉 App 进程 -> 重新打开
  - 预期: 3 秒内显示内容，无白屏/闪退

### 10. 测试账号登录

- [ ] **测试账号登录成功**
  - 使用 demo-user-01 账号登录
  - 预期: 成功进入首页，显示今日推荐和伊伊问候

### 11. Demo 核心路径

- [ ] **面试场景完整流程 (90 秒内)**
  - 步骤: 造型师 -> "明天面试穿什么" -> 完整对话 -> 试穿 -> 保存
  - 预期: 对话流畅，试穿图生成，保存成功

### 12. 语音功能

- [ ] **语音按钮 STT->TTS 链路正常**
  - 长按语音按钮 -> 录音动画 -> 松开 -> 文字识别 -> 伊伊语音回复
  - 备用: 模拟器可能不支持麦克风，使用文字输入替代

---

## 四、Backup 准备

### 13. 预录视频

- [ ] **预录 3 分钟 backup 视频已拷贝到演示设备**
  - 路径: `docs/PRESENTATION/XUNO-DEMO-BACKUP.mp4`
  - 格式: MP4, 分辨率 1080p
  - 播放器: 系统默认，全屏模式预设

### 14. 视频即时切换

- [ ] **视频播放器可即时播放 (零延迟切换)**
  - 验证: 打开播放器 -> 暂停 -> 按空格键可立即播放
  - Live demo 失败时: 评委说 "看预录视频" -> 按空格 -> 0 秒切换

### 15. PPT 最新版

- [ ] **PPT 最新版已拷贝到演示设备**
  - 路径: `docs/PRESENTATION/XUNO-FINAL.pptx`
  - 确认包含最新截图和数据
  - 投屏测试: 确认字体、图片正常显示

---

## 快速参考

**预检命令 (一键):**

```bash
# Step 1: 环境预检
bash scripts/demo-preflight.sh

# Step 2: 启动服务
bash infrastructure/scripts/demo-local.sh

# Step 3: 预热
bash scripts/demo-warmup.sh

# Step 4: 查看服务状态
docker compose -f docker-compose.production.yml ps
```

**关键端口:**
| 服务 | 端口 | 用途 |
|------|------|------|
| Backend API | localhost:3001 | NestJS 后端 |
| AI Service | localhost:8002 | Python ML 服务 |
| Grafana | localhost:3002 | 监控面板 |
| Qdrant | localhost:6333 | 向量数据库 |

**关键命令:**

```bash
# 查看后端日志
docker compose -f docker-compose.production.yml logs -f backend

# 查看 AI 服务日志
docker compose -f docker-compose.production.yml logs -f ai-service

# 重启单个服务
docker compose -f docker-compose.production.yml restart backend
```

**模拟器网络:**

- Android 模拟器 -> 宿主机: `10.0.2.2`
- iOS 模拟器 -> 宿主机: `localhost`

---

_文档版本: 2026-04-27_
_关联: docs/PRESENTATION/XUNO-DEMO-SCRIPT.md, scripts/demo-preflight.sh, scripts/demo-warmup.sh_
