# 寻裳 XUNO — 演示前检查清单

> **用途**: 比赛演示前逐项确认，确保零崩溃、零延迟
> **执行时间**: 演示前 30 分钟开始，逐项确认
> **总检查项**: 15 项

---

## 一、环境准备 (演示前 30 分钟)

### 1. Docker Desktop 运行状态

- [ ] **Docker Desktop 已启动，磁盘空间 >10GB**
  - 检查命令: `docker info`
  - 预期: Server Version 显示，无报错
  - 磁盘检查: `docker system df` 确认 Available > 10GB

### 2. 配置文件完整性

- [ ] **`.env.production` 配置文件存在**

  - 检查命令: `ls -la .env.production`
  - 预期: 文件存在，包含 POSTGRES_PASSWORD、REDIS_PASSWORD、GLM_API_KEY 等关键变量

- [ ] **`secrets/` 目录包含所有必要 secret 文件**
  - 检查命令: `ls secrets/`
  - 预期: jwt_secret.txt、database_url.txt、openai_api_key.txt、fal_api_key.txt 均存在

### 3. Docker 服务启动

- [ ] **`demo-local.sh --reset-data` 执行成功 (首次或数据重置时)**

  - 执行命令: `bash infrastructure/scripts/demo-local.sh --reset-data`
  - 预期: 15 个服务全部 up，无报错退出

- [ ] **15 个服务全部 `healthy`**
  - 检查命令: `docker compose -f docker-compose.production.yml ps`
  - 预期: 所有服务 Status 列显示 `healthy` (或 `Up` 且无 restarting)
  - 关键服务: postgres、redis、minio、qdrant、ai-service、backend
  - 监控服务: prometheus、grafana、loki、promtail、vault、postgres-exporter、redis-exporter、node-exporter、cadvisor

---

## 二、预热验证 (演示前 10 分钟)

### 4. 预热脚本执行

- [ ] **`demo-warmup.sh` 执行成功**
  - 执行命令: `bash scripts/demo-warmup.sh`
  - 预期: 显示 "预热完成"，耗时 <120 秒

### 5. Backend API 健康

- [ ] **Backend API 响应 200**
  - 检查命令: `curl -s http://localhost:3001/api/v1/health`
  - 预期: 返回 `{"status":"ok"}` 或类似 200 响应

### 6. AI Service 健康

- [ ] **AI Service 响应 200**
  - 检查命令: `curl -s http://localhost:8002/health`
  - 预期: 返回 `{"status":"ok"}` 或类似 200 响应

### 7. Seed 用户数据

- [ ] **10 个测试账号数据已导入**
  - 检查命令: `curl -s http://localhost:3001/api/v1/users/count` 或检查数据库
  - 预期: 至少有 demo-user-01 ~ demo-user-10 的 seed 数据
  - 每个 seed 用户应包含: onboarding 数据、衣橱数据、偏好数据

---

## 三、App 验证 (演示前 5 分钟)

### 8. 模拟器连接

- [ ] **Android 模拟器已启动并可连接本地后端**
  - 模拟器连接地址: `http://10.0.2.2:3001` (Android 模拟器专用)
  - 如果使用真机: `http://<电脑局域网IP>:3001`
  - 确保 `DEMO_MODE=true` 或端口绑定 `0.0.0.0`
  - 验证: 模拟器浏览器访问 `http://10.0.2.2:3001/api/v1/health` 返回 200

### 9. 测试账号登录

- [ ] **测试账号登录成功**
  - 使用 demo-user-01 账号登录
  - 预期: 成功进入首页，无白屏/闪退

### 10. 伊伊问候

- [ ] **伊伊问候语正常弹出**
  - 进入首页后 2 秒内
  - 预期: 伊伊气泡显示欢迎语 (如 "今天有什么安排？")

### 11. 语音功能

- [ ] **语音按钮可正常触发 STT**
  - 长按语音按钮
  - 预期: 显示录音动画，松开后识别文字并自动发送
  - 注意: 模拟器可能不支持麦克风，备用方案使用文字输入

### 12. 推荐数据

- [ ] **面试场景推荐数据正常显示**
  - 选择 "面试" 场景
  - 预期: 3 套搭配方案卡片弹出，包含上装+下装+鞋+配饰

---

## 四、Backup 准备

### 13. 预录视频

- [ ] **预录 3 分钟 backup 视频已拷贝到演示设备**
  - 文件格式: MP4，分辨率 1080p
  - 播放器: 系统默认播放器，全屏模式预设

### 14. 视频播放即时切换

- [ ] **视频播放器可即时播放 (零延迟切换)**
  - 验证: 打开播放器 -> 暂停 -> 按空格键可立即播放
  - Live demo 失败时: 评委说 "我们看下预录视频" -> 按空格 -> 0 秒切换

### 15. PPT 最新版

- [ ] **PPT 最新版已拷贝到演示设备**
  - 文件: docs/PRESENTATION/XUNO-FINAL.pptx
  - 确认包含最新截图和数据
  - 投屏测试: 确认字体、图片正常显示

---

## 快速参考

**关键端口:**
| 服务 | 端口 | 用途 |
|------|------|------|
| Backend API | localhost:3001 | NestJS 后端 |
| AI Service | localhost:8002 | Python ML 服务 |
| Grafana | localhost:3002 | 监控面板 |
| Qdrant | localhost:6333 | 向量数据库 |

**关键命令:**

```bash
# 启动演示环境
bash infrastructure/scripts/demo-local.sh

# 预热
bash scripts/demo-warmup.sh

# 查看服务状态
docker compose -f docker-compose.production.yml ps

# 查看后端日志
docker compose -f docker-compose.production.yml logs -f backend

# 查看 AI 服务日志
docker compose -f docker-compose.production.yml logs -f ai-service
```

**模拟器网络:**

- Android 模拟器 -> 宿主机: `10.0.2.2`
- iOS 模拟器 -> 宿主机: `localhost`

---

_文档版本: 2026-04-26_
_关联: docs/PRESENTATION/XUNO-DEMO-SCRIPT.md, infrastructure/scripts/demo-local.sh_
