# Phase 10: Production + Launch + Competition - Research

**Researched:** 2026-04-26
**Domain:** Production deployment / Android app store listing / Offline capability / Competition materials / Load testing + Security audit
**Confidence:** MEDIUM

## Summary

Phase 10 is the final production-readiness phase covering five parallel workstreams: (1) deploying the full Docker Compose stack to a 4C8G Tencent Cloud server with compressed memory budgets, (2) preparing and submitting Android APK to four Chinese app stores (Xiaomi first, then Huawei/OPPO/vivo), (3) implementing WatermelonDB-based offline caching for 50 recommendations + wardrobe + calendar data, (4) creating competition submission materials (PPT, demo video, simulated seed user data, advisor recommendation letter), and (5) running load tests and security audits to validate production stability.

The most technically complex workstream is offline capability with WatermelonDB. The project currently has a demo-only `offline-cache.ts` using AsyncStorage (key-value, no query support), which must be replaced with WatermelonDB for proper relational queries, schema migrations, and two-way sync. The production deployment has a severe memory constraint: the current docker-compose.production.yml allocates ~40G+ of memory limits across 12+ services, which must be compressed to fit within 8G. Android app store listing is straightforward but process-heavy, requiring software copyright, ICP filing, developer accounts, and store-specific metadata conversion.

**Primary recommendation:** Execute all five workstreams in parallel across 3 waves. Wave 1: deployment scripts + offline capability + PPT draft. Wave 2: store materials + video recording + seed data generation. Wave 3: load test + security audit + final submission.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 4C8G 腾讯云轻量应用服务器 -- Docker Compose 单机部署，适配比赛 demo + 早期种子用户。各容器 memory limit 需压缩至 production.yml 定义值的 50%
- **D-02:** .cn 域名 + ICP 备案 -- 使用 xuno.cn 或类似 .cn 域名，立即启动 ICP 备案（需 1-3 周）。Nginx TLS 配置需更新域名
- **D-03:** Docker Compose 生产部署 -- 复用现有 docker-compose.production.yml，调整以下配置：
  - 所有服务 memory limit 压缩 50%（适配 8G 总内存）
  - 后端 replica 从 2 降至 1（单机部署）
  - Qdrant memory 限制从 8G 降至 3G
  - Prometheus retention 从 30d 降至 7d
  - 监控栈（Prometheus + Grafana + Loki）保留，是比赛技术深度展示亮点
- **D-04:** AI 推理走远程 API -- GLM-4-Flash（免费）+ Edge-TTS，不部署本地 GPU 推理。AI service 容器仅做编排和向量检索
- **D-05:** 小米先行 -> 华为/OPPO/vivo -- 小米审核最宽松（3-5 天），通过后同步提交其余 3 家。降低返工风险
- **D-06:** 上架前置条件 -- 软著（Phase 6 已准备材料）+ ICP 备案 + 各商店开发者账号注册 + 应用签名
- **D-07:** app-store-metadata.json 需转换为各商店格式 -- 华为 .agp / 小米 .apk + metadata / OPPO .apk + metadata / vivo .apk + metadata。已有 iOS 格式需完全重写为 Android 格式
- **D-08:** 截图策略 -- 6 张截图覆盖：AI 造型师推荐 / 试穿效果 / 每日推荐流 / 风格测试 / 购物推荐 / 个人中心，需适配各商店分辨率要求
- **D-09:** WatermelonDB -- 选择 WatermelonDB 作为离线存储方案
- **D-10:** 离线数据范围：推荐缓存 50 条最新推荐 / 衣橱数据 savedOutfits + wishlistedItems + purchasedItems / 日历数据 7 天穿搭计划 / 用户 Profile 基本信息 + 偏好设置
- **D-11:** 离线 UX -- 顶部 toast 显示"离线模式" + 禁用需要网络的操作（试穿/AI 对话/分享）+ 缓存数据正常浏览
- **D-12:** 数据同步策略 -- 网络恢复时自动同步：推荐缓存后台刷新 / 衣橱数据双向同步 / 日历数据拉取最新方案
- **D-13:** 三层叙事 PPT -- 第一层：体验革命 / 第二层：面试穿搭 Agent / 第三层：包容性设计
- **D-14:** 录屏 + 配音 Demo 视频 -- 1-3 分钟，使用 Phase 5 demo script，展示完整面试穿搭 Agent 流程
- **D-15:** 模拟种子用户数据 -- 生成 5-10 个模拟用户行为数据
- **D-16:** 指导老师推荐信 -- 需用户提供指导老师信息和推荐信内容方向
- **D-17:** 负载测试 -- 使用 k6 或 Artillery 进行压测
- **D-18:** 安全审计 -- OWASP Top 10 快速扫描 + 依赖漏洞检查（npm audit + pip audit）
- **D-19:** 全部并行 -- 3 个 Wave 并发推进

### Claude's Discretion

- 腾讯云服务器具体购买和初始化流程
- ICP 备案的具体步骤和材料清单
- WatermelonDB schema 设计（表结构、关联关系）
- 离线同步的冲突解决策略
- 各 Android 商店的具体审核要求和提交流程
- PPT 模板选择和视觉风格
- Demo 视频的录制工具和后期处理
- 模拟种子用户数据的具体格式和内容
- 负载测试的具体场景设计
- Nginx rate limiting 的具体阈值

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                        | Research Support                                                                                    |
| ------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| PRD-01 | Nginx + TLS + 监控告警部署                         | docker-compose.production.yml 压缩配置 + nginx.conf 域名更新 + Prometheus/Grafana/Loki 已有完整配置 |
| PRD-02 | 端侧推理迁移（MediaPipe + CIELAB + 规则引擎）      | 本 phase 不实现端侧推理，D-04 决定走远程 API                                                        |
| PRD-03 | 离线能力（缓存 50 条推荐 + 衣橱 + 日历可离线使用） | WatermelonDB v0.28.0 schema 设计 + @react-native-community/netinfo 网络检测 + 同步策略              |
| PRD-04 | 性能压测 + 安全审计                                | k6 (需安装) 或 Artillery v2.0.31 + OWASP Top 10 + npm audit + pip audit                             |
| PRD-05 | Android 应用商店上架（华为/小米/OPPO/vivo）        | Android native 项目已存在 (com.xuno.app) + 小米先行策略 + metadata 转换                             |
| CMP-06 | PPT + 商业计划书（15 页叙事结构）                  | 三层叙事结构 (D-13) + 品牌色暖驼色系                                                                |
| CMP-07 | Demo 演示视频（1-3 分钟）                          | docs/demo-script.md 已有 3 分钟脚本 + OBS 录屏 + 剪映配音                                           |
| CMP-08 | 种子用户数据（10-20 人）                           | 模拟 5-10 用户完整行为链 + 满意度评分 + 留存指标                                                    |
| CMP-09 | 导师推荐信                                         | 需用户提供内容和方向 (D-16)                                                                         |

</phase_requirements>

## Architectural Responsibility Map

| Capability              | Primary Tier             | Secondary Tier | Rationale                                                 |
| ----------------------- | ------------------------ | -------------- | --------------------------------------------------------- |
| Docker 部署编排         | Backend / Infrastructure | --             | Docker Compose 定义所有服务运行时，Nginx 作为唯一外部入口 |
| TLS + 域名 + ICP        | Infrastructure / CDN     | --             | Nginx 负责 TLS 终结，域名注册和 ICP 备案是基础设施层      |
| 监控告警                | Backend                  | Infrastructure | Prometheus 抓取后端 metrics，Grafana 展示，Loki 收集日志  |
| Android APK 构建        | Mobile / Client          | --             | Android native 项目已存在，Gradle 构建 APK                |
| 商店上架                | Process / External       | Mobile         | 主要是流程性工作，mobile 端需提供 APK + metadata          |
| 离线存储 (WatermelonDB) | Mobile / Client          | Backend (sync) | SQLite 存储在移动端本地，后端提供同步 API                 |
| 网络状态检测            | Mobile / Client          | --             | @react-native-community/netinfo 在客户端检测              |
| 离线同步                | Backend                  | Mobile         | 后端提供 REST API 同步端点，客户端发起同步请求            |
| PPT / 视频制作          | Process / External       | --             | 非代码，文档制作                                          |
| 模拟数据生成            | Backend / Scripts        | --             | Python/Node 脚本调用 API 模拟用户行为                     |
| 负载测试                | Infrastructure / Scripts | Backend        | k6 脚本从外部打 API 端点                                  |
| 安全审计                | Infrastructure / Process | Backend        | npm audit + pip audit 扫描依赖，OWASP 检查 API            |

## Standard Stack

### Core

| Library                         | Version           | Purpose                  | Why Standard                                                                                             |
| ------------------------------- | ----------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| @nozbe/watermelondb             | 0.28.0            | 离线 SQLite 存储         | React Native 离线存储标准方案，支持复杂查询、关联关系、RxJS 响应式、schema 迁移 [VERIFIED: npm registry] |
| @react-native-community/netinfo | 12.0.1 (latest)   | 网络状态检测             | 已在项目 dependencies 中，检测在线/离线切换 [VERIFIED: npm registry]                                     |
| @nozbe/sqlite                   | 3.46.0 (bundled)  | WatermelonDB 底层 SQLite | WatermelonDB 内置依赖，高性能 SQLite 绑定 [VERIFIED: npm registry watermelondb deps]                     |
| k6                              | 0.57.0 (latest)   | 负载测试                 | Grafana 出品，脚本化压测标准工具，支持 ES6 语法 [ASSUMED]                                                |
| Artillery                       | 2.0.31            | 负载测试备选             | Node.js 生态压测工具，npm 安装即用 [VERIFIED: npm registry]                                              |
| Docker Compose                  | v5.1.1            | 生产部署编排             | 已有完整 docker-compose.production.yml [VERIFIED: local install]                                         |
| Prometheus + Grafana            | v2.48.0 / v10.2.2 | 监控告警                 | 已有完整配置（5 scrape targets + 12 alert rules） [VERIFIED: docker-compose.production.yml]              |

### Supporting

| Library                  | Version          | Purpose                 | When to Use                                                                           |
| ------------------------ | ---------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| rxjs                     | ^7.8.1           | WatermelonDB 响应式查询 | WatermelonDB 内置依赖，用于 observe() 查询 [VERIFIED: npm registry watermelondb deps] |
| promtail + loki          | v2.9.3           | 日志收集聚合            | 已在 docker-compose.production.yml 配置 [VERIFIED: docker-compose.production.yml]     |
| node-exporter + cadvisor | v1.7.0 / v0.47.2 | 系统容器指标            | 已在 docker-compose.production.yml 配置 [VERIFIED: docker-compose.production.yml]     |

### Alternatives Considered

| Instead of     | Could Use              | Tradeoff                                                                                         |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| WatermelonDB   | Realm                  | Realm 商业化，WatermelonDB 开源且 React Native 社区标准 [ASSUMED]                                |
| WatermelonDB   | AsyncStorage (current) | AsyncStorage 仅 KV 存储，无法复杂查询，已在用但不可满足离线需求                                  |
| k6             | Artillery              | k6 更适合 API 压测场景，Artillery 更适合 Node.js 生态集成。k6 需额外安装，Artillery npm 即装即用 |
| Docker Compose | K8s                    | K8s 对 4C8G 单机过度，Compose 足够 (D-03)                                                        |

**Installation:**

```bash
# WatermelonDB 离线存储
cd apps/mobile
pnpm add @nozbe/watermelondb @nozbe/watermelondb/native

# 负载测试 (二选一)
# 方案 A: k6 (Windows)
choco install k6
# 方案 B: Artillery
pnpm add -D artillery

# 安全审计工具
pnpm add -D npm-audit-resolver  # 已有 npm audit 内置
pip install pip-audit            # Python 依赖审计
```

**Version verification:**

```bash
npm view @nozbe/watermelondb version     # 0.28.0 (2026-04-26 verified)
npm view @react-native-community/netinfo version  # 12.0.1 (2026-04-26 verified)
npm view artillery version               # 2.0.31 (2026-04-26 verified)
```

## Architecture Patterns

### System Architecture Diagram

```
                    Internet
                       |
                  .cn Domain + ICP
                       |
                  Nginx (443/TLS)
                   /    |    \
                  /     |     \
         /api/   /ai/  /storage/  /grafana/
            |      |       |         |
     Backend:3001  AI:8002  MinIO:9000  Grafana:3000
     (NestJS)    (FastAPI) (Object Storage)
         |      |    |
    PostgreSQL  |  Qdrant   Redis
    (5432)      |  (6333)   (6379)
                |
           GLM-4-Flash API (remote)
           Edge-TTS API (remote)

    Monitoring: Prometheus -> Grafana
                Promtail -> Loki
                Node/Postgres/Redis/cAdvisor exporters

    Mobile App (Android)
        |
        |--- WatermelonDB (SQLite local)
        |--- @react-native-community/netinfo
        |--- Sync Engine (on reconnect)
        |
        |--- Android Stores (Xiaomi/Huawei/OPPO/vivo)
        |--- APK signing key
```

### Offline Data Flow Diagram

```
Mobile App                          Backend API
    |                                    |
    |--- netinfo检测在线/离线 ------|        |
    |                                    |
    [在线]                               |
    |--- API请求 --直接使用---------->|    |
    |<-- 响应 --缓存到WDB------|        |
    |                                    |
    [离线]                               |
    |--- 检测离线 --> 显示toast         |
    |--- WDB observe() --> 渲染缓存     |
    |--- 禁用: 试穿/AI对话/分享         |
    |--- 可用: 浏览推荐/衣橱/日历       |
    |                                    |
    [恢复在线]                           |
    |--- netinfo检测在线 --------|       |
    |--- SyncEngine.push() ---->|       |
    |   (推送离线修改)           |       |
    |<-- SyncEngine.pull() -----|       |
    |   (拉取最新数据)           |       |
```

### Recommended Project Structure

```
apps/mobile/src/
├── database/                    # WatermelonDB 新增
│   ├── schema.ts               # 表结构定义
│   ├── migrations.ts           # Schema 迁移
│   ├── models/                 # WatermelonDB Model 类
│   │   ├── CachedRecommendation.ts
│   │   ├── WardrobeItem.ts
│   │   ├── CalendarPlan.ts
│   │   └── UserProfile.ts
│   ├── index.ts                # Database 初始化
│   └── sync/                   # 同步引擎
│       ├── syncEngine.ts       # 推拉同步逻辑
│       ├── conflictResolver.ts # 冲突解决策略
│       └── syncQueue.ts        # 离线操作队列
├── features/
│   ├── today/hooks/useOfflineRecommendations.ts
│   ├── wardrobe/hooks/useOfflineWardrobe.ts
│   ├── stylist/hooks/useOfflineDialog.ts
│   └── ...
├── hooks/
│   └── useNetworkStatus.ts     # netinfo 封装
├── services/
│   ├── offline-cache.ts        # 保留，逐步迁移到 WDB
│   └── ...
```

### Pattern 1: WatermelonDB Schema + Model 定义

**What:** 定义离线存储的表结构、字段类型、关联关系
**When to use:** 所有需要离线访问的数据实体

```typescript
// database/schema.ts
import { appSchema, tableSchema } from "@nozbe/watermelondb";

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: "cached_recommendations",
      columns: [
        { name: "recommendation_id", type: "string", isIndexed: true },
        { name: "items_json", type: "string" }, // JSON 序列化
        { name: "outfit_json", type: "string" }, // JSON 序列化
        { name: "explanation_json", type: "string" }, // JSON 序列化
        { name: "scenario", type: "string", isIndexed: true },
        { name: "cached_at", type: "number" }, // timestamp
        { name: "expires_at", type: "number" }, // timestamp
      ],
    }),
    tableSchema({
      name: "wardrobe_items",
      columns: [
        { name: "server_id", type: "string", isIndexed: true },
        { name: "section", type: "string", isIndexed: true }, // saved/wishlist/purchased
        { name: "item_json", type: "string" },
        { name: "synced_at", type: "number" },
        { name: "is_dirty", type: "boolean" }, // 离线修改标记
      ],
    }),
    tableSchema({
      name: "calendar_plans",
      columns: [
        { name: "date", type: "string", isIndexed: true }, // YYYY-MM-DD
        { name: "outfit_json", type: "string" },
        { name: "weather_json", type: "string" },
        { name: "scenario", type: "string" },
        { name: "synced_at", type: "number" },
      ],
    }),
    tableSchema({
      name: "user_profiles",
      columns: [
        { name: "profile_json", type: "string" },
        { name: "preferences_json", type: "string" },
        { name: "updated_at", type: "number" },
      ],
    }),
  ],
});
```

### Pattern 2: 网络状态检测 + 离线 UI

**What:** 使用 @react-native-community/netinfo 检测网络状态，WatermelonDB 提供离线数据
**When to use:** 所有需要网络数据的功能页面

```typescript
// hooks/useNetworkStatus.ts
import NetInfo from "@react-native-community/netinfo";
import { useState, useEffect } from "react";

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  return { isOffline };
}
```

### Pattern 3: Docker Compose 8G 内存预算压缩

**What:** 将 ~40G+ 的 memory limits 压缩到 8G 以内
**When to use:** 生产部署配置

当前配置 vs 压缩后预算 (单位: MB):

| 服务           | 当前 limit | 压缩后 limit    | 当前 reserve | 压缩后 reserve |
| -------------- | ---------- | --------------- | ------------ | -------------- |
| postgres       | 8192       | 1500            | 2048         | 512            |
| redis          | 2048       | 512             | 512          | 128            |
| minio          | 4096       | 512             | 1024         | 128            |
| qdrant         | 8192       | 3072 (D-03)     | 2048         | 512            |
| vault          | 512        | 128             | 128          | 32             |
| ai-service     | 8192       | 1024            | 2048         | 256            |
| backend        | 2048       | 512 (replica 1) | 512          | 128            |
| prometheus     | 4096       | 512             | 1024         | 128            |
| grafana        | 1024       | 256             | 256          | 64             |
| loki           | 1024       | 256             | 256          | 64             |
| promtail       | 256        | 128             | 64           | 32             |
| exporters (4x) | 256-512    | 64 each         | 64-128       | 32 each        |
| **TOTAL**      | **~41G**   | **~8.4G**       | --           | --             |

**注意:** 8G 服务器实际可用内存约 7.5G (系统占用 ~0.5G)。压缩后总 limit ~8.4G 略超，需进一步优化: 考虑移除 vault (改用 Docker Secrets 文件)、降低 ai-service 到 768M (仅做 API 转发不加载模型)。

### Pattern 4: k6 负载测试脚本结构

**What:** k6 脚本化 API 压测
**When to use:** 验证生产环境性能

```javascript
// tests/load/basic.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const latency = new Trend("latency");

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // ramp up
    { duration: "1m", target: 50 }, // sustained
    { duration: "30s", target: 100 }, // spike
    { duration: "30s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // P95 < 2s
    errors: ["rate<0.05"], // < 5% errors
  },
};

const BASE_URL = __ENV.API_URL || "https://xuno.cn/api";

export default function () {
  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/v1/health`);
  check(healthRes, { "health status 200": (r) => r.status === 200 });

  // Test 2: Recommendations
  const recRes = http.get(`${BASE_URL}/v1/recommendations`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(recRes, { "recs status 200": (r) => r.status === 200 });
  latency.add(recRes.timings.duration);

  sleep(1);
}
```

### Anti-Patterns to Avoid

- **AsyncStorage 替代数据库:** 当前 offline-cache.ts 用 AsyncStorage 存 JSON 字符串。不支持查询、不支持关联、不支持增量更新。WatermelonDB 是正确选择
- **忽略内存预算直接部署:** 8G 机器运行当前配置会导致 OOM kill。必须严格执行 D-03 压缩策略
- **Nginx 不加 rate limiting:** 当前 nginx.conf 无 rate limiting。生产环境必须添加，防止 API 滥用和 DDoS
- **同步无冲突解决:** 离线修改衣橱数据后上线同步，如果不处理冲突会丢失数据。必须实现 conflict resolver
- **硬编码 API URL:** 生产构建必须使用环境变量注入 API URL，不能硬编码

## Don't Hand-Roll

| Problem  | Don't Build              | Use Instead                     | Why                                             |
| -------- | ------------------------ | ------------------------------- | ----------------------------------------------- |
| 离线存储 | AsyncStorage JSON 序列化 | WatermelonDB                    | 支持复杂查询、关联关系、schema 迁移、响应式观察 |
| 同步引擎 | 手写 push/pull 逻辑      | WatermelonDB synchronize()      | 内置冲突解决、批量操作、错误恢复                |
| 网络检测 | 手写 ping 检测           | @react-native-community/netinfo | 处理了所有边缘情况（切换、弱网、后台）          |
| 负载测试 | 手写循环脚本             | k6 或 Artillery                 | 支持阶段式加压、阈值断言、指标收集              |
| 安全扫描 | 手动检查代码             | npm audit + pip audit           | 覆盖已知 CVE 数据库                             |
| TLS 证书 | 手动生成自签名证书       | Let's Encrypt + certbot         | 自动续期、浏览器信任                            |

**Key insight:** 本 phase 大量工作是非代码的流程性任务（ICP 备案、商店审核、PPT 制作），代码密集型工作集中在 WatermelonDB 离线能力和部署配置压缩。不要在流程性任务上过度工程化。

## Runtime State Inventory

本 phase 非 rename/refactor/migration phase，但涉及部署环境变化，需注意：

| Category            | Items Found                                                                            | Action Required      |
| ------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| Stored data         | 无 -- 新部署环境，PostgreSQL/Redis/Qdrant 数据从 seed 脚本初始化                       | seed 脚本准备        |
| Live service config | Grafana dashboards 已有 JSON 配置文件                                                  | 验证导入             |
| OS-registered state | 腾讯云服务器需配置防火墙、DNS 解析                                                     | 新建配置             |
| Secrets/env vars    | .env.production 需创建（含 JWT_SECRET/REDIS_PASSWORD/MINIO_SECRET_KEY/GLM_API_KEY 等） | 首次创建             |
| Build artifacts     | Android APK 需首次构建 (release signing)                                               | 新建 keystore + 签名 |

## Common Pitfalls

### Pitfall 1: 8G 内存预算 OOM

**What goes wrong:** Docker Compose 所有容器 memory limit 之和超过物理内存，导致容器被 OOM kill
**Why it happens:** 当前配置为 ~40G+ limit，直接跑在 8G 机器上必然失败
**How to avoid:** 严格执行 D-03 压缩策略。ai-service 不加载模型（仅 API 转发）可压到 768M。考虑移除 vault 改用 Docker Secrets 文件。Qdrant 设为 3G (D-03)。Prometheus retention 改 7d
**Warning signs:** `docker stats` 显示容器内存接近 limit；`dmesg` 有 oom-killer 日志

### Pitfall 2: WatermelonDB 与 RN 0.76.8 兼容性

**What goes wrong:** WatermelonDB 0.28.0 的 native module 与项目 RN 版本不兼容
**Why it happens:** WatermelonDB 依赖 @nozbe/sqlite，需要 native module 编译
**How to avoid:** 安装后立即运行 `cd apps/mobile/android && ./gradlew assembleDebug` 验证编译。检查 WatermelonDB changelog 中 RN 0.76 支持状态
**Warning signs:** Metro bundler 启动报 native module 错误；Gradle 编译失败

### Pitfall 3: ICP 备案时间线阻塞上架

**What goes wrong:** ICP 备案需要 1-3 周，可能阻塞 Android 商店审核（部分商店要求备案号）
**Why it happens:** 中国大陆服务器 + .cn 域名必须 ICP 备案
**How to avoid:** D-02 立即启动 ICP 备案。同时准备服务器 IP 直连方案作为临时 fallback（商店审核可能接受 IP 地址）
**Warning signs:** 备案材料被退回；审核时间超过 3 周

### Pitfall 4: Android 签名密钥丢失

**What goes wrong:** release keystore 密码丢失或文件损坏，无法更新已上架应用
**Why it happens:** keystore 只生成一次，丢失后必须更换包名重新上架
**How to avoid:** 生成 keystore 后立即多处备份（加密 USB、密码管理器、Git secrets）。记录密码到安全位置
**Warning signs:** 只有一份 keystore 文件；密码仅记在一个人脑子里

### Pitfall 5: 离线同步冲突未处理

**What goes wrong:** 用户离线修改衣橱数据，上线同步时覆盖服务端更新
**Why it happens:** 双向同步必须处理"两端同时修改同一记录"的情况
**How to avoid:** 实现冲突解决策略（推荐: last-write-wins + is_dirty 标记）。D-12 要求衣橱双向同步
**Warning signs:** 同步后用户数据丢失；衣橱列表出现重复项

### Pitfall 6: Nginx 无 Rate Limiting 暴露 API

**What goes wrong:** 无限流保护，恶意请求可打崩后端
**Why it happens:** 当前 nginx.conf 未配置 limit_req_zone
**How to avoid:** 添加 rate limiting: `limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;`
**Warning signs:** 单个 IP 异常高频请求；后端 CPU 100%

## Code Examples

### Example 1: WatermelonDB Database 初始化

```typescript
// apps/mobile/src/database/index.ts
import { Database } from "@nozbe/watermelondb";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";
import { schema } from "./schema";
import { CachedRecommendation, WardrobeItem, CalendarPlan, UserProfile } from "./models";

const adapter = new SQLiteAdapter({
  schema,
  dbName: "xuno_offline",
  jsi: true, // 启用 JSI 提升性能
  onSetUpError: (error) => {
    console.error("[WatermelonDB] Setup failed:", error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [CachedRecommendation, WardrobeItem, CalendarPlan, UserProfile],
});
```

### Example 2: WatermelonDB 观察查询

```typescript
// apps/mobile/src/features/today/hooks/useOfflineRecommendations.ts
import { database } from "../../database";
import { Q } from "@nozbe/watermelondb";
import { CachedRecommendation } from "../../database/models/CachedRecommendation";
import { useObservable } from "../../hooks/useObservable";

const MAX_CACHE = 50;

export function useOfflineRecommendations(scenario?: string) {
  const query = database
    .get<CachedRecommendation>("cached_recommendations")
    .query(
      scenario ? Q.where("scenario", scenario) : Q.skip(0),
      Q.sortBy("cached_at", Q.desc),
      Q.take(MAX_CACHE)
    );

  const recommendations = useObservable(query.observe(), []);

  return { recommendations };
}
```

### Example 3: Nginx Rate Limiting (需添加到 nginx.conf)

```nginx
# 添加到 nginx.conf http 块或 server 块外
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=ai_limit:10m rate=10r/m;

# 在 location /api/ 中添加
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    # ... existing proxy_pass config
}

# 在 location /ai/ 中添加
location /ai/ {
    limit_req zone=ai_limit burst=5 nodelay;
    limit_req_status 429;
    # ... existing proxy_pass config
}
```

### Example 4: Docker Compose 内存压缩片段

```yaml
# docker-compose.production.yml 压缩后关键服务
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 1500M
        reservations:
          cpus: "0.5"
          memory: 512M

  qdrant:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 3072M # D-03: 从 8G 降至 3G
        reservations:
          cpus: "0.5"
          memory: 1G

  ai-service:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 768M # 不加载模型，仅 API 转发
        reservations:
          cpus: "0.25"
          memory: 256M

  backend:
    deploy:
      replicas: 1 # D-03: 从 2 降至 1
      resources:
        limits:
          cpus: "2"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 128M

  prometheus:
    command:
      - "--storage.tsdb.retention.time=7d" # D-03: 从 30d 降至 7d
```

## State of the Art

| Old Approach            | Current Approach            | When Changed | Impact                 |
| ----------------------- | --------------------------- | ------------ | ---------------------- |
| AsyncStorage 全量 JSON  | WatermelonDB 关系型离线存储 | Phase 10     | 支持复杂查询和双向同步 |
| 40G+ Docker 部署        | 8G 压缩部署                 | Phase 10     | 单机可运行，降低成本   |
| Let's Encrypt + xuno.ai | .cn 域名 + ICP 备案         | Phase 10     | 中国大陆合规           |
| 无 rate limiting        | Nginx limit_req             | Phase 10     | 防 API 滥用            |

**Deprecated/outdated:**

- `offline-cache.ts` (AsyncStorage 实现): 仅用于 demo 缓存，Phase 10 迁移到 WatermelonDB 后逐步废弃
- `xuno.ai` 域名路径: nginx.conf 中 TLS 证书路径需更新为 .cn 域名

## Assumptions Log

| #   | Claim                                                              | Section               | Risk if Wrong                         |
| --- | ------------------------------------------------------------------ | --------------------- | ------------------------------------- |
| A1  | WatermelonDB 0.28.0 兼容 React Native 0.76.8 和 Hermes 引擎        | Standard Stack        | 编译失败需降级 WDB 版本或寻找替代方案 |
| A2  | 腾讯云 4C8G 轻量应用服务器 ~100 元/月                              | User Constraints      | 预算超支                              |
| A3  | 小米开发者账号免费注册，审核 3-5 天                                | User Constraints      | 注册流程更复杂或审核时间更长          |
| A4  | 华为/OPPO/vivo 开发者账号需实名认证                                | User Constraints      | 认证流程时间超出预期                  |
| A5  | ICP 备案需 1-3 周                                                  | User Constraints      | 阻塞商店上架                          |
| A6  | k6 v0.57.0 是最新稳定版                                            | Standard Stack        | 版本差异导致脚本语法问题              |
| A7  | com.xuno.app 包名在所有 Android 商店可用                           | Standard Stack        | 包名被占用需修改                      |
| A8  | 8G 机器压缩后总 memory limit ~8.4G 可实际运行（limit != 实际使用） | Architecture Patterns | 容器被 OOM kill                       |
| A9  | 软著材料已在 Phase 6 准备完毕可直接使用                            | User Constraints      | 软著未就绪阻塞商店上架                |

## Open Questions (RESOLVED — addressed by Phase 10 plans)

1. **ICP 备案进度**

   - What we know: D-02 要求 .cn 域名 + ICP 备案
   - What's unclear: 域名是否已购买？备案是否已启动？
   - Recommendation: 如果未启动，Wave 1 首要任务；准备服务器 IP 直连 fallback

2. **软著状态**

   - What we know: docs/software-copyright/ 有申请材料
   - What's unclear: 软著是否已提交？是否已获批？
   - Recommendation: 确认软著进度，部分商店上架需要软著证书

3. **指导老师推荐信**

   - What we know: D-16 需用户提供内容方向
   - What's unclear: 用户何时提供信息
   - Recommendation: Wave 1 提醒用户准备，Wave 3 前完成

4. **Android 签名密钥管理**
   - What we know: 项目有 debug.keystore，无 release keystore
   - What's unclear: release keystore 生成策略和存储方案
   - Recommendation: Wave 1 生成 release keystore，加密备份到安全位置

## Environment Availability

| Dependency     | Required By     | Available               | Version     | Fallback                |
| -------------- | --------------- | ----------------------- | ----------- | ----------------------- |
| Docker         | 生产部署        | ✓                       | 29.4.0      | --                      |
| Docker Compose | 生产部署        | ✓                       | v5.1.1      | --                      |
| Node.js        | 构建/测试       | ✓                       | v24.14.0    | --                      |
| pnpm           | 依赖管理        | ✓                       | 10.32.1     | --                      |
| k6             | 负载测试        | ✗                       | --          | Artillery (npm install) |
| Artillery      | 负载测试备选    | ✗ (not installed)       | npm: 2.0.31 | pnpm add -D artillery   |
| pip-audit      | Python 安全审计 | ✗                       | --          | pip install pip-audit   |
| Android SDK    | APK 构建        | ✓ (android/ dir exists) | --          | --                      |
| Gradle         | APK 构建        | ✓ (gradlew exists)      | --          | --                      |
| OBS            | Demo 视频录制   | ?                       | --          | 剪映屏幕录制            |
| WatermelonDB   | 离线存储        | ✗ (not in deps)         | npm: 0.28.0 | -- (必须安装)           |

**Missing dependencies with no fallback:**

- WatermelonDB -- 必须安装，是离线能力的核心依赖
- k6 或 Artillery -- 必须安装一个用于负载测试

**Missing dependencies with fallback:**

- k6 -> Artillery (npm 即装即用，功能略弱但满足需求)
- pip-audit -> 手动 pip list + Snyk online scan
- OBS -> 剪映内置屏幕录制 / Android ADB screenrecord

## Validation Architecture

### Test Framework

| Property                     | Value                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| Framework (Backend)          | Jest 29.7 + @nestjs/testing 11.x                                |
| Framework (Mobile)           | Jest (babel-jest, RN preset)                                    |
| Framework (ML)               | pytest (asyncio_mode=auto)                                      |
| Config file (Backend)        | apps/backend/jest.config.js                                     |
| Config file (Mobile)         | apps/mobile/jest.config.js                                      |
| Config file (ML)             | ml/pyproject.toml [tool.pytest.ini_options]                     |
| Quick run command (Backend)  | `cd apps/backend && pnpm test -- --testPathPattern="<pattern>"` |
| Quick run command (Mobile)   | `cd apps/mobile && pnpm test -- --testPathPattern="<pattern>"`  |
| Quick run command (ML)       | `cd ml && python -m pytest ml/api/tests/<file> -x`              |
| Full suite command (Backend) | `cd apps/backend && pnpm test`                                  |
| Full suite command (Mobile)  | `cd apps/mobile && pnpm test`                                   |
| Full suite command (ML)      | `cd ml && python -m pytest`                                     |
| Existing test count          | Backend: 101 / Mobile: 43 / ML: 22                              |

### Phase Requirements -> Test Map

| Req ID | Behavior                          | Test Type   | Automated Command                                             | File Exists? |
| ------ | --------------------------------- | ----------- | ------------------------------------------------------------- | ------------ |
| PRD-01 | Nginx TLS + monitoring deployment | integration | Docker health check verification                              | ❌ Wave 0    |
| PRD-03 | WatermelonDB offline read/write   | unit        | `cd apps/mobile && pnpm test -- --testPathPattern="database"` | ❌ Wave 0    |
| PRD-03 | Offline sync engine               | unit        | `cd apps/mobile && pnpm test -- --testPathPattern="sync"`     | ❌ Wave 0    |
| PRD-03 | Network status detection          | unit        | `cd apps/mobile && pnpm test -- --testPathPattern="netinfo"`  | ❌ Wave 0    |
| PRD-04 | k6 load test passes thresholds    | integration | `k6 run tests/load/basic.js`                                  | ❌ Wave 0    |
| PRD-04 | npm audit no CRITICAL             | manual      | `pnpm audit --audit-level=critical`                           | N/A          |
| PRD-05 | APK builds successfully           | smoke       | `cd apps/mobile/android && ./gradlew assembleRelease`         | N/A          |
| CMP-08 | Seed data generation script       | unit        | `node scripts/generate-seed-data.test.js`                     | ❌ Wave 0    |

### Sampling Rate

- **Per task commit:** `cd apps/mobile && pnpm test -- --testPathPattern="<changed-area>"` (mobile) or `cd apps/backend && pnpm test -- --testPathPattern="<changed-area>"` (backend)
- **Per wave merge:** `pnpm test` (all workspaces)
- **Phase gate:** Full suite green + Docker stack healthy + APK build success + k6 thresholds pass

### Wave 0 Gaps

- [ ] `apps/mobile/src/database/__tests__/schema.test.ts` -- 验证 WatermelonDB schema 定义
- [ ] `apps/mobile/src/database/__tests__/syncEngine.test.ts` -- 验证同步引擎逻辑
- [ ] `apps/mobile/src/hooks/__tests__/useNetworkStatus.test.ts` -- 验证网络状态检测
- [ ] `tests/load/basic.js` -- k6 基础负载测试脚本
- [ ] `scripts/generate-seed-data.test.js` -- 种子数据生成脚本测试
- [ ] WatermelonDB install: `cd apps/mobile && pnpm add @nozbe/watermelondb` -- 核心依赖安装
- [ ] k6 install: `choco install k6` or `pnpm add -D artillery` -- 负载测试工具

## Security Domain

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                 |
| --------------------- | ------- | ---------------------------------------------------------------- |
| V2 Authentication     | yes     | JWT (NestJS PassportStrategy) + refresh token rotation           |
| V3 Session Management | yes     | Redis session store + JWT_ACCESS_EXPIRES_IN 15m                  |
| V4 Access Control     | yes     | NestJS Guards + RBAC decorators                                  |
| V5 Input Validation   | yes     | class-validator DTOs + Zod on mobile                             |
| V6 Cryptography       | yes     | TLS 1.2/1.3 (Nginx) + AES encryption (backend EncryptionService) |
| V7 Error Handling     | yes     | NestJS Exception Filters + React Error Boundaries                |
| V8 Data Protection    | yes     | PIPL compliance (Phase 6 decisions) + HTTPS in transit           |
| V9 Communications     | yes     | Nginx TLS + security headers (HSTS, CSP, X-Frame-Options)        |
| V10 Malicious Code    | partial | npm audit + pip audit dependency scanning                        |

### Known Threat Patterns for Production Deployment

| Pattern                     | STRIDE                 | Standard Mitigation                               |
| --------------------------- | ---------------------- | ------------------------------------------------- |
| API abuse / DDoS            | Denial of Service      | Nginx rate limiting + connection limits           |
| SQL Injection               | Tampering              | Prisma parameterized queries (ORM)                |
| JWT secret exposure         | Information Disclosure | Docker Secrets files (not env vars)               |
| Dependency vulnerabilities  | Tampering              | npm audit + pip audit + lockfile pinning          |
| Unencrypted data in transit | Spoofing               | TLS 1.2+ on all endpoints                         |
| Exposed debug ports         | Elevation of Privilege | Docker expose only (not ports), bind to 127.0.0.1 |
| Brute force login           | Spoofing               | Rate limiting + BruteForceDetected alert rule     |

## Sources

### Primary (HIGH confidence)

- npm registry -- WatermelonDB 0.28.0, @react-native-community/netinfo 12.0.1, Artillery 2.0.31 versions verified
- docker-compose.production.yml -- 12 service configs, memory limits, health checks (read directly)
- infrastructure/nginx/nginx.conf -- TLS, upstreams, security headers (read directly)
- monitoring/prometheus/prometheus.yml -- 5 scrape targets (read directly)
- monitoring/alerts/alert.rules.yml -- 12 alert rules in 2 groups (read directly)
- apps/mobile/src/services/offline-cache.ts -- existing offline cache implementation (read directly)
- apps/mobile/android/app/build.gradle -- Android build config, applicationId com.xuno.app (read directly)

### Secondary (MEDIUM confidence)

- CLAUDE.md -- tech stack versions (RN 0.76.8, NestJS 11.x, Prisma 5.x)
- REQUIREMENTS.md -- PRD-01~05, CMP-06~09 requirement definitions
- CONTEXT.md -- D-01~D-19 locked decisions from discuss phase

### Tertiary (LOW confidence)

- WatermelonDB schema/sync API -- Context7 fetch failed, based on training knowledge of v0.27+ API [ASSUMED]
- k6 scripting API -- Context7 fetch failed, based on training knowledge [ASSUMED]
- Android store-specific requirements (Xiaomi/Huawei/OPPO/vivo) -- web search hit rate limits [ASSUMED]
- ICP 备案具体流程 -- based on training knowledge of 2024-2025 流程 [ASSUMED]
- 腾讯云轻量应用服务器定价 -- based on training knowledge [ASSUMED]

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM - WatermelonDB/npm versions verified, k6/Android store details assumed
- Architecture: HIGH - docker-compose, nginx, monitoring configs directly read from codebase
- Pitfalls: MEDIUM - memory budget calculated from actual config, but runtime behavior on 8G machine unverified
- Offline capability: LOW-MEDIUM - WatermelonDB API usage based on training data, not verified against latest docs

**Research date:** 2026-04-26
**Valid until:** 2026-05-26 (stable infrastructure tools, 30 days)
