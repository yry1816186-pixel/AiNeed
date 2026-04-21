# 任务: 修复 ClothingCategory 枚举冲突

## 项目路径

C:\AiNeed

## 上下文

项目有两套 ClothingCategory 枚举定义，导致大量 TS2322/TS2345 类型不兼容错误：

1. **手动定义**: `apps/backend/src/types/prisma-enums.ts` — 值为 `tops`, `bottoms`, `dresses`, `outerwear`, `footwear`, `accessories`, `activewear`, `swimwear`
2. **Prisma 生成**: `node_modules/.prisma/client/index.d.ts` 中的 `$Enums.ClothingCategory`

TypeScript 认为这两个类型不兼容，即使值相同。

## 编译命令

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep "ClothingCategory"
```

## 修复方案

### 方案 A（推荐）: 修改 prisma-enums.ts 为 Prisma 重新导出

将 `apps/backend/src/types/prisma-enums.ts` 中的所有枚举改为从 Prisma Client 重新导出：

```typescript
// Re-export Prisma-generated enums
export type {
  ClothingCategory,
  CouponType,
  UserCouponStatus,
  // ... 列出所有在代码中被外部引用的枚举
} from "@prisma/client";

// 保留自定义接口
export interface PrismaUserProfile {
  // ... 保持不变
}
```

**但要注意**: 检查 Prisma schema (`apps/backend/prisma/schema.prisma`) 中的枚举值是否和 prisma-enums.ts 中的值完全一致。如果 Prisma 生成的枚举使用大写值（如 `TOPS`）而手动定义使用小写（如 `tops`），则不能直接重新导出。

### 方案 B: 在消费端统一使用 Prisma 类型

在所有引用 `ClothingCategory` 的文件中，改为从 `@prisma/client` 导入，而不是从 `prisma-enums.ts` 导入。

受影响的文件：

- `apps/backend/src/domains/platform/recommendations/services/advanced-recommendation.service.ts`
- `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts`
- `apps/backend/src/domains/platform/recommendations/services/collaborative-filtering.service.ts`
- 以及所有引用 `ScoredItem` 接口的文件（因为 ScoredItem 包含 category: ClothingCategory 字段）

## 具体步骤

1. 先读 `apps/backend/prisma/schema.prisma` 中的 enum ClothingCategory 定义，确认值
2. 搜索所有从 `prisma-enums` 导入 ClothingCategory 的文件:
   ```bash
   grep -rn "from.*prisma-enums" apps/backend/src/ | grep -i "clothing\|category"
   ```
3. 搜索所有 ScoredItem 接口定义和引用
4. 统一为一种类型来源
5. 修复后验证编译通过

## 验证

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep "ClothingCategory\|ScoredItem" | wc -l
```

结果应该为 0。
