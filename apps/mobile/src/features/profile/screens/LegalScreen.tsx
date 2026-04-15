import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';
import type { RootStackParamList } from "../types/navigation";

type LegalScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type LegalScreenProps = {
  type: "terms" | "privacy";
};

export const LegalScreen: React.FC<LegalScreenProps> = ({ type }) => {
  const navigation = useNavigation<LegalScreenNavigationProp>();
  const isTerms = type === "terms";

  const title = isTerms ? "用户服务协议" : "隐私政策";
  const lastUpdated = "2026年4月1日";

  const termsContent = `
## 一、总则

1.1 欢迎您使用寻裳智能私人形象定制与服装设计助手平台服务。为使用寻裳服务，您应当阅读并遵守《寻裳用户服务协议》（以下简称"本协议"）。请您务必审慎阅读、充分理解各条款内容，特别是免除或限制责任的相应条款。

1.2 除非您已阅读并接受本协议所有条款，否则您无权使用寻裳服务。您的任何使用行为即视为您已阅读并同意本协议的约束。

## 二、服务内容

2.1 寻裳为用户提供以下服务：
- AI智能造型师咨询服务
- 虚拟试衣功能
- 个性化服装推荐
- 个人形象档案管理
- 服装商品浏览与购买

2.2 我们保留随时变更、中断或终止部分或全部服务的权利。

## 三、用户注册与账户

3.1 您需要注册一个寻裳账户才能使用部分服务。您承诺：
- 提供的真实、准确、完整的个人资料
- 及时更新您的个人资料
- 妥善保管账户密码
- 对账户下的所有行为负责

3.2 若发现任何未经授权使用您账户的情况，请立即通知我们。

## 四、用户行为规范

4.1 您承诺不会利用寻裳服务从事以下行为：
- 发布违法、有害、侮辱或恐吓信息
- 侵犯他人知识产权或其他合法权益
- 传播病毒或恶意代码
- 干扰或破坏服务正常运行
- 未经授权收集他人信息

4.2 您发布的内容应遵守相关法律法规，不得含有违法或不良信息。

## 五、知识产权

5.1 寻裳服务中的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、版面设计等的知识产权归寻裳所有。

5.2 用户上传的原创内容的知识产权归用户所有。用户授权寻裳在全球范围内使用、复制、修改、展示该内容以提供服务。

## 六、付费服务

6.1 部分服务可能需要付费。付费服务的价格、支付方式等将在相关页面展示。

6.2 虚拟商品一经购买，除法律明确规定或寻裳另有规定外，不予退款。

## 七、隐私保护

7.1 我们重视用户隐私保护。具体内容请参见《寻裳隐私政策》。

## 八、免责声明

8.1 寻裳服务按"现状"提供，不提供任何明示或暗示的担保。

8.2 因不可抗力、第三方原因或您自身原因导致的服务中断或损失，寻裳不承担责任。

## 九、协议修改

9.1 我们有权随时修改本协议。修改后的协议将在寻裳平台公布。您继续使用服务即视为接受修改后的协议。

## 十、联系我们

如对本协议有任何疑问，请通过以下方式联系我们：
- 邮箱：support@xuno.app
- 客服电话：400-XXX-XXXX
`;

  const privacyContent = `
## 引言

寻裳深知个人信息对您的重要性，我们将按照法律法规要求，采取相应安全保护措施，尽力保护您的个人信息安全可控。本隐私政策适用于寻裳智能私人形象定制平台（以下简称"寻裳"或"我们"）提供的所有服务。本政策旨在向您说明我们如何收集、使用、存储、共享和保护您的个人信息，以及您如何管理您的个人信息。

## 一、我们收集的信息

### 1.1 您主动提供的信息
- **账户信息**：注册时提供的手机号码、电子邮箱、昵称、密码
- **身份信息**：姓名、性别、出生日期（可选）
- **身材信息**：身高、体重、三围等（用于虚拟试衣和推荐服务）
- **风格偏好**：喜欢的服装风格、颜色偏好等
- **照片信息**：您上传的个人照片（用于虚拟试衣和形象分析）

### 1.2 我们自动收集的信息
- **设备信息**：设备型号、操作系统、唯一设备标识符
- **日志信息**：IP地址、访问时间、浏览记录、操作记录
- **位置信息**：大致地理位置（需您授权，用于天气推荐和附近商品）
- **推送令牌**：用于向您发送推送通知的设备令牌

### 1.3 Cookie和追踪技术
我们使用本地存储技术（如AsyncStorage）保存您的登录状态和偏好设置。我们不使用第三方广告追踪Cookie。

## 二、我们如何使用信息

### 2.1 提供服务
- 创建和管理您的账户
- 提供AI造型师咨询和虚拟试衣服务
- 个性化服装推荐
- 处理订单和支付
- 发送推送通知（订单状态、推荐、社区互动、系统消息）

### 2.2 自动化决策
我们使用AI算法基于您的个人信息（体型、肤色、风格偏好、浏览行为）进行自动化决策，包括：
- 穿搭方案推荐
- 色彩搭配评分
- 尺码推荐
- 虚拟试衣效果生成

您可以随时修改您的个人信息以影响AI推荐结果。您有权要求人工审核AI决策结果。

### 2.3 改进服务
- 分析用户行为，优化产品功能
- 开发新功能和服务
- 进行安全检测和防护

### 2.4 沟通联系
- 发送服务通知和更新
- 回复您的咨询和反馈
- 发送营销信息（需您同意）

## 三、信息共享

我们不会向第三方出售您的个人信息。仅在以下情况下共享：

### 3.1 获得您同意的共享
- 您明确授权我们向第三方共享

### 3.2 服务提供商
- **智谱AI（GLM）**：AI造型师推荐和虚拟试衣效果生成（您的文字和照片会发送至智谱AI进行处理，智谱AI不会存储您的数据）
- **支付服务提供商**：支付宝、微信支付（仅处理支付令牌，不存储银行卡信息）
- **物流服务商**：快递公司（配送信息）
- **云服务提供商**：数据存储服务商（数据存储于中国境内服务器）
- **Sentry**：崩溃报告和应用性能监控（仅收集匿名设备信息和错误日志）
- **Firebase/APNs**：推送通知送达（仅使用设备推送令牌）

### 3.3 法律要求
- 遵守法律法规或政府要求
- 保护我们或用户的合法权益

## 四、跨境数据传输

您的个人信息全部存储在中华人民共和国境内的服务器上。我们不会将您的个人信息传输至境外。

我们使用的第三方服务（Sentry）服务器位于海外，但我们仅向其传输匿名的崩溃报告和设备信息，不传输任何可识别个人身份的信息。

## 五、信息存储与保护

### 5.1 存储地点
您的个人信息存储在中华人民共和国境内的服务器。

### 5.2 存储期限
- 账户信息：账户存续期间
- 交易信息：法律规定的最低保存期限（不少于3年）
- 照片信息：永久存储（加密），您可随时删除
- 其他信息：实现服务目的所需的最短期限

### 5.3 安全措施
- 数据加密传输（HTTPS/TLS 1.2+）
- 敏感信息加密存储（AES-256-GCM）
- 访问权限控制和身份验证
- 安全审计和监控
- 定期安全评估

## 六、您的权利

### 6.1 访问和更正
您可以在"个人中心"查看和更正您的个人信息。

### 6.2 删除
您可以申请删除您的账户和相关个人信息。部分信息因法律要求需保留。

### 6.3 数据导出
您可以在"设置-数据与隐私"中申请导出您的全部个人数据（JSON格式），导出链接7天内有效。

### 6.4 撤回同意
您可以撤回之前给予的同意，撤回后可能影响相关服务的使用。撤回同意不影响此前基于同意的处理活动。

### 6.5 注销账户
您可以在"设置-数据与隐私-删除我的账户"中申请注销账户。注销后您的个人信息将在30天内删除（法律要求保留的除外）。

### 6.6 自动化决策权
您有权拒绝仅通过自动化决策方式做出的决定，有权要求人工介入处理。

## 七、未成年人保护

我们非常重视未成年人的个人信息保护。如果您是未满14周岁的未成年人，请在监护人陪同下阅读本政策，并在取得监护人同意后使用我们的服务。我们不会主动收集未满14周岁未成年人的个人信息。

## 八、第三方SDK列表

| SDK名称 | 用途 | 收集信息 | 隐私政策 |
|---------|------|---------|---------|
| 智谱AI GLM | AI造型师、虚拟试衣 | 文字输入、照片 | zhipuai.cn |
| Firebase | 推送通知(Android) | 设备令牌 | firebase.google.com |
| APNs | 推送通知(iOS) | 设备令牌 | apple.com |
| Sentry | 崩溃报告 | 匿名设备信息 | sentry.io |
| 支付宝SDK | 支付处理 | 支付令牌 | alipay.com |
| 微信支付SDK | 支付处理 | 支付令牌 | pay.weixin.qq.com |
| 和风天气 | 天气数据 | 大致位置 | qweather.com |

## 九、本政策更新

我们可能适时修订本政策。重大变更时，我们会通过应用内通知或其他方式告知您，并要求您重新确认同意。

当前版本：v1.0.0
更新日期：2026年4月14日

## 十、联系我们

如您对本隐私政策有任何疑问、意见或建议，可通过以下方式联系我们：

- **邮箱**：privacy@xuno.app
- **客服电话**：400-888-XXXX
- **邮寄地址**：北京市[公司注册地址]

我们将在15个工作日内回复您的请求。
`;

  const content = isTerms ? termsContent : privacyContent;

  const renderContent = () => {
    const lines = content.trim().split("\n");
    return lines.map((line, index) => {
      if (line.startsWith("## ")) {
        return (
          <Text key={index} style={styles.heading1}>
            {line.replace("## ", "")}
          </Text>
        );
      } else if (line.startsWith("### ")) {
        return (
          <Text key={index} style={styles.heading2}>
            {line.replace("### ", "")}
          </Text>
        );
      } else if (line.startsWith("- ")) {
        return (
          <Text key={index} style={styles.bulletItem}>
            • {line.replace("- ", "")}
          </Text>
        );
      } else if (line.trim() === "") {
        return <View key={index} style={styles.spacer} />;
      } else {
        return (
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        );
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="返回"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <View style={styles.lastUpdated}>
          <Text style={styles.lastUpdatedText}>最后更新：{lastUpdated}</Text>
        </View>
        <View style={styles.documentContent}>{renderContent()}</View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          如有疑问，请联系
          <Text style={styles.linkText} onPress={() => Linking.openURL("mailto:support@xuno.app")}>
            support@xuno.app
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  lastUpdated: {
    marginBottom: 16,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  documentContent: {
    paddingBottom: 40,
  },
  heading1: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginLeft: 16,
    marginBottom: 4,
  },
  spacer: {
    height: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  linkText: {
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
});

export default LegalScreen;
