# 任务: 数据库种子数据与 Schema 完善

## 项目路径

C:\AiNeed

## 上下文

Prisma schema 已通过验证，但种子数据需要完善以确保推荐系统能正常工作。

## 步骤

### 1. 检查现有种子文件

```bash
ls -la /c/AiNeed/apps/backend/prisma/seeds/
ls -la /c/AiNeed/apps/backend/prisma/seed*.ts
```

### 2. 检查 Prisma schema 中的关键字段

```bash
cd /c/AiNeed/apps/backend && grep -n "model ClothingItem" prisma/schema.prisma
cd /c/AiNeed/apps/backend && sed -n '/model ClothingItem/,/^}/p' prisma/schema.prisma
```

确认 Week 1-2 的 schema 修复是否已应用:

- `material` 字段 (面料)
- `season` 字段 (季节)
- `gender` 字段 (性别)
- `source` 字段 (数据来源: taobao/jd/manual)
- `RecommendationImpression` 表是否存在

### 3. 创建/完善种子数据

如果种子数据不足（< 100 件商品），需要补充:

#### 3.1 用户数据 (至少 10 个)

- 不同体型、肤色、色彩季型
- 有偏好设置的用户（用于推荐测试）

#### 3.2 商品数据 (至少 200 件)

- 覆盖所有 ClothingCategory
- 包含 material, season, gender, source 字段
- 有合理的价格区间
- 有品牌信息

#### 3.3 时尚规则数据

- body_type_rules (体型规则)
- color_season_rules (色彩规则)
- weather_outfit_rules (天气规则)

#### 3.4 推荐测试数据

- UserBehaviorEvent (用户行为)
- StyleQuizResult (问卷结果)

### 4. 运行种子脚本

```bash
cd /c/AiNeed/apps/backend
npx prisma db seed
```

如果 seed 命令报错，检查:

- `package.json` 中的 `prisma.seed` 配置
- ts-node 是否可用
- 数据库连接是否正常

### 5. 验证数据

```bash
cd /c/AiNeed/apps/backend
npx prisma studio  # 打开 Prisma Studio 查看数据
```

或用 SQL:

```bash
npx prisma db execute --stdin <<'SQL'
SELECT COUNT(*) FROM "ClothingItem";
SELECT COUNT(*) FROM "UserProfile";
SELECT COUNT(*) FROM "Brand";
SQL
```

### 6. 输出

- 种子数据统计（各表行数）
- 缺失的数据类型
- 需要额外创建的种子脚本
