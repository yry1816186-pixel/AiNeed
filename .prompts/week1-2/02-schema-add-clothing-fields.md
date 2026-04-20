# 任务02: ClothingItem Schema补充关键字段 + 颜色标准化体系

## 你的角色

你是寻裳(AiNeed)项目的数据架构师。项目位于 C:\AiNeed，后端 NestJS + Prisma。

## 背景

安全审计发现 ClothingItem 模型缺少推荐算法必需的关键字段，颜色存储为 String[] 无法做色系匹配。

## 任务

### 1. Schema修改

读取 `apps/backend/prisma/schema.prisma`，找到 ClothingItem 模型（约第424-492行），做以下修改：

**新增字段**（在合适位置插入）：

```prisma
material       String[]              // 面料材质：["棉","涤纶","真丝"]
season         Season[]              // 适用季节
gender         Gender                // 适用性别
source         DataSource            // 数据来源
fit            FitPreference?        // 版型
pattern        String?               // 图案：纯色/条纹/格子/印花
neckline       String?               // 领型（上衣类）
sleeveLength   String?               // 袖长：无袖/短袖/五分/长袖
avgRating      Float        @default(0)  // 平均评分缓存
reviewCount    Int          @default(0)  // 评价数缓存
salesCount     Int          @default(0)  // 销量缓存
commissionRate Decimal?     @db.Decimal(5, 4)  // 联盟佣金率
detailHtml     String?      @db.Text    // 详情页HTML
```

**新增枚举**（在文件顶部枚举区域添加）：

```prisma
enum Season {
  spring
  summer
  autumn
  winter
  all_season
}

enum DataSource {
  taobao
  jd
  dewu
  api4ai
  manual
  import
}

enum FitPreference {
  slim
  regular
  loose
  oversized
}
```

注意 Gender 枚举可能已存在，检查后再决定是否新增。

### 2. 新增颜色标准化表

在 schema.prisma 末尾（最后一个 model 之前）添加：

```prisma
model ColorStandard {
  id          String   @id @default(uuid())
  name        String   @unique          // 标准中文名：黑色
  nameEn      String?                   // 英文名：Black
  hexCode     String                    // 色值：#000000
  colorFamily String                    // 色系：neutral/warm/cool
  isNeutral   Boolean  @default(false)  // 是否中性色

  itemColors  ItemColor[]

  @@index([colorFamily])
}

model ItemColor {
  id        String   @id @default(uuid())
  itemId    String
  colorId   String
  imageUrl  String?                // 该颜色的商品图片URL

  item      ClothingItem   @relation(fields: [itemId], references: [id], onDelete: Cascade)
  color     ColorStandard  @relation(fields: [colorId], references: [id], onDelete: Restrict)

  @@unique([itemId, colorId])
  @@index([itemId])
  @@index([colorId])
}
```

同时给 ClothingItem 添加关联：

```prisma
  itemColors  ItemColor[]
```

### 3. 新增数据同步支持表

```prisma
model PriceHistory {
  id            String   @id @default(uuid())
  itemId        String
  price         Decimal  @db.Decimal(10, 2)
  originalPrice Decimal? @db.Decimal(10, 2)
  source        String
  recordedAt    DateTime @default(now())

  item          ClothingItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([itemId, recordedAt(sort: Desc)])
}

model SyncLog {
  id           String    @id @default(uuid())
  source       DataSource
  jobType      String    // full/incremental/hot_refresh
  status       String    // running/completed/failed
  itemsFetched Int       @default(0)
  itemsCreated Int       @default(0)
  itemsUpdated Int       @default(0)
  itemsFailed  Int       @default(0)
  error        String?   @db.Text
  startedAt    DateTime  @default(now())
  completedAt  DateTime?

  @@index([source, startedAt(sort: Desc)])
  @@index([status])
}
```

### 4. 创建种子数据

创建 `apps/backend/prisma/seed-colors.ts`，包含30种标准颜色（覆盖 neutral/warm/cool 三大色系）：

基本色（neutral）：黑色、白色、灰色、米色、驼色、深蓝、藏青
暖色（warm）：红色、橙色、黄色、珊瑚色、酒红、砖红、棕色、卡其色、焦糖色
冷色（cool）：蓝色、天蓝、紫色、薰衣草、粉红、薄荷绿、湖蓝、翠绿
每种颜色提供：name, nameEn, hexCode, colorFamily, isNeutral

### 5. 运行迁移

```bash
cd apps/backend
npx prisma migrate dev --name add_clothing_fields_and_color_standard
```

如果迁移失败，检查是否有枚举冲突或字段名冲突。

## 验证标准

- [ ] schema.prisma 中 ClothingItem 有 material/season/gender/source 字段
- [ ] Season/DataSource/FitPreference 枚举已创建
- [ ] ColorStandard + ItemColor 模型已创建
- [ ] PriceHistory + SyncLog 模型已创建
- [ ] seed-colors.ts 创建并包含30种标准颜色
- [ ] `npx prisma migrate dev` 成功
