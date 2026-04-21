# 任务: Admin 管理面板编译修复

## 项目路径

C:\AiNeed

## 上下文

项目包含 admin 管理面板，位于 `apps/admin/`。需要确认它能编译运行。

## 步骤

### 1. 检查 admin 项目结构

```bash
ls /c/AiNeed/apps/admin/
cat /c/AiNeed/apps/admin/package.json | head -40
```

### 2. 编译检查

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/admin/tsconfig.json --noEmit 2>&1 | head -50
```

### 3. 修复编译错误

常见问题:

- 缺少类型定义
- import 路径错误
- 依赖包缺失

### 4. 构建测试

```bash
cd /c/AiNeed/apps/admin && pnpm build 2>&1 | tail -20
```

### 5. 验证

编译零错误，构建成功。
