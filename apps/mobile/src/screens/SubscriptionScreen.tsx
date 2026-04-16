import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "../polyfills/expo-vector-icons";

import { useScreenTracking } from "../hooks/useAnalytics";
import { useTranslation } from "../i18n";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { theme, Colors, Spacing, BorderRadius, Shadows } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import {
  subscriptionApi,
  type MembershipPlan,
  type UserSubscription,
  type PlanTier,
} from "../services/api/subscription.api";
import type { RootStackParamList } from "../types/navigation";

type Navigation = NavigationProp<RootStackParamList>;

const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: "basic",
    tier: "basic",
    name: "基础版",
    description: "日常穿搭助手",
    price: 0,
    currency: "CNY",
    duration: 1,
    durationUnit: "month",
    isActive: true,
    features: [
      { id: "f1", name: "每日穿搭推荐", included: true },
      { id: "f2", name: "基础衣橱管理", included: true },
      { id: "f3", name: "AI 搭配建议", included: true },
      { id: "f4", name: "每周风格报告", included: false },
      { id: "f5", name: "高级定制服务", included: false },
      { id: "f6", name: "专属造型顾问", included: false },
    ],
  },
  {
    id: "premium",
    tier: "premium",
    name: "高级版",
    description: "专业造型服务",
    price: 29,
    originalPrice: 49,
    currency: "CNY",
    duration: 1,
    durationUnit: "month",
    isActive: true,
    isPopular: true,
    features: [
      { id: "f1", name: "每日穿搭推荐", included: true },
      { id: "f2", name: "无限衣橱管理", included: true },
      { id: "f3", name: "AI 搭配建议", included: true },
      { id: "f4", name: "每周风格报告", included: true },
      { id: "f5", name: "高级定制服务", included: true },
      { id: "f6", name: "专属造型顾问", included: false },
    ],
  },
  {
    id: "vip",
    tier: "vip",
    name: "VIP 版",
    description: "一对一私享定制",
    price: 99,
    originalPrice: 159,
    currency: "CNY",
    duration: 1,
    durationUnit: "month",
    isActive: true,
    features: [
      { id: "f1", name: "每日穿搭推荐", included: true },
      { id: "f2", name: "无限衣橱管理", included: true },
      { id: "f3", name: "AI 搭配建议", included: true },
      { id: "f4", name: "每周风格报告", included: true },
      { id: "f5", name: "高级定制服务", included: true },
      { id: "f6", name: "专属造型顾问", included: true },
    ],
  },
];

const TIER_GRADIENT: Record<PlanTier, [string, string]> = {
  basic: [Colors.neutral[100], Colors.neutral[50]],
  premium: [theme.colors.primary, theme.colors.primaryLight],
  vip: [DesignTokens.colors.brand.terracottaDark, DesignTokens.colors.brand.terracotta], // custom color
};

const TIER_ICON: Record<PlanTier, string> = {
  basic: "leaf-outline",
  premium: "diamond-outline",
  vip: "crown-outline",
};

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  useScreenTracking("Subscription");
  const t = useTranslation();
  const [plans, setPlans] = useState<MembershipPlan[]>(DEFAULT_PLANS);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [selectedTier, setSelectedTier] = useState<PlanTier>("premium");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [plansRes, subRes] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrentSubscription(),
      ]);

      if (plansRes.success && plansRes.data && plansRes.data.length > 0) {
        setPlans(plansRes.data);
      }

      if (subRes.success && subRes.data) {
        setCurrentSubscription(subRes.data);
        if (subRes.data.plan) {
          setSelectedTier(subRes.data.plan.tier);
        }
      }
    } catch {
      // use default plans
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleSubscribe = useCallback(async (plan: MembershipPlan) => {
    if (plan.price === 0) {
      Alert.alert(t.common.confirm, t.common.error);
      return;
    }

    Alert.alert(
      `确认订阅${plan.name}`,
      `将以 ${plan.price}${plan.currency === "CNY" ? "元" : plan.currency}/月的价格订阅${
        plan.name
      }`,
      [
        { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.confirm,
          style: "default",
          onPress: async () => {
            setIsSubscribing(true);
            try {
              const response = await subscriptionApi.subscribe({
                planId: plan.id,
                paymentMethod: "wechat",
              });

              if (response.success) {
                Alert.alert(t.common.done, `已成功订阅${plan.name}，享受所有专属权益`);
                setCurrentSubscription(response.data ?? null);
              } else {
                Alert.alert(t.common.error, response.error?.message || t.common.retry);
              }
            } catch {
              Alert.alert(t.common.error, t.errors.networkError);
            } finally {
              setIsSubscribing(false);
            }
          },
        },
      ]
    );
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerBack}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>会员订阅</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderCurrentPlan = () => {
    if (!currentSubscription) {
      return null;
    }

    const plan = plans.find((p) => p.id === currentSubscription.planId);
    const isActive = currentSubscription.status === "active";

    return (
      <View style={styles.currentPlanCard}>
        <View style={styles.currentPlanHeader}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          <Text style={styles.currentPlanLabel}>当前订阅</Text>
        </View>
        <Text style={styles.currentPlanName}>{plan?.name || "基础版"}</Text>
        {isActive && currentSubscription.endDate && (
          <Text style={styles.currentPlanExpiry}>
            到期时间：
            {new Date(currentSubscription.endDate).toLocaleDateString("zh-CN")}
          </Text>
        )}
      </View>
    );
  };

  const renderPlanCard = (plan: MembershipPlan) => {
    const isSelected = selectedTier === plan.tier;
    const isCurrent =
      currentSubscription?.planId === plan.id && currentSubscription?.status === "active";
    const _gradientColors = TIER_GRADIENT[plan.tier];
    const isPaid = plan.price > 0;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          plan.isPopular && styles.planCardPopular,
        ]}
        onPress={() => setSelectedTier(plan.tier)}
        activeOpacity={0.7}
      >
        {plan.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>最受欢迎</Text>
          </View>
        )}

        <View style={styles.planCardHeader}>
          <View style={styles.planIconContainer}>
            <Ionicons
              name={TIER_ICON[plan.tier]}
              size={22}
              color={isSelected && isPaid ? theme.colors.surface : theme.colors.primary}
            />
          </View>
          <View style={styles.planNameSection}>
            <Text style={[styles.planName, isSelected && isPaid && styles.planNameSelected]}>
              {plan.name}
            </Text>
            <Text
              style={[
                styles.planDescription,
                isSelected && isPaid && styles.planDescriptionSelected,
              ]}
            >
              {plan.description}
            </Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <View style={styles.priceRow}>
            {plan.price === 0 ? (
              <Text style={[styles.priceFree, isSelected && styles.planNameSelected]}>免费</Text>
            ) : (
              <>
                <Text style={[styles.priceSymbol, isSelected && styles.planNameSelected]}>¥</Text>
                <Text style={[styles.priceValue, isSelected && styles.planNameSelected]}>
                  {plan.price}
                </Text>
                <Text style={[styles.priceUnit, isSelected && styles.planDescriptionSelected]}>
                  /月
                </Text>
                {plan.originalPrice && (
                  <Text style={styles.originalPrice}>¥{plan.originalPrice}/月</Text>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.featuresSection}>
          {plan.features.map((feature) => (
            <View key={feature.id} style={styles.featureRow}>
              <Ionicons
                name={feature.included ? "checkmark" : "close"}
                size={16}
                color={
                  feature.included
                    ? isSelected && isPaid
                      ? theme.colors.surface
                      : theme.colors.success
                    : isSelected && isPaid
                    ? "rgba(255,255,255,0.3)"
                    : Colors.neutral[300]
                }
              />
              <Text
                style={[
                  styles.featureName,
                  !feature.included && styles.featureNameDisabled,
                  isSelected && isPaid && feature.included && styles.planNameSelected,
                ]}
              >
                {feature.name}
              </Text>
            </View>
          ))}
        </View>

        {isCurrent ? (
          <View
            style={[styles.currentButton, isPaid && { backgroundColor: "rgba(255,255,255,0.2)" }]}
          >
            <Text style={[styles.currentButtonText, isPaid && { color: theme.colors.surface }]}>
              当前计划
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.subscribeButton, isPaid && { backgroundColor: theme.colors.surface }]}
            onPress={() => handleSubscribe(plan)}
            disabled={isSubscribing}
            activeOpacity={0.7}
          >
            {isSubscribing && isSelected ? (
              <ActivityIndicator
                size="small"
                color={isPaid ? theme.colors.primary : theme.colors.surface}
              />
            ) : (
              <Text style={[styles.subscribeButtonText, isPaid && { color: theme.colors.primary }]}>
                {plan.price === 0 ? "切换到基础版" : "立即订阅"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {renderCurrentPlan()}

        <View style={styles.introSection}>
          <Text style={styles.introTitle}>选择适合你的计划</Text>
          <Text style={styles.introSubtitle}>解锁更多 AI 造型能力，让穿搭更简单</Text>
        </View>

        <View style={styles.plansContainer}>{plans.map(renderPlanCard)}</View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: Spacing[3],
  },
  currentPlanCard: {
    marginHorizontal: Spacing[5],
    marginTop: Spacing[2],
    marginBottom: Spacing[4],
    backgroundColor: "rgba(91, 138, 114, 0.08)",
    borderRadius: BorderRadius.xl,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: "rgba(91, 138, 114, 0.2)",
  },
  currentPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  currentPlanLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.success,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  currentPlanExpiry: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: Spacing[1],
  },
  introSection: {
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[4],
  },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  introSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: Spacing[2],
    lineHeight: 22,
  },
  plansContainer: {
    paddingHorizontal: Spacing[5],
    gap: Spacing[4],
  },
  planCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius["2xl"],
    padding: Spacing[5],
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  planCardPopular: {
    borderColor: theme.colors.primary,
  },
  popularBadge: {
    position: "absolute",
    top: 0,
    right: Spacing[5],
    backgroundColor: theme.colors.primary,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderBottomLeftRadius: BorderRadius.lg,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing[4],
  },
  planIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing[3],
  },
  planNameSection: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  planNameSelected: {
    color: theme.colors.surface,
  },
  planDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: Spacing[1],
  },
  planDescriptionSelected: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  priceSection: {
    marginBottom: Spacing[4],
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceFree: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  priceSymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -1,
  },
  priceUnit: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: Spacing[1],
  },
  originalPrice: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textDecorationLine: "line-through",
    marginLeft: Spacing[2],
  },
  featuresSection: {
    marginBottom: Spacing[5],
    gap: Spacing[3],
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  featureName: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  featureNameDisabled: {
    color: Colors.neutral[300],
  },
  currentButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  currentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  subscribeButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[4],
    borderRadius: BorderRadius.xl,
    ...Shadows.brand,
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.surface,
  },
  bottomSpacer: {
    height: Spacing[10],
  },
});

export default SubscriptionScreen;
