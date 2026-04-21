# 任务: 后端测试运行与修复

## 项目路径

C:\AiNeed

## 前置条件

- TypeScript 编译零错误
- 数据库服务运行中 (docker-compose up -d)
- 种子数据已加载

## 步骤

### 1. 运行所有后端测试

```bash
cd /c/AiNeed/apps/backend
node ../../node_modules/jest/bin/jest.js --passWithNoTests 2>&1 | tail -80
```

或:

```bash
cd /c/AiNeed && pnpm --filter @xuno/backend test 2>&1 | tail -80
```

### 2. 分析测试结果

预期会有以下情况:

- 部分测试通过 ✅
- 部分测试因类型/导入错误失败 ❌
- 部分测试需要数据库连接 ❌

### 3. 修复失败的测试

对每个失败测试:

1. 查看错误信息
2. 判断失败原因:
   - **类型错误**: 修复 mock 类型或测试中的类型
   - **导入错误**: 修正测试文件的 import 路径
   - **运行时错误**: 修复服务逻辑或 mock
   - **缺少 mock**: 补充 PrismaService / RedisService 等 mock

#### 常用 mock 模式:

```typescript
// PrismaService mock
const mockPrismaService = {
  user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  clothingItem: { findMany: jest.fn(), findUnique: jest.fn() },
  $queryRaw: jest.fn(),
  $transaction: jest.fn((fn) => fn(mockPrismaService)),
};

// RedisService mock
const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};
```

### 4. 关键服务测试优先级

#### P0 - 必须通过:

- auth.service.spec.ts (认证)
- recommendations.service.spec.ts (推荐)
- try-on.service.spec.ts (试穿)

#### P1 - 应该通过:

- clothing.service.spec.ts (商品)
- cart.service.spec.ts (购物车)
- order.service.spec.ts (订单)
- style-quiz.service.spec.ts (风格测试)

#### P2 - 尽量通过:

- 其余所有 .spec.ts 文件

### 5. 运行覆盖率

```bash
cd /c/AiNeed/apps/backend
node ../../node_modules/jest/bin/jest.js --coverage --passWithNoTests 2>&1 | tail -50
```

目标:

- 核心服务 ≥ 80%
- 全局 ≥ 60%

### 6. 输出

- 通过/失败/跳过的测试数量
- 覆盖率数据
- 需要进一步修复的测试列表
