/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../types/navigation";

type Navigation = NavigationProp<RootStackParamList>;

interface ComparisonRowProps {
  feature: string;
  free: string;
  premium: string;
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({ feature, free, premium }) => (
  <View style={styles.comparisonRow}>
    <Text style={styles.comparisonFeature}>{feature}</Text>
    <Text style={styles.comparisonFree}>{free}</Text>
    <Text style={styles.comparisonPremium}>{premium}</Text>
  </View>
);

interface UsageLimitBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  limitInfo: {
    limit?: number;
    remaining?: number;
    actionType?: string;
  };
}

/**
 * UsageLimitBottomSheet -- upgrade prompt shown when free-tier usage limit is reached.
 *
 * D-01: BottomSheet with feature comparison table + "立即升级" CTA button.
 * Matches TryOnBottomSheet interaction pattern (snapPoints=["70%"]).
 */
export const UsageLimitBottomSheet = React.forwardRef<BottomSheetModal, UsageLimitBottomSheetProps>(
  ({ visible, onClose, limitInfo }, ref) => {
    const navigation = useNavigation<Navigation>();
    const snapPoints = useMemo(() => ["70%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleUpgrade = useCallback(() => {
      navigation.navigate("Subscription" as never);
      onClose();
    }, [navigation, onClose]);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.background}
      >
        <BottomSheetView style={styles.content}>
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles-outline" size={24} color={DesignTokens.colors.brand.camel} />
            </View>
            <Text style={styles.title}>今日额度已用完</Text>
            <Text style={styles.subtitle}>今天的 AI 穿搭搭子服务已用完，升级会员无限畅享</Text>
          </View>

          {/* Feature comparison table */}
          <View style={styles.comparisonTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>功能</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>
                免费版
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  styles.tableHeaderPremium,
                  { flex: 0.8, textAlign: "center" },
                ]}
              >
                高级会员
              </Text>
            </View>
            <ComparisonRow feature="AI 穿搭对话" free="5次/天" premium="无限" />
            <ComparisonRow feature="虚拟试穿" free="3次/天" premium="无限" />
            <ComparisonRow feature="衣橱管理" free="20件" premium="无限" />
            <ComparisonRow feature="连续穿搭计划" free="-" premium="包含" />
            <ComparisonRow feature="深度衣橱诊断" free="-" premium="包含" />
          </View>

          {/* Price badge */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceSymbol}>¥</Text>
            <Text style={styles.priceValue}>9.9</Text>
            <Text style={styles.priceUnit}>元/月</Text>
          </View>

          {/* CTA button */}
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
            activeOpacity={0.8}
          >
            <Ionicons name="diamond-outline" size={18} color={DesignTokens.colors.neutral.white} />
            <Text style={styles.upgradeText}>立即升级</Text>
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

UsageLimitBottomSheet.displayName = "UsageLimitBottomSheet";

const styles = StyleSheet.create({
  background: {
    backgroundColor: DesignTokens.colors.neutral.white,
    borderTopLeftRadius: DesignTokens.borderRadius["3xl"],
    borderTopRightRadius: DesignTokens.borderRadius["3xl"],
  } as ViewStyle,
  handleIndicator: {
    backgroundColor: DesignTokens.colors.neutral[300],
    width: 40,
    height: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing[5],
    paddingTop: DesignTokens.spacing[2],
    paddingBottom: DesignTokens.spacing[6],
  } as ViewStyle,
  headerSection: {
    alignItems: "center",
    marginBottom: DesignTokens.spacing[5],
  } as ViewStyle,
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${DesignTokens.colors.brand.camel}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[3],
  } as ViewStyle,
  title: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral[900],
    marginBottom: DesignTokens.spacing[2],
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
  },
  comparisonTable: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: DesignTokens.borderRadius.xl,
    padding: DesignTokens.spacing[4],
    marginBottom: DesignTokens.spacing[5],
  } as ViewStyle,
  tableHeader: {
    flexDirection: "row",
    paddingBottom: DesignTokens.spacing[2],
    marginBottom: DesignTokens.spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  } as ViewStyle,
  tableHeaderText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral[400],
    textTransform: "uppercase" as const,
  },
  tableHeaderPremium: {
    color: DesignTokens.colors.brand.camel,
  },
  comparisonRow: {
    flexDirection: "row",
    paddingVertical: DesignTokens.spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DesignTokens.colors.neutral[100],
  } as ViewStyle,
  comparisonFeature: {
    flex: 1.2,
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[800],
  },
  comparisonFree: {
    flex: 0.8,
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[400],
    textAlign: "center",
  },
  comparisonPremium: {
    flex: 0.8,
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: DesignTokens.colors.brand.camel,
    textAlign: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: DesignTokens.spacing[5],
  } as ViewStyle,
  priceSymbol: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600" as TextStyle["fontWeight"],
    color: DesignTokens.colors.brand.camel,
  },
  priceValue: {
    fontSize: DesignTokens.typography.sizes["4xl"],
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.brand.camel,
    letterSpacing: -1,
  },
  priceUnit: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[400],
    marginLeft: DesignTokens.spacing[1],
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[2],
    height: 52,
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: DesignTokens.colors.brand.camel,
    ...DesignTokens.shadows.brand,
  } as ViewStyle,
  upgradeText: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral.white,
  },
});
