import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '../../../polyfills/expo-vector-icons';
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { Colors, Spacing, BorderRadius, Shadows } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import brandQRApi, { type QRScanResult } from '../../../services/api/brand-qr.api';
import type { RootStackParamList } from '../../../types/navigation';
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

type Navigation = NavigationProp<RootStackParamList>;

export const BrandQRScanScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleManualScan = useCallback(async () => {
    if (!manualCode.trim()) {
      Alert.alert("提示", "请输入二维码编码");
      return;
    }

    setIsScanning(true);
    try {
      const response = await brandQRApi.scanQRCode(manualCode.trim());
      if (response.success && response.data) {
        setScanResult(response.data);
      } else {
        Alert.alert("扫码失败", "二维码无效或已停用");
      }
    } catch {
      Alert.alert("扫码失败", "网络错误，请重试");
    } finally {
      setIsScanning(false);
    }
  }, [manualCode]);

  const handleImport = useCallback(async () => {
    if (!scanResult) {
      return;
    }

    setIsImporting(true);
    try {
      const response = await brandQRApi.importScannedProduct(
        manualCode.trim(),
        undefined,
        Platform.OS === "ios" ? "ios" : "android"
      );
      if (response.success) {
        Alert.alert("导入成功", "商品已添加到您的衣橱", [
          {
            text: "查看衣橱",
            onPress: () => navigation.navigate("Wardrobe"),
          },
          {
            text: "继续扫码",
            onPress: () => {
              setScanResult(null);
              setManualCode("");
            },
          },
        ]);
      }
    } catch {
      Alert.alert("导入失败", "请稍后重试");
    } finally {
      setIsImporting(false);
    }
  }, [scanResult, manualCode, navigation]);

  const renderScanInput = () => (
    <View style={styles.inputSection}>
      <Text style={styles.inputLabel}>输入二维码编码</Text>
      <Text style={styles.inputHint}>扫描商品标签上的 AiNeed 二维码，或手动输入编码</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.codeInput}
          placeholder="输入二维码编码..."
          placeholderTextColor={colors.textTertiary}
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.scanButton}
          onPress={handleManualScan}
          disabled={isScanning || !manualCode.trim()}
          activeOpacity={0.7}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Ionicons name="scan-outline" size={24} color={colors.surface} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScanResult = () => {
    const { colors } = useTheme();
    if (!scanResult) {
      return null;
    }

    const { brand, product } = scanResult;

    return (
      <View style={styles.resultSection}>
        <Text style={styles.resultTitle}>扫码结果</Text>

        {/* Brand Info */}
        <View style={styles.brandCard}>
          <View style={styles.brandLogo}>
            <Ionicons name="business-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>{brand.name}</Text>
            <Text style={styles.brandSlug}>@{brand.slug}</Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productCard}>
          <View style={styles.productRow}>
            <Text style={styles.productLabel}>商品名称</Text>
            <Text style={styles.productValue}>{product.productName || "-"}</Text>
          </View>
          {product.sku && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>SKU</Text>
              <Text style={styles.productValue}>{product.sku}</Text>
            </View>
          )}
          {product.color && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>颜色</Text>
              <Text style={styles.productValue}>{product.color}</Text>
            </View>
          )}
          {product.size && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>尺码</Text>
              <Text style={styles.productValue}>{product.size}</Text>
            </View>
          )}
          {product.material && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>材质</Text>
              <Text style={styles.productValue}>{product.material}</Text>
            </View>
          )}
          {product.price > 0 && (
            <View style={styles.productRow}>
              <Text style={styles.productLabel}>价格</Text>
              <Text style={styles.productValue}>{product.price} CNY</Text>
            </View>
          )}
        </View>

        {/* Import Button */}
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImport}
          disabled={isImporting}
          activeOpacity={0.7}
        >
          {isImporting ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color={colors.surface} />
              <Text style={styles.importButtonText}>添加到我的衣橱</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setScanResult(null);
            setManualCode("");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>重新扫码</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>品牌扫码</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Camera Placeholder */}
        <View style={styles.cameraPlaceholder}>
          <Ionicons name="qr-code-outline" size={64} color={Colors.neutral[300]} />
          <Text style={styles.cameraHint}>相机扫码功能即将上线{"\n"}请使用下方手动输入</Text>
        </View>

        {renderScanInput()}
        {renderScanResult()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[4],
  },
  cameraPlaceholder: {
    height: 200,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[4],
  },
  cameraHint: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[400],
    textAlign: "center",
    marginTop: Spacing[3],
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: Spacing[4],
  },
  inputLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[1],
  },
  inputHint: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing[3],
  },
  inputRow: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  codeInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  resultSection: {
    flex: 1,
  },
  resultTitle: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: Spacing[3],
  },
  brandCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    gap: Spacing[3],
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(198, 123, 92, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  brandSlug: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
  },
  productCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing[1],
  },
  productLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
  },
  productValue: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  importButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing[4],
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    marginBottom: Spacing[3],
    ...Shadows.brand,
  },
  importButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  resetButton: {
    alignItems: "center",
    paddingVertical: Spacing[3],
  },
  resetButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
  },
});

export default BrandQRScanScreen;
