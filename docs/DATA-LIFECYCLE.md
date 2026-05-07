# 数据生命周期管理策略

本文档定义了 Xuneed 平台各类数据的保留期限、清理策略和合规要求。

---

## 1. 数据分类与保留期限

### 1.1 用户个人数据

| 数据类型     | 保留期限                | 说明                             |
| ------------ | ----------------------- | -------------------------------- |
| 用户账户信息 | 活跃期间 + 删除后 30 天 | 包括个人资料、偏好设置、登录凭证 |
| 用户上传内容 | 活跃期间 + 删除后 30 天 | 包括照片、穿搭记录、自定义内容   |
| 用户行为数据 | 2 年（去标识化后）      | 浏览记录、点击行为、搜索历史     |

**清理策略：**

- 账户删除请求后，进入 30 天冷却期
- 冷却期内可恢复账户
- 30 天后永久清除所有关联数据
- 行为数据去标识化后保留用于分析

### 1.2 AI 相关数据

| 数据类型         | 保留期限           | 说明                     |
| ---------------- | ------------------ | ------------------------ |
| AI 对话日志      | 90 天              | 包括造型师对话、推荐记录 |
| AI 模型输入/输出 | 30 天              | 用于质量监控和改进       |
| AI 会话上下文    | 7 天               | 用于维持对话连贯性       |
| 推荐模型训练数据 | 1 年（去标识化后） | 用于模型优化             |

**清理策略：**

- 每日定时任务清理过期日志
- 会话数据超过 7 天自动过期
- 训练数据去标识化后保留

### 1.3 业务数据

| 数据类型       | 保留期限 | 说明         |
| -------------- | -------- | ------------ |
| 订单数据       | 5 年     | 法律合规要求 |
| 支付记录       | 5 年     | 财务审计要求 |
| 退款记录       | 5 年     | 争议处理需要 |
| 优惠券使用记录 | 2 年     | 营销分析需要 |

### 1.4 系统数据

| 数据类型     | 保留期限 | 说明                 |
| ------------ | -------- | -------------------- |
| 系统日志     | 30 天    | 错误日志、访问日志   |
| 性能指标     | 90 天    | 监控数据、性能统计   |
| 安全审计日志 | 1 年     | 登录记录、安全事件   |
| 会话数据     | 7 天     | Redis 会话、临时状态 |

---

## 2. 存储生命周期策略

### 2.1 MinIO 对象存储

```yaml
# 用户上传内容生命周期
user-uploads:
  rules:
    - name: "temp-uploads"
      prefix: "temp/"
      expiration:
        days: 1

    - name: "user-photos"
      prefix: "photos/"
      expiration:
        days: 30 # 删除账户后30天

    - name: "ai-generated"
      prefix: "ai-output/"
      expiration:
        days: 30

# 系统临时文件
system-temp:
  rules:
    - name: "temp-processing"
      prefix: "processing/"
      expiration:
        hours: 24

    - name: "export-queue"
      prefix: "exports/"
      expiration:
        days: 7
```

### 2.2 Redis 缓存策略

```yaml
# 缓存 TTL 配置
cache-ttl:
  session: 7d # 用户会话
  user-profile: 1h # 用户资料缓存
  recommendations: 30m # 推荐结果
  ai-context: 7d # AI 上下文
  rate-limit: 24h # 速率限制计数器
  feature-flags: 5m # 特性开关
```

### 2.3 数据库软删除

所有用户相关数据使用软删除模式：

```prisma
model User {
  id        String   @id @default(cuid())
  // ... 其他字段
  deletedAt DateTime?  // 软删除时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**软删除清理流程：**

1. `deletedAt` 设置后，数据不再对用户可见
2. 定时任务扫描 `deletedAt` 超过 30 天的记录
3. 物理删除过期的软删除记录
4. 同步清理关联的存储对象

---

## 3. 定时清理任务

### 3.1 现有清理任务

| 任务                      | 调度       | 说明                   |
| ------------------------- | ---------- | ---------------------- |
| `cleanupOldNotifications` | 每日       | 清理 90 天前的已读通知 |
| `cleanupExpiredSessions`  | 每次访问时 | 清理过期的 AI 会话     |
| `cleanupExpiredCache`     | 每 5 分钟  | 清理过期的推荐缓存     |
| `cleanupExpiredItems`     | 每日       | 清理过期的衣橱物品     |

### 3.2 建议新增的清理任务

```typescript
// 用户数据清理任务
@Cron('0 3 * * *') // 每天凌晨3点
async cleanupDeletedUsers() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  // 查找超过30天的软删除用户
  const users = await this.prisma.user.findMany({
    where: {
      deletedAt: { lt: cutoff },
    },
  });

  for (const user of users) {
    await this.permanentlyDeleteUser(user.id);
  }
}

// AI 日志清理任务
@Cron('0 4 * * *') // 每天凌晨4点
async cleanupAILogs() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  await this.prisma.aiLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });
}

// 分析数据去标识化任务
@Cron('0 2 1 * *') // 每月1日凌晨2点
async anonymizeAnalyticsData() {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);

  // 将超过2年的分析数据去标识化
  await this.prisma.analytics.updateMany({
    where: {
      createdAt: { lt: cutoff },
      anonymized: false,
    },
    data: {
      userId: null,
      ip: null,
      userAgent: null,
      anonymized: true,
    },
  });
}
```

---

## 4. 合规要求

### 4.1 GDPR 合规

- **数据可携性**：用户可导出所有个人数据
- **被遗忘权**：用户可请求删除所有数据
- **数据最小化**：仅收集必要的数据
- **目的限制**：数据仅用于声明的目的

### 4.2 数据导出

用户可通过隐私设置页面请求数据导出：

```typescript
// 导出格式
interface DataExport {
  profile: UserProfile;
  wardrobe: WardrobeItem[];
  photos: PhotoMetadata[];
  recommendations: RecommendationHistory[];
  analytics: AnonymizedAnalytics;
}
```

### 4.3 数据删除确认

删除流程需记录审计日志：

```typescript
interface DeletionAuditLog {
  userId: string;
  requestedAt: Date;
  completedAt: Date;
  dataTypes: string[];
  confirmationHash: string;
}
```

---

## 5. 监控与告警

### 5.1 关键指标

- 待清理数据量
- 清理任务执行时间
- 清理失败次数
- 存储空间使用率

### 5.2 告警规则

```yaml
alerts:
  - name: "cleanup-task-failed"
    condition: "cleanup_errors > 0"
    severity: "warning"

  - name: "storage-usage-high"
    condition: "storage_usage > 80%"
    severity: "critical"

  - name: "cleanup-backlog"
    condition: "pending_cleanup > 10000"
    severity: "warning"
```

---

## 6. 实施检查清单

- [ ] 实现用户数据永久删除服务
- [ ] 添加 AI 日志清理定时任务
- [ ] 配置 MinIO 生命周期策略
- [ ] 实现分析数据去标识化任务
- [ ] 添加清理任务监控告警
- [ ] 实现数据导出功能
- [ ] 添加删除审计日志
- [ ] 测试清理流程完整性

---

_最后更新：2026-04-30_
_维护者：后端团队_
