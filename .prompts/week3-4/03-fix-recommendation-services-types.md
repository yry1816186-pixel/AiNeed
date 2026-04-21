# 任务: 修复推荐服务类型错误

## 项目路径

C:\AiNeed

## 上下文

推荐系统多个服务文件存在 TS 类型错误，主要是返回对象缺少必需字段。

## 编译命令

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep -E "(cold-start|collaborative|behavior-tracking|advanced-recommendation)" | head -40
```

## 需要修复的文件

### 1. cold-start.service.ts

路径: `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts`

错误 (line 113):

```
TS2322: Type '{ score: number; reason: string; }[]' is not assignable to type '{ itemId: string; score: number; reason: string; }[]'.
Property 'itemId' is missing
```

修复: 在返回对象中添加 `itemId` 字段。读取文件找到第 113 行附近的 return 语句，在 map 或对象构造中加入 itemId。

### 2. collaborative-filtering.service.ts

路径: `apps/backend/src/domains/platform/recommendations/services/collaborative-filtering.service.ts`

错误 1 (line 51):

```
TS2322: Type '{ similarity: number; }[]' is not assignable to type '{ similarUserId: string; similarity: number; }[]'.
Property 'similarUserId' is missing
```

错误 2 (line 87, 122):

```
TS2322: Type '{ score: number; }[]' is not assignable to type '{ itemId: string; score: number; }[]'.
Property 'itemId' is missing
```

错误 3 (line 244):

```
TS2322: Type '{ score: number; reasons: string[]; confidence: number; }[]' is not assignable to type 'RecommendationResult[]'.
Property 'itemId' is missing
```

修复: 在所有返回对象中添加缺失的 `similarUserId` 或 `itemId` 字段。这些字段值通常在循环变量中可用（如 `item.id`、`user.id` 等）。

### 3. behavior-tracking.service.ts

路径: `apps/backend/src/domains/platform/recommendations/services/behavior-tracking.service.ts`

错误 (line 191):

```
TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
Type 'null' is not assignable to type 'string'.
```

修复: 在传递前加 null 检查：

```typescript
// 之前: someFunction(nullableString)
// 之后: someFunction(nullableString ?? '') 或 if (!nullableString) return;
```

### 4. advanced-recommendation.service.ts

路径: `apps/backend/src/domains/platform/recommendations/services/advanced-recommendation.service.ts`

错误: 多处 `Cannot find name 'ClothingItem'` (TS2304) 和 `Cannot find name 'PrismaUserProfile'` (TS2304)

修复:

- 添加 `import { ClothingItem } from '@prisma/client';`（或从正确的类型文件导入）
- 添加 PrismaUserProfile 的导入

注意: 这个文件的 ClothingCategory 枚举冲突问题可能由另一个并行任务（02-fix-clothing-category-enum.md）处理。你只需要修复 ClothingItem 和 PrismaUserProfile 的导入问题。

## 修复方法

1. 读取每个文件
2. 找到错误行
3. 理解上下文（循环变量、可用数据）
4. 添加缺失字段
5. 用 Edit 工具修改

## 验证

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep -E "(cold-start|collaborative|behavior-tracking)" | wc -l
```

结果应该为 0。
