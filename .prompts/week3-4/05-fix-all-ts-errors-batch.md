# 任务: 修复所有剩余 TypeScript 编译错误（综合修复）

## 项目路径

C:\AiNeed

## 上下文

后端目前有约 138 个 TS 编译错误。本任务要求全部修复，使 `tsc --noEmit` 零错误。

## 编译命令

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1
```

## 错误分类与修复策略

### 类别 1: TS2307 — 找不到模块 (约 27 个)

原因: import 路径层级错误（太多或太少 `../`）。

正确的模块位置:

- Prisma service: 从任何位置 `src/common/prisma/prisma.service` 或计算相对路径
- Redis service: `src/common/redis/redis.service`
- Prisma module: `src/common/prisma/prisma.module`
- AI integration: `src/domains/ai-core/ai/services/ai-integration.service`
- AI module: `src/domains/ai-core/ai/ai.module`
- Event bus: `src/domains/social/ws/services/event-bus.service`
- WS events: `src/domains/social/ws/events`

示例修复:

```typescript
// 错误: import { PrismaService } from '../../../../../../../common/prisma/prisma.service';
// 修正: 从文件实际位置计算正确的 ../ 数量

// 文件在 src/domains/platform/recommendations/services/recommendation-cache.service.ts
// 目标在 src/common/prisma/prisma.service
// 路径: ../../../../common/prisma/prisma.service (从 services/ 回到 src/ 需要4层)
```

### 类别 2: ClothingCategory 枚举冲突 (约 30 个)

原因: `src/types/prisma-enums.ts` 定义的枚举和 Prisma 生成的 `$Enums.ClothingCategory` 是不同的类型。

修复: 修改 `prisma-enums.ts`，将手动枚举替换为 Prisma 重新导出:

```typescript
// 删除手动 enum 定义，改为:
export type { ClothingCategory, BodyType /* 其他需要的枚举 */ } from "@prisma/client";
```

**前提**: 先检查 `apps/backend/prisma/schema.prisma` 中 enum 的值是否和手动定义一致。Prisma 枚举通常用小写（如 `tops`）或大写（如 `TOPS`），必须确认匹配。

如果值不匹配，则在消费端改为统一从 `@prisma/client` 导入。

### 类别 3: 缺少字段 (约 10 个)

cold-start.service.ts 和 collaborative-filtering.service.ts 返回对象缺少必需字段:

- 缺少 `itemId` → 在 map 回调中添加 `itemId: item.id`（或类似的唯一标识）
- 缺少 `similarUserId` → 添加 `similarUserId: user.id`

### 类别 4: Prisma middleware 类型不匹配 (约 15 个)

blogger-score.service.ts 和 prisma-encryption-middleware.service.ts:

```typescript
// 修复: 使用 any 断言
prisma.$use(async (params: any, next: (params: any) => Promise<any>) => {
  const result = await next(params);
  return result;
});
```

### 类别 5: JSON 类型不匹配 (约 5 个)

consultant.service.ts 的 `Record<string, unknown>` 不能赋值给 `InputJsonValue`:

```typescript
// 修复: 使用 JSON 序列化
someField: JSON.parse(JSON.stringify(data)) as any;
```

### 类别 6: 隐式 any (约 5 个)

添加显式类型注解。

### 类别 7: 其他类型错误

按具体情况逐个修复。

## 执行步骤

1. 先运行编译命令获取当前所有错误
2. 按类别批量修复（先处理枚举冲突和模块路径，这两个修好了能消除一半错误）
3. 每修完一个类别，重新编译检查进度
4. 重复直到零错误

## 验证

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep "^apps/" | wc -l
```

结果必须为 0。
