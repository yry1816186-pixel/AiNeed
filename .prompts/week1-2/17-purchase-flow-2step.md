# 任务17: 购买流程压缩为2步 + AI尺码推荐

## 你的角色

寻裳(AiNeed)项目移动端开发工程师。项目位于 C:\AiNeed，React Native。

## 背景

当前购买流程有3步+success共4个页面，标准电商只需2步。还需要添加AI尺码推荐功能。

## 必读文件

1. `apps/mobile/src/features/commerce/screens/CheckoutScreen.tsx` — 完整读取
2. `apps/mobile/src/features/commerce/` — 所有commerce相关文件
3. `apps/mobile/src/features/commerce/components/` — commerce组件
4. `apps/backend/prisma/schema.prisma` — UserProfile和ClothingItem相关字段

## 任务

### 1. 理解当前流程

读取CheckoutScreen，理解当前的3步流程：

- Step 1: summary（商品确认）
- Step 2: address（地址填写）
- Step 3: payment（支付方式）
- Success: 订单成功

### 2. 压缩为2步

**Step 1: 确认 + 地址（合并）**

布局：

```
┌────────────────────────────┐
│ 商品清单（可折叠）          │
│ - 商品图 名称 尺码 数量 价格│
│ - AI推荐尺码: M码(95%合身) │ ← 新增
├────────────────────────────┤
│ 收货地址                    │
│ [已有地址卡片/新增地址按钮]  │
│ 选择地址 → 高亮选中态        │
├────────────────────────────┤
│ 优惠券                     │
│ [选择优惠券]               │
├────────────────────────────┤
│ 价格明细                   │
│ 商品合计  ¥XXX             │
│ 优惠      -¥XX             │
│ ──────────────────         │
│ 实付      ¥XXX             │
├────────────────────────────┤
│ [提交订单] 大按钮           │
└────────────────────────────┘
```

**Step 2: 支付**

布局：

```
┌────────────────────────────┐
│ 订单金额 ¥XXX              │
│                            │
│ 支付方式                    │
│ ○ 支付宝  [默认/上次使用]   │
│ ○ 微信支付                  │
│                            │
│ [确认支付 ¥XXX] 大按钮      │
│                            │
│ 订单号: XXXXX              │
└────────────────────────────┘
```

支付成功后显示 OrderSuccessAnimation（任务15创建的）。

### 3. AI尺码推荐组件

创建 `apps/mobile/src/features/commerce/components/AiSizeRecommendation.tsx`：

```typescript
interface Props {
  item: ClothingItem;
  userProfile: UserProfile;
  onSizeSelect: (size: string) => void;
}

export const AiSizeRecommendation: React.FC<Props> = ({ item, userProfile, onSizeSelect }) => {
  // 基于用户身高/体重 + 商品类型计算推荐尺码
  const recommendation = calculateSize(userProfile, item);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>✨</Text>
        <Text style={styles.badgeText}>AI 推荐</Text>
      </View>
      <Text style={styles.recommendText}>
        {recommendation.size}码 ({recommendation.confidence}% 合身)
      </Text>
      <Text style={styles.reasonText}>
        {recommendation.reason}
      </Text>
    </View>
  );
};

function calculateSize(profile: UserProfile, item: ClothingItem): SizeRecommendation {
  const { height, weight, gender } = profile;
  const category = item.category;

  // 简化版尺码推荐逻辑
  // 实际应该查询品牌的尺码表

  let size = 'M';
  let confidence = 80;
  let reason = '';

  const bmi = weight / ((height / 100) ** 2);

  if (category === 'tops' || category === 'dresses') {
    if (bmi < 18.5) { size = 'S'; confidence = 85; reason = '偏瘦体型，S码更贴合'; }
    else if (bmi < 24) { size = 'M'; confidence = 90; reason = '标准体型，M码最佳'; }
    else if (bmi < 28) { size = 'L'; confidence = 82; reason = '建议L码更舒适'; }
    else { size = 'XL'; confidence = 75; reason = '建议XL码'; }
  } else if (category === 'bottoms') {
    // 考虑腰围和臀围（如果有数据）
    // 简化版用BMI
    if (bmi < 20) { size = 'S'; confidence = 78; }
    else if (bmi < 25) { size = 'M'; confidence = 85; }
    else { size = 'L'; confidence = 75; }
    reason = '基于身高体重数据推荐';
  }

  return { size, confidence, reason };
}
```

### 4. 地址快速选择

如果用户已有保存地址，Step 1 直接显示地址卡片列表，点击选中。
新增地址用 inline 展开（不用跳转新页面）。

### 5. 记住支付方式

记住上次使用的支付方式，Step 2 默认选中：

```typescript
// 用AsyncStorage存储
const saveLastPaymentMethod = async (method: string) => {
  await AsyncStorage.setItem("lastPaymentMethod", method);
};
```

## 验证标准

- [ ] 购买流程从3步压缩为2步
- [ ] Step 1包含商品+地址+优惠券+价格明细
- [ ] Step 2包含支付方式选择+确认支付
- [ ] AiSizeRecommendation组件创建并集成到商品卡片
- [ ] 支持已有地址快速选择
- [ ] 记住上次支付方式
- [ ] TypeScript编译无错误
