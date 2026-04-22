# 寻裳 XUNO — 无云服务器架构可行性深度分析

> **研究日期**：2026-04-22
> **研究者**：Claude Architecture Analyst
> **结论**：不租云服务器完全可行，推荐渐进式混合架构

---

## 目录

1. [全链路分析](#1-全链路分析)
2. [方案矩阵](#2-方案矩阵)
3. [RTX 4060 能力评估](#3-rtx-4060-能力评估)
4. [安全性分析](#4-安全性分析)
5. [延迟分析](#5-延迟分析)
6. [成本对比](#6-成本对比)
7. [虚拟试穿成本优化](#7-虚拟试穿成本优化)
8. [风险矩阵](#8-风险矩阵)
9. [最终推荐方案](#9-最终推荐方案)
10. [48 小时上线行动清单](#10-48-小时上线行动清单)

---

## 1. 全链路分析

### 1.1 穿搭推荐主流程

从用户打开 App 到获得穿搭推荐的完整链路：

```
用户打开 App
  → React Native 前端渲染                  [用户手机]      0ms
  → 后端 API 请求 (NestJS)                 [服务器]        5-20ms
  → 用户画像查询 (PostgreSQL)               [服务器]        2-5ms
  → 推荐管道执行：
     → L1-L4 硬过滤 (规则引擎)              [CPU]          < 10ms
     → L5 风格评分：
        → FashionCLIP 向量检索 (Qdrant)     [GPU+内存]     20-50ms
        → SASRec 序列推荐                   [GPU]          5-10ms
        → 规则引擎评分                      [CPU]          < 5ms
     → L6 衣橱互补 (数据库查询)              [服务器]       < 20ms
  → LLM 解释生成 (GLM-4-Flash)             [云端API]      500-2000ms
  → 结果返回前端                            [网络]         30-80ms
```

**端到端延迟估算**：
| 路径 | 延迟 |
|------|------|
| 不含 LLM（纯推荐） | ~120-310ms |
| 含 LLM（推荐 + 解释） | ~620-2310ms |
| 含 LLM + 流式输出（体感） | ~500ms |

**资源需求标注**：

| 环节              | CPU      | 内存     | VRAM       | 网络           |
| ----------------- | -------- | -------- | ---------- | -------------- |
| React Native 渲染 | 用户手机 | 用户手机 | -          | 初始 JS Bundle |
| NestJS API        | 1-5%     | 300MB    | -          | < 10KB/请求    |
| PostgreSQL 查询   | 1-5%     | 500MB    | -          | 内部           |
| L1-L4 规则过滤    | 低       | < 100MB  | -          | 内部           |
| FashionCLIP 推理  | 中       | ~2GB     | ~600MB-2GB | 内部           |
| Qdrant 向量搜索   | 低       | ~500MB   | -          | 内部           |
| SASRec 推理       | 低       | < 100MB  | ~50MB      | 内部           |
| LLM 解释          | -        | -        | -          | 1-5KB/请求     |

### 1.2 AI 造型师对话流程

```
用户发送消息
  → WebSocket 连接 (NestJS Gateway)        [服务器]        5ms
  → 路由到 ML 服务 (FastAPI)               [内部HTTP]      2-5ms
  → FashionRulesService 规则注入            [CPU]          < 10ms
  → 调用 GLM-4-Flash (流式)                [云端API]      500-3000ms
  → 对话上下文管理 (Redis)                  [内存]         < 5ms
  → 响应返回 (SSE/WebSocket)               [网络]         30-80ms
```

**总延迟**：~550-3110ms（流式输出体感 < 500ms）

**资源需求**：极低。仅 NestJS + Redis + 外部 API 调用。无 GPU 需求。

### 1.3 虚拟试穿流程

```
用户上传照片 + 选择商品
  → 图片上传                               [网络]         1-3s (2-5MB)
  → MediaPipe 关键点检测                   [端侧/服务端]  100-300ms
  → CIELAB 色彩分析                        [端侧/服务端]  < 50ms
  → 调用图像生成 API (Doubao/GLM)          [云端API]      3-10s
  → 结果图片返回                           [网络]         1-3s
```

**关键洞察**：

- MediaPipe 和色彩分析**最佳方案是端侧执行**（React Native 集成），零服务器成本
- 图像生成是唯一真正需要重度 GPU 的环节，但走云端 API 即可
- 图片上传是带宽消耗最大的环节（2-5MB/次）

### 1.4 GPU 计算需求总结

| 任务                | 需要 GPU? | VRAM 需求 | 可替代方案                |
| ------------------- | --------- | --------- | ------------------------- |
| FashionCLIP 推理    | 可选      | 600MB-2GB | CPU 推理 2-5s（可用但慢） |
| SASRec 推理         | 否        | 50MB      | CPU 即可                  |
| Qdrant 向量搜索     | 否        | -         | 纯内存操作                |
| LLM 解释            | 否        | -         | GLM-4-Flash 免费 API      |
| 虚拟试穿生成        | 是        | 4-8GB     | Doubao/GLM 图像生成 API   |
| **本地必须的 VRAM** | -         | **~2GB**  | -                         |

**结论**：本地 RTX 4060 的 8GB VRAM 只需 ~2GB 即可运行所有本地 ML 推理，剩余 ~6GB 余量。

---

## 2. 方案矩阵

### 2.1 方案 A：RTX 4060 本地全栈

**架构**：

```
[Android App]
    ↓ HTTPS
[Cloudflare Tunnel]
    ↓
[RTX 4060 本地机 WSL2 + Docker]
    ├── NestJS (port 3000)
    ├── FastAPI + ML Models (port 8000, GPU)
    ├── PostgreSQL (port 5432)
    ├── Qdrant (port 6333)
    └── Redis (port 6379)

外部 API：
    └── GLM-4-Flash (免费 LLM)
```

**资源评估**：

| 组件               | CPU        | 内存       | VRAM     | 磁盘      |
| ------------------ | ---------- | ---------- | -------- | --------- |
| Windows 11 + WSL2  | 5-10%      | 4GB        | -        | 30GB      |
| Docker Desktop     | 2%         | 1GB        | -        | 5GB       |
| NestJS             | 1-5%       | 300MB      | -        | < 1GB     |
| FastAPI + ML       | 10-30%     | 2GB        | ~2GB     | 5GB       |
| PostgreSQL         | 1-5%       | 500MB      | -        | 2GB       |
| Qdrant (10 万向量) | 1-5%       | 500MB      | -        | 1GB       |
| Redis              | < 1%       | 100MB      | -        | < 100MB   |
| **总计**           | **20-55%** | **~8.4GB** | **~2GB** | **~44GB** |

> 假设系统有 16GB+ RAM 和 500GB SSD，资源完全够用。

**内网穿透方案对比**：

| 方案                  | 延迟增加  | 稳定性 | 费用       | 安全性              |
| --------------------- | --------- | ------ | ---------- | ------------------- |
| **Cloudflare Tunnel** | +10-30ms  | 极高   | 免费       | 高（不暴露真实 IP） |
| frp 自建              | +5-15ms   | 中     | 需 VPS     | 中                  |
| ngrok                 | +20-50ms  | 高     | 免费有限制 | 高                  |
| localtunnel           | +30-100ms | 低     | 免费       | 低                  |

**推荐**：Cloudflare Tunnel（免费、稳定、安全、低延迟）

**可行性判断**：

| DAU 阶段 | 判定            | 说明                       |
| -------- | --------------- | -------------------------- |
| 0-100    | ✅ **最佳选择** | 全部服务本地跑，零云成本   |
| 100-500  | ✅ 可行         | 带宽可承受，注意散热       |
| 500-2000 | ⚠️ 带宽紧张     | 图片上传并发受限，需要 CDN |
| 2000+    | ❌ 不够         | 必须迁移 API 或租服务器    |

---

### 2.2 方案 B：Serverless / 云函数

**架构**：

```
[Android App]
    ↓
[云函数 API 网关]
    → [Function: NestJS 逻辑]
    → [Supabase: PostgreSQL]
    → [Qdrant Cloud]
    → [GLM-4-Flash API]
    → [本地 RTX 4060: ML 批量计算]
```

**免费额度对比（2026 中国区）**：

| 平台               | 免费额度      | 冷启动 | NestJS 支持          | GPU      |
| ------------------ | ------------- | ------ | -------------------- | -------- |
| Vercel             | 100GB 带宽/月 | 1-3s   | 需适配               | 无       |
| Cloudflare Workers | 10 万请求/天  | < 50ms | 不支持 Node 原生模块 | 无       |
| 阿里云 FC          | 100 万次/月   | 1-5s   | 原生支持             | 付费可用 |
| 腾讯云 SCF         | 100 万次/月   | 1-5s   | 原生支持             | 付费可用 |

**致命问题**：

1. **冷启动**：NestJS 初始化 2-5s + ML 模型加载 10-30s = 首次请求 15-40s，用户完全无法接受
2. **ML 推理无法 Serverless 化**：FashionCLIP 需要 GPU，免费 Serverless 无 GPU
3. **WebSocket 不友好**：大多数平台限制执行时间（Vercel 最长 10s）
4. **改造成本高**：NestJS 需适配 Serverless 模式

**可行性判断**：❌ **不可行**

> 核心推荐管道依赖 GPU 推理，无法有效运行在 Serverless 上。冷启动问题导致用户体验极差。

---

### 2.3 方案 C：混合方案（本地计算 + 云端 API）⭐ 推荐

**架构**：

```
[Android App]
    ↓ HTTPS
[Cloudflare Tunnel / CDN]
    ↓
[RTX 4060 本地机]
    ├── NestJS (API 网关 + 业务逻辑)
    ├── FastAPI ML 服务 (FashionCLIP + SASRec, GPU)
    ├── Qdrant (向量数据库, 本地 Docker)
    └── Redis (会话缓存)

云端服务：
    ├── Supabase PostgreSQL (数据持久化 + 备份)
    ├── GLM-4-Flash (免费 LLM)
    ├── Doubao (虚拟试穿图像生成, 按量)
    └── Cloudflare R2 (图片存储, 免费 10GB)
```

**数据库策略**：

| 阶段          | PostgreSQL 方案      | 理由               |
| ------------- | -------------------- | ------------------ |
| Demo (0-100)  | 本地 Docker          | 最低延迟，最快启动 |
| MVP (100-500) | 本地 + Supabase 双写 | 云端备份 + 读扩展  |
| 增长 (500+)   | 完全迁移 Supabase    | 高可用 + 自动备份  |

**LLM 策略**：

| 用途          | 方案                              | 成本 |
| ------------- | --------------------------------- | ---- |
| 穿搭解释生成  | GLM-4-Flash API                   | 免费 |
| AI 造型师对话 | GLM-4-Flash API                   | 免费 |
| 降级备选      | 通义千问免费额度 / 本地 Qwen-1.8B | 免费 |

**可行性判断**：

| DAU 阶段 | 判定            | 月成本         |
| -------- | --------------- | -------------- |
| 0-100    | ✅ **最佳选择** | ~110 元        |
| 100-500  | ✅ **最佳选择** | ~400 元        |
| 500-2000 | ✅ 可行         | ~1000-1500 元  |
| 2000+    | ⚠️ 需调整       | 需迁移核心服务 |

---

### 2.4 方案 D：全云端免费资源拼图

**架构**：

```
[Android App]
    ↓
[Vercel/CF Pages (静态资源 CDN)]
    ↓ API 调用
[Cloudflare Tunnel → 本地 ML 推理]

云端拼图：
    ├── Supabase (PostgreSQL, 免费 500MB)
    ├── Qdrant Cloud (免费 1 集群, 1GB ≈ 30万向量)
    ├── Upstash Redis (免费 10K 命令/天)
    ├── GLM-4-Flash (免费)
    └── Cloudflare R2 (免费 10GB 存储)
```

**免费资源详细评估**：

| 服务                | 免费额度                | 限制                  | 适用性              |
| ------------------- | ----------------------- | --------------------- | ------------------- |
| Supabase PostgreSQL | 500MB, 2 项目           | 无连接池优化          | ✅ 够 0-1000 DAU    |
| Qdrant Cloud        | 1 集群, 1GB             | 仅 1 集合, ~30 万向量 | ⚠️ 初始够用         |
| Upstash Redis       | 10K 命令/天             | 低流量够用            | ⚠️ 100 DAU 可能超额 |
| Cloudflare R2       | 10GB, 100 万次 A 类操作 | 足够                  | ✅                  |
| GLM-4-Flash         | 免费, RPM ~60           | 并发限制              | ✅                  |

**核心问题**：

1. ML 推理仍需本地机器 → 无法完全摆脱本地依赖
2. Qdrant Cloud 1GB 限制（~30 万向量）可能不够
3. 数据分散在多个服务，管理复杂
4. 网络跳转增多，延迟叠加

**可行性判断**：⚠️ **有限制**

> 可作为方案 C 的补充（CDN + 对象存储 + 云端备份），但不宜作为主方案。完全依赖免费 tier 的风险是任何一家调整政策就全盘崩溃。

---

### 2.5 方案 E：Oracle Cloud 免费 VM + 本地 ML

**架构**：

```
[Android App]
    ↓ HTTPS
[Oracle Cloud ARM VM] (Always Free)
    ├── NestJS API
    ├── PostgreSQL
    ├── Qdrant
    └── Redis

[本地 RTX 4060] (ML 推理服务, 按需唤醒)
    ├── FashionCLIP 向量编码
    └── SASRec 序列推荐
    通过 Cloudflare Tunnel 暴露给 Oracle VM
```

**Oracle Cloud Always Free Tier 亮点**：

- ARM VM：4 Ampere A1 核心 + **24GB RAM** + 200GB 存储
- 带宽：**10TB/月** 出站
- **永久免费**，不过期
- 可选地区：日本/韩国/新加坡（到中国延迟 50-100ms）

**关键风险**：

- ARM VM 抢占难度极高（经常满员）
- 需要信用卡验证（支持 Visa/Mastercard）
- ARM 架构部分 Python 包需重新编译
- Oracle 政策可能变更

**可行性判断**：⚠️ **有限制但值得尝试**

> 一旦成功申请到 ARM VM，这是 500+ DAU 阶段的最佳方案。免费 VM 处理 API + 数据库（稳定 7x24），本地仅做 GPU 推理（可按需启停省电）。

---

### 2.6 方案总览

| 方案           | Demo    | MVP     | 增长    | 规模 | 复杂度 |
| -------------- | ------- | ------- | ------- | ---- | ------ |
| A: 本地全栈    | ✅ 最佳 | ✅      | ⚠️      | ❌   | 低     |
| B: Serverless  | ❌      | ❌      | ❌      | ❌   | 高     |
| C: 混合方案    | ✅      | ✅ 最佳 | ✅ 最佳 | ⚠️   | 中     |
| D: 全云端拼图  | ⚠️      | ⚠️      | ✅      | ✅   | 高     |
| E: Oracle+本地 | ⚠️      | ⚠️      | ✅ 最佳 | ⚠️   | 中     |

---

## 3. RTX 4060 能力评估

### 3.1 VRAM 预算

| 模型                   | 参数量 | FP16 VRAM   | INT8 VRAM    | 推理延迟 |
| ---------------------- | ------ | ----------- | ------------ | -------- |
| FashionCLIP (ViT-B/32) | ~150M  | ~600MB      | ~300MB       | 20-50ms  |
| SASRec (轻量版)        | ~5M    | ~50MB       | ~25MB        | 5-10ms   |
| PyTorch CUDA 上下文    | -      | ~500MB      | ~500MB       | -        |
| Windows 桌面合成       | -      | ~200MB      | ~200MB       | -        |
| **总计**               | -      | **~1.35GB** | **~1.025GB** | -        |
| **剩余 (8GB 总)**      | -      | **~6.65GB** | **~6.975GB** | -        |

**结论**：8GB VRAM 完全足够。即使使用更大的 ViT-L/14 模型（~1.2GB）也仅占用约 2GB。

### 3.2 系统内存需求

| 组件                  | 内存        |
| --------------------- | ----------- |
| Windows 11            | 3-4GB       |
| Docker Desktop + WSL2 | 1-2GB       |
| NestJS                | 300-500MB   |
| FastAPI + ML          | 1-2GB       |
| PostgreSQL            | 500MB       |
| Qdrant (10 万向量)    | 500MB       |
| Redis                 | 100MB       |
| **总计**              | **~7-11GB** |

**建议**：16GB RAM 可运行但偏紧，32GB 更从容。如果只有 16GB，关闭不必要的后台程序。

### 3.3 并发处理能力

| 指标                  | 估算值           |
| --------------------- | ---------------- |
| ML 推理并发（单 GPU） | 5-10 请求/秒     |
| API 吞吐（NestJS）    | 100-500 请求/秒  |
| 数据库 QPS            | 500-1000         |
| 向量搜索 QPS          | 50-100           |
| **综合推荐 QPS**      | **5-10 推荐/秒** |

对应 DAU：

- 每用户每天 10 次推荐 → 100 DAU ≈ 0.01 QPS 平均 / 0.1 QPS 峰值
- **100 DAU 完全无压力**
- **1000 DAU 峰值约 1 QPS** → 仍然轻松

### 3.4 GPU 功耗管理

```bash
# 限制 GPU 功耗到 90W（默认 115W），降低温度和电费
nvidia-smi -pl 90

# 监控 GPU 温度和利用率
nvidia-smi dmon -s puc -d 5
```

---

## 4. 安全性分析

### 4.1 攻击面与防御

| 攻击面          | 风险           | 防御措施                     |
| --------------- | -------------- | ---------------------------- |
| 真实 IP 暴露    | DDoS、端口扫描 | Cloudflare Tunnel 隐藏 IP    |
| API 未认证访问  | 数据泄露       | JWT Token + API Key          |
| Docker 容器逃逸 | 系统被控       | 最小权限 + 网络隔离          |
| SQL 注入        | 数据泄露       | 参数化查询（NestJS TypeORM） |
| XSS             | 用户数据窃取   | 输入验证 + CSP               |
| 中间人攻击      | 数据篡改       | Cloudflare 自动 HTTPS        |

### 4.2 推荐安全架构

```
第 1 层：Cloudflare
  ├── DDoS 防护（自动）
  ├── WAF 规则（自动）
  ├── HTTPS 终止（自动）
  └── Access Policy（可选 IP 白名单）

第 2 层：Docker 网络隔离
  ├── frontend 网络：仅 NestJS 和 FastAPI
  ├── backend 网络：服务间通信
  └── data 网络：数据库层，仅 backend 可访问

第 3 层：应用层安全
  ├── JWT Token 认证
  ├── Rate Limiting（每用户每分钟限制）
  ├── Input Validation（class-validator）
  └── CORS 限制为 App 包名

第 4 层：本地文件系统
  ├── Windows BitLocker 加密
  ├── 敏感数据走环境变量（不硬编码）
  └── 定期 Windows 安全更新
```

### 4.3 Docker 网络隔离配置

```yaml
networks:
  frontend: # 暴露到 Cloudflare Tunnel
  backend: # 内部通信
  data: # 数据层，仅 backend 可访问

services:
  nestjs:
    networks: [frontend, backend]
    ports: ["3000:3000"]

  fastapi:
    networks: [frontend, backend]
    ports: ["8000:8000"]

  postgres:
    networks: [data]
    # 不暴露端口到宿主机

  qdrant:
    networks: [data]

  redis:
    networks: [data]
```

---

## 5. 延迟分析

### 5.1 各方案端到端延迟

| 方案          | 推荐（不含 LLM） | 推荐（含 LLM） | AI 对话     | 虚拟试穿 |
| ------------- | ---------------- | -------------- | ----------- | -------- |
| A/C 本地全栈  | 120-310ms        | 620-2310ms     | 550-3110ms  | 5-16s    |
| B Serverless  | 首次 5-15s       | 首次 5-17s     | N/A         | N/A      |
| D 全云端拼图  | 715-2580ms       | 1215-4580ms    | 1150-5380ms | 6-18s    |
| E Oracle+本地 | 165-370ms        | 665-2370ms     | 600-3170ms  | 5-17s    |

### 5.2 延迟优化策略

| 策略               | 适用场景       | 效果                 |
| ------------------ | -------------- | -------------------- |
| LLM 流式输出 (SSE) | 所有 LLM 调用  | 体感延迟降至 ~500ms  |
| Redis 缓存推荐结果 | 相似查询       | 命中时 < 50ms        |
| 推荐结果预计算     | 用户画像变化时 | 异步更新，查询即返回 |
| 图片 CDN 缓存      | 商品图片       | 加载时间 < 100ms     |
| 数据库连接池       | 所有 DB 操作   | 减少连接开销         |
| ML 推理批处理      | 高并发时       | 提高 GPU 利用率      |

### 5.3 用户体感评估

| 延迟范围 | 体感       | 优化后可达性            |
| -------- | ---------- | ----------------------- |
| < 1s     | 即时响应   | ✅ 穿搭推荐（不含 LLM） |
| 1-3s     | 可接受     | ✅ 含 LLM 流式输出      |
| 3-5s     | 开始不耐烦 | ⚠️ 虚拟试穿（需进度条） |
| > 5s     | 可能放弃   | ❌ 需异步化处理         |

---

## 6. 成本对比

### 6.1 Demo 阶段（0 DAU）

| 成本项     | A: 本地全栈 | B: Serverless | C: 混合     | D: 全云端   | E: Oracle+本地 |
| ---------- | ----------- | ------------- | ----------- | ----------- | -------------- |
| 电费       | 100-150     | 0             | 100-150     | 50          | 100-150        |
| 云服务器   | 0           | 0             | 0           | 0           | 0              |
| 数据库     | 0(本地)     | 0(Supabase)   | 0(本地)     | 0(Supabase) | 0(VM PG)       |
| 向量库     | 0(本地)     | 0(Cloud)      | 0(本地)     | 0(Cloud)    | 0(VM Qdrant)   |
| LLM API    | 0           | 0             | 0           | 0           | 0              |
| 图像生成   | 0           | 0             | 0           | 0           | 0              |
| 内网穿透   | 0(CF)       | N/A           | 0(CF)       | 0(CF)       | 0(CF)          |
| 域名+SSL   | ~5          | ~5            | ~5          | ~5          | ~5             |
| **月总计** | **~110 元** | **~5 元**     | **~110 元** | **~55 元**  | **~110 元**    |

### 6.2 MVP 阶段（100 DAU）

| 成本项     | A: 本地全栈 | B: Serverless | C: 混合     | D: 全云端   | E: Oracle+本地 |
| ---------- | ----------- | ------------- | ----------- | ----------- | -------------- |
| 电费       | 100-150     | 0             | 100-150     | 50          | 100-150        |
| 云服务     | 0           | ~50(超额)     | 0           | 0           | 0              |
| 数据库     | 0           | 0             | 0(Supabase) | 0           | 0              |
| LLM API    | 0           | 0             | 0           | 0           | 0              |
| 图像生成   | ~300        | ~300          | ~300        | ~300        | ~300           |
| CDN/存储   | 0           | 0             | 0(CF R2)    | 0(CF R2)    | 0(CF R2)       |
| 域名+SSL   | ~5          | ~5            | ~5          | ~5          | ~5             |
| **月总计** | **~410 元** | **~355 元**   | **~410 元** | **~355 元** | **~410 元**    |

### 6.3 增长阶段（1000 DAU）

| 成本项     | A: 本地全栈  | B: Serverless | C: 混合      | D: 全云端    | E: Oracle+本地 |
| ---------- | ------------ | ------------- | ------------ | ------------ | -------------- |
| 电费       | 100-150      | 0             | 100-150      | 50           | 100-150        |
| 云服务     | 0            | ~200          | 0            | ~100         | 0              |
| 数据库     | 0            | 0             | ~150(Pro)    | ~150(Pro)    | 0              |
| LLM API    | 0            | 0             | 0            | 0            | 0              |
| 图像生成   | ~3000        | ~3000         | ~3000        | ~3000        | ~3000          |
| 带宽       | ⚠️ 可能不够  | 0             | ⚠️ 可能不够  | 0            | 0(10TB)        |
| CDN/存储   | 0            | 0             | 0            | 0            | 0              |
| 域名+SSL   | ~5           | ~5            | ~5           | ~5           | ~5             |
| **月总计** | **~3110 元** | **~3205 元**  | **~3260 元** | **~3305 元** | **~3110 元**   |

### 6.4 成本结构洞察

```
成本占比分析 (100 DAU, 方案 C):
┌────────────────────────────────────┐
│ 图像生成 API  ████████████  73%    │ ← 最大变动成本
│ 电费          ████████      24%    │
│ 域名等        █              3%    │
│ 其他          █              <1%   │
└────────────────────────────────────┘

成本占比分析 (100 DAU, 无虚拟试穿, 方案 C):
┌────────────────────────────────────┐
│ 电费          ██████████████  96%  │ ← 几乎全部成本
│ 域名等        █              4%    │
│ 其他                         <1%   │
└────────────────────────────────────┘
```

**关键发现**：如果不做虚拟试穿，月成本仅 ~110 元（电费 + 域名）。

---

## 7. 虚拟试穿成本优化

图像生成 API 是 100+ DAU 时的最大成本项（约占总成本 70%+）。

### 7.1 降本路径对比

| 路径                   | 单次成本 | 质量 | 延迟   | 复杂度 |
| ---------------------- | -------- | ---- | ------ | ------ |
| Doubao/GLM API         | ~0.05 元 | 高   | 3-10s  | 低     |
| 本地 SD 1.5 (RTX 4060) | 0 (电费) | 中   | 5-15s  | 中     |
| 本地 SDXL (需卸载 ML)  | 0 (电费) | 高   | 15-30s | 高     |
| 缓存预生成             | 0        | -    | < 1s   | 中     |
| 延迟批量生成           | 0 (电费) | 高   | 分钟级 | 中     |

### 7.2 推荐策略：分级试穿

```
免费用户:
  ├── 搭配展示 (不需要图像生成) — 无限次
  ├── 虚拟试穿 (API 生成) — 3 次/天
  └── 降级方案 (本地 SD 1.5) — 无限次 (质量较低)

付费用户:
  ├── 搭配展示 — 无限次
  ├── 虚拟试穿 (API 高质量) — 无限次
  └── 优先队列 — 快速生成

VIP 用户:
  ├── 全部功能 — 无限次
  ├── 高清生成 — 优先
  └── 定制化 — 个性化模型
```

### 7.3 本地 SD 1.5 可行性

RTX 4060 在已加载 FashionCLIP + SASRec (~2GB VRAM) 的情况下：

| 策略                     | VRAM 占用 | 生成速度 | 切换延迟        |
| ------------------------ | --------- | -------- | --------------- |
| 模型卸载（ML ↔ SD 切换） | SD: ~4GB  | 5-15s/张 | 5-10s 卸载/加载 |
| SD 1.5 + xFormers        | ~3.5GB    | 3-8s/张  | 5-10s           |
| SD 1.5 + LCM 加速        | ~3.5GB    | 1-3s/张  | 5-10s           |

**注意**：ML 和 SD 不能同时加载，需要切换策略。适用于低并发的免费用户降级场景。

### 7.4 预缓存策略

```
离线批处理 (每日凌晨 2:00-6:00):
  ├── 统计热门商品 Top 100
  ├── 生成 "标准体型" × Top 100 的试穿图
  ├── 缓存到 Cloudflare R2
  └── 预计耗时: 100 × 10s × 2体型 = ~33 分钟

用户首次查看:
  ├── 命中缓存 → 直接返回 (< 1s)
  └── 未命中 → 实时生成或降级方案
```

---

## 8. 风险矩阵

### 8.1 综合风险评估

| 风险             | 概率         | 影响 | 缓解策略                                |
| ---------------- | ------------ | ---- | --------------------------------------- |
| 家庭断电         | 中 (1 次/月) | 高   | UPS + 自动重启 + CF 错误页              |
| Windows 自动更新 | 高           | 中   | 活跃时间设置 + 暂停更新 + WSL2 自动恢复 |
| CF Tunnel 断开   | 低 (1 次/季) | 高   | 健康检查 + 自动重连 + frp 备用          |
| 硬盘故障         | 低           | 极高 | 每日备份到云端 + PG WAL                 |
| GPU 过热         | 低           | 高   | 功率限制 + 温度监控                     |
| 安全入侵         | 中           | 极高 | CF Tunnel + Docker 隔离 + 最小权限      |
| 带宽不够         | 中 (500+DAU) | 中   | 图片走 CDN + 迁移 API                   |
| ISP 封端口       | 低           | 中   | CF Tunnel 不需要开放端口                |
| GLM 免费政策变更 | 中           | 中   | 备选通义千问 + 本地小模型               |
| 开发机需他用     | 高           | 低   | ML 按需启停 (空闲 5 分钟后卸载)         |

### 8.2 可用性 SLA 估算

| 停机原因       | 频率        | 持续时间 | 年停机          |
| -------------- | ----------- | -------- | --------------- |
| Windows 更新   | 1-2 次/月   | 10 分钟  | 2-4 小时        |
| 断电（无 UPS） | 0.5-1 次/月 | 30 分钟  | 3-6 小时        |
| 网络故障       | 0.5 次/月   | 60 分钟  | 6 小时          |
| CF Tunnel 断连 | 1 次/季     | 10 分钟  | 0.7 小时        |
| **年总停机**   | -           | -        | **~12-17 小时** |
| **年可用性**   | -           | -        | **99.8-99.86%** |

> 对于独立开发者的 Demo/MVP 阶段，99.8% 可用性完全可以接受。

### 8.3 Windows 作为服务器的特殊问题

| 问题                    | 影响             | 解决方案                            |
| ----------------------- | ---------------- | ----------------------------------- |
| Windows Update 强制重启 | 服务中断         | 设置活跃时间 00:00-08:00 + 暂停更新 |
| 内存管理不如 Linux      | 长期运行可能泄漏 | Docker 内存限制 + 定期重启容器      |
| NTFS I/O 性能差         | DB 性能下降      | WSL2 ext4 文件系统存放数据          |
| 防火墙规则冲突          | 服务不可访问     | 配置 Windows Defender 规则          |
| 自动休眠                | 服务中断         | 关闭休眠：`powercfg /h off`         |

---

## 9. 最终推荐方案

### 推荐：渐进式混合架构（方案 C 增强版）

```
核心原则：本地 ML 推理 + 云端 API + Cloudflare Tunnel 网关
迁移策略：按需渐进，不提前优化
```

### 9.1 分阶段路线图

#### Phase 1: Demo (0-100 用户)

```
[Android App]
    ↓ HTTPS
[Cloudflare Tunnel]
    ↓
[RTX 4060 WSL2 + Docker]
    ├── NestJS API
    ├── FastAPI + FashionCLIP + SASRec (GPU)
    ├── PostgreSQL (本地)
    ├── Qdrant (本地)
    └── Redis (本地)

外部 API：
    └── GLM-4-Flash (免费 LLM)
    └── 暂不做虚拟试穿
```

| 指标       | 值                           |
| ---------- | ---------------------------- |
| 月成本     | ~110 元（电费 + 域名）       |
| 启动时间   | 8-10 小时                    |
| 并发能力   | 5-10 推荐/秒                 |
| 可用性     | ~99.8%                       |
| 运维复杂度 | 低（一键 docker compose up） |

#### Phase 2: MVP (100-500 用户)

```
[Android App]
    ↓ HTTPS
[Cloudflare Tunnel]
    ↓
[RTX 4060 WSL2 + Docker]
    ├── NestJS API
    ├── FastAPI + ML (GPU)
    ├── Qdrant (本地)
    └── Redis (本地)

云端新增：
    ├── Supabase PostgreSQL (双写 + 备份)
    ├── Doubao 虚拟试穿 API (限流)
    ├── Cloudflare R2 (图片存储)
    └── Cloudflare Pages (静态 CDN)
```

| 指标     | 值                        |
| -------- | ------------------------- |
| 月成本   | ~400 元                   |
| 迁移时间 | 1-2 周                    |
| 新增功能 | 虚拟试穿 + 用户认证 + CDN |

#### Phase 3: 增长 (500-2000 用户)

```
[Android App]
    ↓ HTTPS
[Oracle Cloud ARM VM / 小 VPS]
    ├── NestJS API
    ├── PostgreSQL (云端)
    ├── Qdrant (云端或 VM)
    └── Redis (云端)

[本地 RTX 4060 (ML 推理, 按需)]
    ├── FashionCLIP
    └── SASRec
    通过 Cloudflare Tunnel 暴露

云端 API：
    ├── GLM-4-Flash
    ├── Doubao 虚拟试穿
    └── 本地 SD 1.5 (免费用户降级)
```

| 指标     | 值                   |
| -------- | -------------------- |
| 月成本   | ~1000-1500 元        |
| 迁移触发 | DAU > 500 或带宽不够 |
| 关键变化 | API 与 ML 分离       |

#### Phase 4: 规模 (2000+ 用户)

```
全云端部署
    ├── GPU 云服务器 (阿里云/腾讯云 GPU ECS)
    ├── 或使用 GPU 推理服务 (AutoDL/Featurize)
    └── 本地仅做开发/测试

触发条件：
    ├── DAU > 2000
    └── 月收入 > 5000 元 (可覆盖成本)
```

| 指标     | 值            |
| -------- | ------------- |
| 月成本   | ~3000-8000 元 |
| 关键决策 | 有收入后迁移  |

### 9.2 决策节点汇总

```
DAU 0 ──────────── 100 ──────────── 500 ──────── 2000 ──────→
     │                │                │             │
     │  方案 C Phase1 │  方案 C Phase2 │ Phase3      │ Phase4
     │  全本地        │  +云端备份     │ API分离     │ 全云端
     │  ~110 元/月    │  ~400 元/月    │ ~1000 元    │ ~3000+ 元
     │                │                │             │
     ▼                ▼                ▼             ▼
   上线验证        加虚拟试穿       加VPS/Oracle   租GPU服务器
```

---

## 10. 48 小时上线行动清单

### Day 1: 基础设施搭建 (8-10 小时)

| 时段      | 任务                       | 产出                          | 耗时 |
| --------- | -------------------------- | ----------------------------- | ---- |
| Hour 0-2  | WSL2 + Docker Desktop 配置 | Docker 环境就绪               | 2h   |
| Hour 2-3  | docker-compose.yml 编写    | 所有服务编排文件              | 1h   |
| Hour 3-5  | ML 模型准备 + FastAPI 部署 | FashionCLIP + SASRec 推理 API | 2h   |
| Hour 5-7  | NestJS API 对接 ML 服务    | 推荐管道端到端联调            | 2h   |
| Hour 7-8  | 数据库 Schema + 初始数据   | PostgreSQL + Qdrant 初始化    | 1h   |
| Hour 8-10 | Cloudflare Tunnel 配置     | 公网可访问 API                | 2h   |

### Day 2: 安全 + 监控 + 联调 (8-10 小时)

| 时段       | 任务                    | 产出           | 耗时 |
| ---------- | ----------------------- | -------------- | ---- |
| Hour 10-11 | 域名绑定 + SSL          | HTTPS 正常工作 | 1h   |
| Hour 11-12 | Cloudflare Access 限流  | API 限流策略   | 1h   |
| Hour 12-13 | Docker 网络隔离配置     | 安全架构就绪   | 1h   |
| Hour 13-14 | 健康检查 + 自动重启脚本 | 运维自动化     | 1h   |
| Hour 14-15 | PostgreSQL 备份脚本     | 每日自动备份   | 1h   |
| Hour 15-16 | GPU 功率限制 + 温度监控 | 散热优化       | 1h   |
| Hour 16-18 | Windows 自启动配置      | 重启后自动恢复 | 2h   |
| Hour 18-20 | App 端到端测试          | 完整链路验证   | 2h   |

### 关键配置文件清单

```
项目根目录/
├── docker-compose.yml          # 服务编排
├── .env                        # 环境变量（不入 Git）
├── cloudflared/
│   └── config.yml              # Cloudflare Tunnel 配置
├── scripts/
│   ├── startup.ps1             # Windows 自启动脚本
│   ├── healthcheck.sh          # 健康检查
│   ├── backup.sh               # 数据库备份
│   └── gpu-monitor.sh          # GPU 监控
├── nestjs-app/
│   └── Dockerfile              # NestJS Docker 配置
└── ml-service/
    └── Dockerfile              # FastAPI ML Docker 配置
```

### 推荐的 docker-compose.yml

```yaml
version: "3.8"

services:
  nestjs:
    build: ./nestjs-app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://xuno:${PG_PASSWORD}@postgres:5432/xuno
      - REDIS_URL=redis://redis:6379
      - ML_SERVICE_URL=http://fastapi:8000
      - GLM_API_KEY=${GLM_API_KEY}
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  fastapi:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      - CUDA_VISIBLE_DEVICES=0
      - QDRANT_URL=http://qdrant:6333
      - MODEL_PATH=/app/models
    volumes:
      - ./models:/app/models:ro
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
        limits:
          memory: 4G
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=xuno
      - POSTGRES_USER=xuno
      - POSTGRES_PASSWORD=${PG_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M

volumes:
  postgres_data:
  qdrant_data:
  redis_data:
```

### Cloudflare Tunnel 配置

```yaml
# cloudflared/config.yml
tunnel: xuno-dev
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: api.xuno.app
    service: http://nestjs:3000
  - hostname: ml.xuno.app
    service: http://fastapi:8000
  - service: http_status:404
```

---

## 附录 A: 中国区特殊注意事项

### A.1 ICP 备案

- 使用 Cloudflare Tunnel（流量走 Cloudflare 海外节点）**不需要 ICP 备案**
- 使用国内云服务（阿里云、腾讯云）则必须备案
- 如果未来使用自定义域名 + 国内服务器，需要提前 1-2 个月备案

### A.2 家庭宽带上行速度

| 套餐  | 下行     | 上行（标称） | 上行（实测） |
| ----- | -------- | ------------ | ------------ |
| 100M  | 100Mbps  | 20Mbps       | 15-18Mbps    |
| 200M  | 200Mbps  | 30Mbps       | 25-28Mbps    |
| 500M  | 500Mbps  | 50Mbps       | 40-45Mbps    |
| 1000M | 1000Mbps | 50Mbps       | 40-48Mbps    |

> 即使千兆套餐，上行也通常只有 30-50Mbps。推荐 API 走文本数据，图片走 OSS/CDN。

### A.3 DNS 与网络

- Cloudflare Tunnel 在中国大部分地区可用，但偶有不稳定
- 备选方案：frp + 国内小 VPS（阿里云轻量 ~30-50 元/月）
- App 可内置多个 API 端点，自动降级

---

## 附录 B: 一句话总结

> **先用本地开发机 + Cloudflare Tunnel 零成本上线，验证产品后再考虑云迁移。不要在不确定产品能否获客时就投入云服务器成本。**

---

_本文档由 Claude Architecture Analyst 生成，基于 2026 年 4 月的技术环境分析。云服务免费额度随时可能变更，建议定期核实。_
