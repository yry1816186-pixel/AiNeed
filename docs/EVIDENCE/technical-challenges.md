# 证据 3: 技术难题解决案例

> 展示从发现 → 分析 →AI 辅助 → 验证的真实技术难题解决过程

## 挑战 1: LLM 多提供商熔断与降级

### 发现

AI 造型师服务在调用智谱 AI GLM 时，偶尔出现超时或 503 错误。
单一提供商故障会导致整个对话功能不可用，用户体验极差。
首次发现是在集成测试中，模拟网络抖动时造型师服务直接返回 500。

### 分析过程

1. 分析 GLM API 的失败模式：超时（>30 秒）、限流（429）、服务不可用（503）
2. 评估了 3 种容错方案：
   - 简单重试（无法解决提供商级故障）
   - 轮询负载均衡（无法感知提供商健康状态）
   - 熔断器+降级链（最佳方案）
3. 确定熔断器参数：连续 5 次失败 → 熔断，60 秒后半开状态

### 解决方案

1. 实现了 4 个 LLM 提供商的统一接口：DeepSeek / Qwen / ZhipuAI GLM / OpenAI 兼容
2. 每个提供商独立熔断器，互不影响
3. 降级链：主提供商熔断 → 自动切换备用提供商
4. 半开状态：60 秒后允许 1 次试探请求，成功则恢复

### AI 的角色

- Claude 帮助设计了熔断器的状态机（Closed→Open→HalfOpen）
- 我决定了熔断器参数（5 次失败阈值、60 秒恢复时间）和降级顺序
- 代码实现由 AI 完成初稿，我审查并调整了错误分类逻辑

### 代码证据

`apps/backend/src/domains/ai-core/ai-stylist/llm-provider.service.ts`

```typescript
// 熔断器核心逻辑
private circuitBreakers: Map<string, CircuitBreaker> = new Map();
// 连续5次失败后熔断
private readonly FAILURE_THRESHOLD = 5;
// 60秒后半开
private readonly RECOVERY_TIMEOUT = 60000;
```

---

## 挑战 2: 体型分析的阈值配置与深度合并

### 发现

体型分析使用 MediaPipe 提取 33 个身体关键点，然后根据肩宽/腰宽/臀宽比例判断体型。
但不同用户拍照角度、距离不同，固定阈值导致误判率高。
最初硬编码的阈值在测试集上只有 65%准确率。

### 分析过程

1. 收集了 50+张不同角度的全身照测试数据
2. 发现 3 个核心问题：
   - 正面照和侧面照的关键点提取差异大
   - 不同身高的人，绝对阈值不适用
   - 部分覆盖阈值需要微调，而非全量替换
3. 评估了配置方案：
   - 环境变量（简单但不支持嵌套结构）
   - 配置文件（灵活但需要解析）
   - 构造参数+环境变量+默认值三级优先级

### 解决方案

1. 实现了三级阈值配置优先级：构造参数 > 环境变量 `BODY_TYPE_THRESHOLDS_JSON` > 默认值
2. 深度合并策略：支持部分覆盖，未指定的阈值保留默认值
3. 5 种体型分类：H 型(矩形) / X 型(沙漏) / A 型(梨形) / Y 型(倒三角) / O 型(椭圆)

### AI 的角色

- Claude 帮助实现了深度合并算法（递归合并嵌套对象）
- 我设计了三级优先级策略和 5 种体型的阈值范围
- 阈值调优是我根据测试数据手工完成的

### 代码证据

`ml/services/analysis/body_analyzer.py`

```python
# 三级优先级配置
# 1. 构造参数 2. 环境变量 BODY_TYPE_THRESHOLDS_JSON 3. 默认值
def _deep_merge(base: dict, override: dict) -> dict:
    """深度合并：override中的键覆盖base，未指定的保留base"""
    ...

# 5种体型分类
BODY_TYPES = ['rectangle', 'hourglass', 'pear', 'inverted_triangle', 'oval']
```

---

## 挑战 3: 对话状态降级策略

### 发现

AI 造型师对话依赖 Redis 存储上下文（历史消息、提取的关键词、意图状态）。
当 Redis 不可用时，对话服务直接报错，用户无法继续对话。

### 分析过程

1. 分析了对话上下文的数据结构：包含 sessionId、消息列表、关键词、意图、置信度
2. 评估了 3 种降级方案：
   - 内存缓存（单实例可用，多实例不一致）
   - 数据库存储（延迟高，不适合实时对话）
   - 优雅降级（Redis 失败返回空上下文，对话从头开始）

### 解决方案

1. 实现了优雅降级策略：Redis 读取失败时返回空 `DialogContextDto`
2. 对话服务检测到空上下文后，重新构建对话（相当于新会话）
3. 用户感知：对话可能丢失前几轮的上下文，但不会报错
4. Key 格式: `dialog:context:{sessionId}`，TTL: 3600 秒

### AI 的角色

- Claude 帮助实现了 Redis 连接失败的异常捕获和降级逻辑
- 我决定了降级行为（返回空上下文而非报错）和 TTL 时长
- 降级策略的权衡是我做的：宁可丢失上下文也不能阻塞用户

### 代码证据

`apps/backend/src/domains/ai-core/ai-stylist/dialog-state.service.ts`

```typescript
async getContext(sessionId: string): Promise<DialogContextDto> {
  try {
    const data = await this.redis.get(`dialog:context:${sessionId}`);
    return data ? JSON.parse(data) : this.createEmptyContext();
  } catch {
    // 降级：Redis不可用时返回空上下文
    return this.createEmptyContext();
  }
}
```
