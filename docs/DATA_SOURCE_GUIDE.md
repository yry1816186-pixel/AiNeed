# 服装数据源接入指南

本文档说明如何申请和配置各服装电商开放平台 API。

## 一、支持的数据源

| 平台 | 类型 | 优先级 | 数据量 | 申请难度 |
|------|------|--------|--------|----------|
| 淘宝联盟 | 综合电商 | 1 | 最大 | 中等 |
| 京东联盟 | 综合电商 | 2 | 大 | 中等 |
| 得物开放平台 | 潮流服饰 | 3 | 中等 | 较高 |
| api4.ai | 服装检测 | 4 | N/A | 简单 |

## 二、淘宝联盟 API

### 2.1 申请条件

1. **淘宝账号**: 需实名认证
2. **支付宝账号**: 用于结算佣金
3. **开发者类型**: 个人或企业均可
4. **审核时间**: 1-3 个工作日

### 2.2 申请流程

```bash
# 步骤 1: 注册淘宝联盟账号
访问: https://union.taobao.com
完成实名认证 + 支付宝绑定

# 步骤 2: 申请淘宝客权限
在"推广管理"中申请淘宝客权限
签署推广协议

# 步骤 3: 创建开发者应用
访问: https://open.taobao.com
创建应用 → 选择"淘宝客"类目
获取 App Key 和 App Secret

# 步骤 4: 申请接口权限
在应用管理中申请以下接口:
- taobao.tbk.item.search (商品搜索)
- taobao.tbk.item.info.get (商品详情)
- taobao.tbk.item.recommend.get (商品推荐)
```

### 2.3 配置环境变量

```env
# 淘宝联盟 API
TAOBAO_APP_KEY=your_app_key_here
TAOBAO_APP_SECRET=your_app_secret_here
```

### 2.4 接口说明

| 接口 | 功能 | 限流 |
|------|------|------|
| taobao.tbk.item.search | 商品搜索 | 30次/分钟/IP |
| taobao.tbk.item.info.get | 商品详情 | 30次/分钟/IP |
| taobao.tbk.item.recommend.get | 商品推荐 | 30次/分钟/IP |

### 2.5 返回数据字段

- 商品ID (num_iid)
- 商品名称 (title)
- 商品主图 (pict_url)
- 商品价格 (reserve_price, zk_final_price)
- 商品销量 (volume)
- 店铺名称 (shop_title)
- 商品类目 (cat_name)
- 商品品牌 (brand_name)
- 商品链接 (item_url)

## 三、京东联盟 API

### 3.1 申请条件

1. **京东账号**: 需实名认证
2. **企业资质**: 营业执照 (个人开发者权限有限)
3. **审核时间**: 3-5 个工作日

### 3.2 申请流程

```bash
# 步骤 1: 注册京东联盟账号
访问: https://union.jd.com
完成实名认证

# 步骤 2: 创建开发者应用
访问: https://open.jd.com
创建应用 → 选择"京东联盟"类目
获取 App Key 和 App Secret

# 步骤 3: 申请接口权限
申请以下接口:
- jd.union.open.goods.jingfen.query (商品查询)
- jd.union.open.goods.promotiongoodsinfo.query (商品详情)
```

### 3.3 配置环境变量

```env
# 京东联盟 API
JD_APP_KEY=your_app_key_here
JD_APP_SECRET=your_app_secret_here
```

## 四、得物开放平台 API

### 4.1 申请条件

1. **企业资质**: 必须为企业账号
2. **营业执照**: 需上传企业营业执照
3. **审核时间**: 5-7 个工作日

### 4.2 申请流程

```bash
# 步骤 1: 注册得物开放平台账号
访问: https://open.dewu.com
完成企业认证

# 步骤 2: 创建应用
创建应用 → 选择"商品查询"类目
获取 App Key 和 App Secret

# 步骤 3: 申请接口权限
申请以下接口:
- 商品详情查询
- SKU 查询
- 商品搜索
```

### 4.3 配置环境变量

```env
# 得物开放平台 API
DEWU_APP_KEY=your_app_key_here
DEWU_APP_SECRET=your_app_secret_here
```

### 4.4 特点

- 专注潮流服饰、球鞋
- 商品品质较高
- 价格相对透明

## 五、api4.ai Fashion API (国际)

### 5.1 申请条件

- 无需企业资质
- 免费额度可用

### 5.2 申请流程

```bash
# 步骤 1: 注册账号
访问: https://api4.ai
注册开发者账号

# 步骤 2: 获取 API Key
在 Dashboard 中获取 API Key

# 步骤 3: 调用 API
curl -X POST "https://api.api4ai.cloud/fashion/v2/results" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "url=https://example.com/fashion-image.jpg"
```

### 5.3 配置环境变量

```env
# api4.ai Fashion API
API4AI_KEY=your_api_key_here
```

### 5.4 功能

- 服装检测 (多品类)
- 配饰检测
- 边界框定位
- 置信度评分

## 六、免费替代方案

如果暂时无法申请到官方 API，可使用以下替代方案：

### 6.1 公开数据集

1. **DeepFashion** - 香港中文大学开源数据集
   - 80万+服装图像
   - 50+类别标注
   - 下载: http://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html

2. **Fashion-MNIST** - Zalando开源数据集
   - 70,000张服装图像
   - 10个类别
   - 下载: https://github.com/zalandoresearch/fashion-mnist

3. **Myntra Fashion Dataset** - Kaggle
   - 印度时尚电商数据
   - 包含商品信息、价格、图片
   - 下载: https://www.kaggle.com/datasets

### 6.2 爬虫方案 (注意合规)

```python
# 示例: 使用公开数据集
import pandas as pd

# 从 Kaggle 下载的 Myntra 数据集
df = pd.read_csv('myntra_fashion_products.csv')

# 数据清洗
df = df.dropna(subset=['name', 'price', 'image_url'])
df['category'] = df['category'].fillna('Unknown')

# 导出为 JSON
df.to_json('clothing_data.json', orient='records', force_ascii=False)
```

## 七、数据同步策略

### 7.1 定时同步

```typescript
// 每天凌晨 2 点同步数据
@Cron('0 2 * * *')
async syncClothingData() {
  const sources = this.dataSourceService.getAvailableSources();
  
  for (const source of sources) {
    const result = await this.dataSourceService.searchClothing('', {
      source: [source],
      pageSize: 100,
    });
    
    // 保存到数据库
    await this.saveClothingItems(result.items);
  }
}
```

### 7.2 增量更新

```typescript
// 每小时更新热门商品
@Cron('0 * * * *')
async syncPopularItems() {
  const popularItems = await this.dataSourceService.searchClothing('', {
    pageSize: 50,
    sortBy: 'sales',
  });
  
  await this.updateClothingItems(popularItems.items);
}
```

## 八、注意事项

1. **API 调用限制**: 注意各平台的调用频率限制，避免被封禁
2. **数据合规**: 使用数据时需遵守各平台的数据使用协议
3. **价格更新**: 商品价格实时变化，需定期更新
4. **图片版权**: 商品图片使用需遵守版权规定
5. **佣金结算**: 淘宝联盟、京东联盟有佣金结算周期

## 九、联系支持

- 淘宝开放平台: https://open.taobao.com/support
- 京东开放平台: https://open.jd.com/support
- 得物开放平台: https://open.dewu.com/support
- api4.ai: hello@api4.ai
