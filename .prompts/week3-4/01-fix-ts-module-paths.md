# 任务: 修复 TS2307 模块路径错误

## 项目路径

C:\AiNeed

## 上下文

后端有 27 个 TS2307 错误（找不到模块），都是因为相对路径写错了。后端源码根目录是 `apps/backend/src/`。

## 现有目录结构确认

- `src/common/prisma/` → prisma.service.ts, prisma.module.ts
- `src/common/redis/` → redis.service.ts, redis.module.ts
- `src/common/interceptors/` → cache.interceptor.ts
- `src/domains/ai-core/ai/` → ai-integration.service.ts, ai.module.ts
- `src/domains/social/ws/services/` → event-bus.service.ts
- `src/domains/social/ws/` → events.ts

## 编译命令

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep "TS2307"
```

## 需要修复的文件和错误

### 1. cache.interceptor.ts

错误: 找不到某些模块
修复: 检查实际 import 路径，修正相对路径

### 2. clothing.controller.spec.ts

错误: 找不到测试依赖模块
修复: 修正测试文件的 import 路径

### 3. clothing.dto.ts

错误: 找不到类型定义
修复: 使用正确的类型导入路径

### 4. visual-search.service.ts

错误: 找不到模块
修复: 修正 import 路径

### 5. search.types.ts

错误: 找不到模块
修复: 修正 import 路径

### 6. style-quiz.service.ts

错误: 找不到模块
修复: 修正 import 路径

### 7. user-profile.service.ts

错误: 找不到模块
修复: 修正 import 路径

### 8. admin-community.controller.ts

错误: 找不到模块
修复: 修正 import 路径

### 9. admin.module.ts

错误: 找不到模块
修复: 修正 import 路径

### 10. admin-dashboard.service.ts

错误: 找不到模块
修复: 修正 import 路径

### 11. recommendations.module.ts

错误: 找不到模块
修复: 修正 import 路径

### 12. recommendation-cache.service.ts

错误: `Cannot find module '../../../../../../../common/prisma/prisma.service'`
修复: 路径层级太多，需要计算正确的相对路径

### 13. unified-recommendation.engine.ts

错误: 找不到 `prisma.service` 和 `ai-integration.service`
修复: 修正两个 import 路径

### 14. content.module.ts

错误: 找不到 `prisma.module` 和 `ai.module`
修复: 修正 import 路径

### 15. chat.gateway.ts

错误: 找不到 `redis.service`, `prisma.service`, `event-bus.service`, `events`
修复: 修正所有 import 路径

## 修复方法

对每个文件：

1. 读取文件内容，找到失败的 import 行
2. 确定文件所在目录
3. 计算从当前目录到目标模块的正确相对路径
4. 用 Edit 工具修正 import

## 验证

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/backend/tsconfig.json --noEmit 2>&1 | grep "TS2307" | wc -l
```

结果应该为 0。
