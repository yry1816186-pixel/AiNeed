# 任务08: AI造型师合并为单屏对话体验

## 你的角色

寻裳(AiNeed)项目移动端开发工程师。项目位于 C:\AiNeed，React Native。

## 背景

当前AI造型师有两个屏幕：AiStylistScreen（主屏/空态）和AiStylistChatScreen（聊天屏），用户困惑于双入口。需要合并为单屏对话式体验。

## 必读文件

1. `apps/mobile/src/features/stylist/screens/AiStylistScreen.tsx`
2. `apps/mobile/src/features/stylist/screens/AiStylistChatScreen.tsx`
3. `apps/mobile/src/features/stylist/components/` — 所有组件
4. `apps/mobile/src/features/stylist/` — 目录下所有文件
5. `apps/mobile/src/navigation/RootNavigator.tsx` — 看路由注册

## 任务

### 1. 创建统一的 AiStylistUnifiedScreen.tsx

合并两个屏幕的功能到一个屏幕：

**布局**：

```
┌──────────────────────────┐
│ 导航栏: "AI造型师"        │
├──────────────────────────┤
│                          │
│ 消息流区域 (FlatList)     │
│  - AI欢迎消息             │
│  - 用户消息气泡            │
│  - AI回复气泡(含穿搭卡片)  │
│                          │
├──────────────────────────┤
│ 场景 Chips (横向滚动)     │
│ [约会] [通勤] [休闲] [运动]│
├──────────────────────────┤
│ 输入区域                  │
│ [附件按钮] [文字输入] [发送]│
└──────────────────────────┘
```

### 2. 功能迁移

从 AiStylistScreen 迁移：

- 空态消息 → 改为AI欢迎消息（"Hi, 我是你的AI造型师，今天想穿什么风格？"）
- 场景快捷按钮 → 改为底部chips

从 AiStylistChatScreen 迁移：

- 消息列表 FlatList
- 消息气泡组件
- 打字机效果
- 发送消息逻辑
- SSE流式接收逻辑

### 3. 穿搭卡片内嵌对话

在AI回复中直接嵌入穿搭方案卡片（横向滑动查看多套方案）：

```typescript
// 穿搭卡片组件
const OutfitCard = ({ outfit }: { outfit: OutfitPlan }) => (
  <View style={styles.outfitCard}>
    <ScrollView horizontal pagingEnabled>
      {outfit.items.map(item => (
        <View key={item.id} style={styles.outfitItem}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          <Text>{item.name}</Text>
          <Text>¥{item.price}</Text>
        </View>
      ))}
    </ScrollView>
    <View style={styles.outfitActions}>
      <TouchableOpacity onPress={() => handleTryOn(outfit)}>
        <Text>虚拟试穿</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleLike(outfit)}>
        <Text>喜欢</Text>
      </TouchableOpacity>
    </View>
  </View>
);
```

### 4. 场景Chips个性化

场景chips根据当前状态动态排序：

- 默认顺序：约会/通勤/休闲/运动/正式
- 如果当前时间是周五下午：优先显示"周末出行"
- 如果是工作日上午：优先显示"通勤"
- 如果下雨：显示"雨天穿搭"

### 5. 替换路由

在 RootNavigator.tsx 中：

- 将 AiStylistScreen 替换为 AiStylistUnifiedScreen
- 删除 AiStylistChatScreen 的独立路由（从Tab导航和Stack导航中移除）
- 保持Tab图标和名称不变

### 6. 保留原有文件

不要删除 AiStylistScreen.tsx 和 AiStylistChatScreen.tsx，仅从路由中移除。新文件单独创建。

## 验证标准

- [ ] AiStylistUnifiedScreen.tsx 创建
- [ ] 单屏包含：AI欢迎消息 + 消息流 + 场景chips + 输入框
- [ ] 穿搭方案卡片内嵌在AI回复中
- [ ] 场景chips可点击并发送对应消息
- [ ] 路由指向新屏幕
- [ ] 旧文件保留但不再被路由引用
- [ ] TypeScript编译无错误
