# 任务: 修复 social、security、commerce 模块 TS 错误

## 项目路径

C:\AiNeed

## 上下文

social、security、commerce 等模块存在多种 TS 类型错误。

## 编译命令

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep -E "(social/|security/|commerce/)" | head -40
```

## 需要修复的文件

### 1. blogger-score.service.ts

路径: `apps/backend/src/domains/social/blogger/blogger-score.service.ts`

错误 (line 33):

```
TS2345: Prisma middleware type mismatch - params type incompatible with MiddlewareParams
```

修复: 使用类型断言绕过 Prisma 严格的 middleware 类型：

```typescript
// 之前:
prisma.$use(async (params: Record<string, unknown>, next: ...) => { ... })
// 之后:
prisma.$use(async (params: any, next: (params: any) => Promise<any>) => { ... })
```

错误 (line 39):

```
TS2339: Property 'data' does not exist on type '{}'.
```

修复: 在 params 类型断言为 any 后自然解决，或用 `(params as any).data`

### 2. consultant-review.service.ts

路径: `apps/backend/src/domains/social/consultant/consultant-review.service.ts`

错误 (line 177):

```
TS2693: 'any' only refers to a type, but is being used as a value here.
```

修复: 找到使用 `any` 作为值（而非类型）的代码，可能是误写。常见情况是 `catch(e: any)` 在旧版 TS 中的写法或 `x instanceof any`。改为正确的值表达式。

### 3. consultant.service.ts

路径: `apps/backend/src/domains/social/consultant/consultant.service.ts`

错误 (line 52, 54, 55):

```
TS2322: Type 'Record<string, unknown>' is not assignable to type 'JsonNull | InputJsonValue'.
```

修复: 使用类型断言 `as any` 或 `JSON.parse(JSON.stringify(data))`:

```typescript
// 之前: someField: recordData
// 之后: someField: recordData as any
// 或:   someField: JSON.parse(JSON.stringify(recordData))
```

### 4. prisma-encryption-middleware.service.ts

路径: `apps/backend/src/modules/security/encryption/prisma-encryption-middleware.service.ts`

错误: 多个 Prisma middleware 类型不匹配 (TS2345, TS2538, TS2339)

修复: 和 blogger-score.service.ts 类似，使用 `any` 类型断言：

```typescript
prisma.$use(async (params: any, next: (p: any) => Promise<any>) => {
  // params.data, params.args 等都可以直接访问
});
```

### 5. commerce 模块

路径: `apps/backend/src/domains/commerce/` 下的文件

可能有类型错误，读取编译输出来确认，然后按相同方式修复。

### 6. 其他文件

编译输出中还有其他文件的错误，逐个修复。

## 验证

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep -E "(social/|security/|commerce/)" | wc -l
```

结果应该为 0。
