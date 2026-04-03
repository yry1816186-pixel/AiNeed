# 云端虚拟试衣集成方案

## 概述

由于本地 IDM-VTON 模型需要 26GB+ 内存，当前开发环境无法运行。本文档描述如何集成云端虚拟试衣 API 作为替代方案。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    TryOnOrchestratorService                  │
│                      (自动选择可用 Provider)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  KolorsProvider │  │ReplicateProvider│  │ FashnProvider│ │
│  │  (快手云服务)    │  │ (Replicate API) │  │ (Fashn API) │ │
│  │   Priority: 1   │  │   Priority: 2   │  │ Priority: 3 │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┼───────────────────┘        │
│                                │                            │
│                    ┌───────────▼───────────┐                │
│                    │   IDMVTONProvider     │                │
│                    │   (本地模型 - 备选)    │                │
│                    │   Priority: 99        │                │
│                    └───────────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Provider 优先级

| Provider | 优先级 | 特点 | 费用 |
|----------|--------|------|------|
| Kolors | 1 | 国内服务，延迟低 | ¥0.1-0.5/次 |
| Replicate | 2 | 国际服务，模型多 | $0.01-0.05/次 |
| Fashn | 3 | 专业虚拟试衣 | $0.02-0.1/次 |
| IDM-VTON | 99 | 本地模型 | 免费（需高配硬件）|

## 配置方式

### 1. Kolors API（推荐）

```env
# apps/backend/.env
KOLORS_API_KEY=your-kolors-api-key
KOLORS_API_ENDPOINT=https://api.kolors.kuaishou.com/v1/try-on
KOLORS_TIMEOUT=60000
```

**获取方式：** https://kolors.kuaishou.com/

### 2. Replicate API

```env
# apps/backend/.env
REPLICATE_API_TOKEN=r8_xxx
REPLICATE_TRYON_MODEL=cuuupid/idm-vton:c8a2c5b...
```

**获取方式：** https://replicate.com/

### 3. Fashn API

```env
# apps/backend/.env
FASHN_API_KEY=your-fashn-api-key
FASHN_TIMEOUT=90000
```

**获取方式：** https://fashn.ai/

## 代码实现

### TryOnProvider 接口

```typescript
// apps/backend/src/modules/try-on/services/ai-tryon-provider.interface.ts

export interface TryOnProvider {
  readonly name: string;
  readonly priority: number;
  isAvailable(): Promise<boolean>;
  virtualTryOn(request: TryOnRequest): Promise<TryOnResponse>;
}

export interface TryOnRequest {
  personImageUrl: string;
  garmentImageUrl: string;
  category?: 'upper_body' | 'lower_body' | 'full_body' | 'dress';
  hd?: boolean;
}

export interface TryOnResponse {
  resultImageUrl: string;
  processingTime?: number;
  confidence?: number;
  provider: string;
  metadata?: Record<string, unknown>;
}
```

### 自动 Fallback 机制

```typescript
// TryOnOrchestratorService 自动选择可用 Provider

async executeTryOn(request: TryOnRequest): Promise<TryOnResponse> {
  for (const provider of this.providers) {
    if (await provider.isAvailable()) {
      try {
        return await provider.virtualTryOn(request);
      } catch (error) {
        // 自动尝试下一个 Provider
        continue;
      }
    }
  }
  throw new Error('No try-on providers available');
}
```

## 缓存策略

为节省 API 调用费用，系统会缓存试衣结果：

```typescript
// 缓存配置
TRYON_CACHE_ENABLED=true
TRYON_CACHE_TTL=86400  // 24小时
```

缓存键基于用户照片和服装图片的 SHA256 哈希。

## 错误处理

| 错误类型 | 处理方式 |
|----------|----------|
| API Key 未配置 | 跳过该 Provider |
| 网络超时 | 自动重试或切换 Provider |
| 图片格式错误 | 返回 400 错误 |
| 所有 Provider 不可用 | 返回 503 错误 |

## 费用控制

### 预算监控

```typescript
// 建议添加费用监控中间件
@Injectable()
export class TryOnCostMonitor {
  private dailySpend = 0;
  private readonly dailyLimit = 100; // 元

  async checkBudget(): Promise<boolean> {
    return this.dailySpend < this.dailyLimit;
  }
}
```

### 用户配额

```typescript
// 用户级别配额控制
const USER_QUOTA = {
  free: 3,      // 免费用户每日 3 次
  premium: 20,  // 会员用户每日 20 次
  unlimited: -1 // 无限制
};
```

## 测试验证

### 单元测试

```bash
# 测试 Provider 可用性
pnpm --filter @aineed/backend test try-on
```

### 集成测试

```bash
# 启动后端
cd apps/backend && pnpm dev

# 测试试衣 API
curl -X POST http://localhost:3001/api/v1/try-on \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "personImageUrl": "https://example.com/person.jpg",
    "garmentImageUrl": "https://example.com/garment.jpg",
    "category": "upper_body"
  }'
```

## 监控与告警

### 关键指标

- Provider 可用性
- 平均响应时间
- 成功率
- 每日调用量
- 费用消耗

### 告警规则

```yaml
alerts:
  - name: TryOnProviderDown
    condition: all_providers_unavailable
    severity: critical

  - name: TryOnHighLatency
    condition: avg_response_time > 30s
    severity: warning

  - name: TryOnBudgetExceeded
    condition: daily_spend > daily_limit
    severity: warning
```

## 迁移路径

### 阶段 1：云端 API（当前）

- 使用 Kolors/Replicate/Fashn 云端 API
- 快速上线，零硬件投入
- 按使用量付费

### 阶段 2：混合模式

- 高频用户使用云端 API
- 低频用户使用本地简化模型
- 成本优化

### 阶段 3：本地部署（可选）

- 采购高配服务器后
- 部署完整 IDM-VTON 模型
- 零边际成本

---

*最后更新：2026-03-20*
