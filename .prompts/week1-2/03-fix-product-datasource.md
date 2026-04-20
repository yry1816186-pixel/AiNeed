# 任务03: 修复商品数据源（移除虚构API + 修复淘宝客签名）

## 你的角色

你是寻裳(AiNeed)项目的后端工程师。项目位于 C:\AiNeed，NestJS + Prisma。

## 背景

审计发现：

1. 得物API接口 `openapi.dewu.com` 不存在——得物没有公开商品搜索API
2. 淘宝客API签名使用过时的MD5方式，应升级为HMAC-SHA256
3. 搜索结果未持久化到数据库，每次调用都是实时请求
4. api4ai搜索返回空数组

## 任务

### 1. 读取当前数据源代码

读取以下文件理解现有实现：

- `apps/backend/src/domains/fashion/clothing/clothing-data-source.service.ts`
- 相关DTO文件

### 2. 移除得物API方法

找到所有与得物/dewu相关的代码：

- 删除 `searchFromDewu` 方法（或类似命名）
- 删除相关的配置项
- 从 `searchFromAllSources`（或类似聚合方法）中移除得物调用

### 3. 修复淘宝客API签名

找到淘宝客API的签名生成代码，将MD5签名替换为HMAC-SHA256：

```typescript
// 旧方式（MD5）— 删除
// const sign = md5(params + appSecret);

// 新方式（HMAC-SHA256）
import * as crypto from "crypto";

function generateTaobaoSign(params: Record<string, string>, appSecret: string): string {
  // 1. 按key字母排序
  const sortedKeys = Object.keys(params).sort();
  // 2. 拼接
  const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join("");
  // 3. HMAC-SHA256
  const sign = crypto
    .createHmac("sha256", appSecret)
    .update(paramString)
    .digest("hex")
    .toUpperCase();
  return sign;
}
```

### 4. 实现数据持久化

修改数据源搜索方法，在获取结果后写入数据库：

```typescript
async searchAndPersist(query: string, options: SearchOptions): Promise<ClothingItem[]> {
  // 1. 从API搜索
  const results = await this.searchFromTaobao(query, options);

  // 2. 转换为ClothingItem格式
  const items = results.map(r => this.mapTaobaoToClothingItem(r));

  // 3. UPSERT到数据库（按 externalId + source 去重）
  for (const item of items) {
    await this.prisma.clothingItem.upsert({
      where: {
        // 需要先在schema中添加唯一约束: @@unique([externalId, source])
        externalId_source: { externalId: item.externalId, source: item.source }
      },
      update: {
        price: item.price,
        originalPrice: item.originalPrice,
        salesCount: item.salesCount,
        images: item.images,
        mainImage: item.mainImage,
        updatedAt: new Date(),
      },
      create: item,
    });
  }

  return items;
}
```

**注意**：如果 ClothingItem 没有 `@@unique([externalId, source])`，需要先在 schema.prisma 中添加（如果任务02还没完成，先跳过upsert改用createMany + 去重检查）。

### 5. 修复京东联盟API

找到京东联盟相关代码，确认API方法名是否正确：

- 正确的方法名：`jd.union.open.goods.query`（商品搜索）
- 错误的方法名：`jd.union.open.goods.jingfen.query`（京粉API，不是搜索）

如果使用了错误的方法名，修正为正确的。

### 6. 淘宝客字段映射

确保以下字段映射正确：

| ClothingItem  | 淘宝客字段                       | 转换规则           |
| ------------- | -------------------------------- | ------------------ |
| name          | title                            | 直接映射           |
| price         | zk_final_price                   | 折后价，parseFloat |
| originalPrice | reserve_price                    | 原价，parseFloat   |
| images        | pict_url + small_images.string[] | 合并去重           |
| mainImage     | pict_url                         | 直接映射           |
| externalUrl   | item_url                         | 直接映射           |
| externalId    | num_iid                          | 加前缀 `tb_`       |
| source        | 硬编码 'taobao'                  | 固定值             |
| salesCount    | volume                           | 30天销量，parseInt |
| category      | 需通过类目映射                   | 见下方函数         |

实现淘宝客类目到 ClothingCategory 的映射函数：

```typescript
function mapTaobaoCategory(leafCategory: string): ClothingCategory {
  const mapping: Record<string, ClothingCategory> = {
    衬衫: "tops",
    T恤: "tops",
    毛衣: "tops",
    针织衫: "tops",
    卫衣: "tops",
    裤子: "bottoms",
    牛仔裤: "bottoms",
    半裙: "bottoms",
    短裤: "bottoms",
    连衣裙: "dresses",
    外套: "outerwear",
    风衣: "outerwear",
    羽绒服: "outerwear",
    大衣: "outerwear",
    鞋: "footwear",
    靴子: "footwear",
    配饰: "accessories",
    包: "accessories",
    运动服: "activewear",
    泳装: "swimwear",
  };
  for (const [keyword, category] of Object.entries(mapping)) {
    if (leafCategory.includes(keyword)) return category;
  }
  return "tops"; // 默认
}
```

## 验证标准

- [ ] 得物API相关代码完全移除
- [ ] 淘宝客签名改为HMAC-SHA256
- [ ] 搜索结果写入数据库（upsert或create+去重）
- [ ] 京东联盟API方法名正确
- [ ] 字段映射包含source字段（值为'taobao'/'jd'）
- [ ] 类型检查通过 `npx tsc --noEmit`
