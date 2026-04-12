import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';

const PRIVACY_SECTIONS = [
  {
    title: '信息收集',
    content:
      'AiNeed 会收集您在使用服务时主动提供的信息，包括：注册手机号、昵称、头像等基本信息；体型数据（身高、体重等）用于提供个性化推荐；风格偏好设置用于优化推荐结果；上传的服装图片和定制设计图案。',
  },
  {
    title: '信息使用',
    content:
      '我们收集的信息将用于：提供和维护我们的服务；改善用户体验和个性化推荐；开发新功能和服务；与您沟通服务相关事项；保障服务安全性和稳定性。',
  },
  {
    title: '信息共享',
    content:
      '我们不会向第三方出售您的个人信息。仅在以下情况下可能共享：获得您的明确同意后；与为我们提供服务的合作伙伴共享（受保密协议约束）；法律法规要求或司法行政机关强制要求时。',
  },
  {
    title: '信息存储与安全',
    content:
      '您的个人信息存储在中华人民共和国境内的安全服务器上。我们采用行业标准的加密技术和安全措施保护您的数据，包括SSL加密传输、数据加密存储、访问权限控制等。我们会采取合理措施保护您的个人信息安全。',
  },
  {
    title: '您的权利',
    content:
      '您有权：访问和获取您的个人信息副本；更正或补充不准确的信息；删除您的个人信息（法律要求保留的除外）；撤回授权同意；注销账户。您可以通过App内的设置功能行使上述权利，或联系我们的客服团队。',
  },
  {
    title: '未成年人保护',
    content:
      '我们非常重视对未成年人个人信息的保护。若您是未满18周岁的未成年人，请在监护人的陪同和指导下使用我们的服务，并在监护人明确同意后向我们提供个人信息。',
  },
  {
    title: '隐私政策更新',
    content:
      '我们可能会适时修订本隐私政策。当政策条款发生变更时，我们会在App内以推送通知或弹窗等方式通知您。若您在政策变更后继续使用我们的服务，即表示您同意受修订后的隐私政策约束。',
  },
  {
    title: '联系我们',
    content:
      '如您对本隐私政策有任何疑问、意见或建议，可通过以下方式联系我们：\n\n邮箱：privacy@aineed.com\n客服电话：400-888-0000\n工作时间：周一至周五 9:00-18:00',
  },
];

export default function PrivacyScreen() {
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <Text variant="caption" color={colors.textTertiary} style={styles.updateDate}>
        最后更新日期：2026年4月1日
      </Text>

      <View style={styles.introCard}>
        <Text variant="body" color={colors.textSecondary} style={styles.introText}>
          AiNeed（以下简称"我们"）深知个人信息对您的重要性，我们将按照法律法规的规定，保护您的个人信息及隐私安全。我们制定本隐私政策以帮助您了解我们如何收集、使用、存储和保护您的个人信息。请您在使用我们的服务前，仔细阅读并充分理解本隐私政策。
        </Text>
      </View>

      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            {section.title}
          </Text>
          <Text variant="body" color={colors.textSecondary} style={styles.sectionContent}>
            {section.content}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  updateDate: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    fontWeight: '500' as const,
  },
  introCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.lg,
  },
  introText: {
    lineHeight: 22,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    lineHeight: 22,
  },
});
