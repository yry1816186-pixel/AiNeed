import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { AISizeBadge } from "./AISizeBadge";
import type { SizeRecommendation } from '../../../services/api/commerce.api';
import { stockNotificationApi } from '../../../services/api/commerce.api';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';

interface SKUSelectorProps {
  visible: boolean;
  colors: string[];
  sizes: string[];
  stock: number;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  onChange: (color: string, size: string, quantity: number) => void;
  onClose: () => void;
  itemId: string;
  aiRecommendation?: SizeRecommendation | null;
}

export const SKUSelector: React.FC<SKUSelectorProps> = ({
  visible,
  colors,
  sizes,
  stock,
  selectedColor,
  selectedSize,
  quantity,
  onChange,
  onClose,
  itemId,
  aiRecommendation,
}) => {
  const [color, setColor] = useState(selectedColor);
  const [size, setSize] = useState(selectedSize);
  const [qty, setQty] = useState(quantity);

  const handleConfirm = () => {
    onChange(color, size, qty);
    onClose();
  };

  const handleSubscribeStock = async (targetSize: string) => {
    try {
      await stockNotificationApi.subscribe(itemId, color, targetSize);
    } catch (error) {
      // silent fail for now
      console.error('SKU selection failed:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>选择规格</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>颜色</Text>
              <View style={styles.colorRow}>
                {colors.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorSwatch, c === color && styles.colorSwatchSelected]}
                    onPress={() => setColor(c)}
                  >
                    <Text style={[styles.colorText, c === color && styles.colorTextSelected]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sizeHeader}>
                <Text style={styles.sectionTitle}>尺码</Text>
                {aiRecommendation && <AISizeBadge recommendation={aiRecommendation} />}
              </View>
              <View style={styles.sizeRow}>
                {sizes.map((s) => {
                  const outOfStock = stock <= 0;
                  const isRecommended = aiRecommendation?.recommendedSize === s;
                  return (
                    <View key={s} style={styles.sizeWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.sizeButton,
                          s === size && styles.sizeButtonSelected,
                          outOfStock && styles.sizeButtonDisabled,
                        ]}
                        onPress={() => !outOfStock && setSize(s)}
                        disabled={outOfStock}
                      >
                        <Text
                          style={[
                            styles.sizeText,
                            s === size && styles.sizeTextSelected,
                            outOfStock && styles.sizeTextDisabled,
                          ]}
                        >
                          {s}
                        </Text>
                        {isRecommended && !outOfStock && <Text style={styles.recDot}>AI</Text>}
                      </TouchableOpacity>
                      {outOfStock && (
                        <TouchableOpacity onPress={() => handleSubscribeStock(s)}>
                          <Text style={styles.notifyText}>到货通知我</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>数量</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => setQty(Math.max(1, qty - 1))}
                >
                  <Text style={styles.qtyButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => setQty(Math.min(stock, qty + 1))}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>
                <Text style={styles.stockText}>库存: {stock}</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>确认</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
  },
  title: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: DesignTokens.colors.text.primary },
  closeText: { fontSize: DesignTokens.typography.sizes.md, color: DesignTokens.colors.text.tertiary },
  body: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: DesignTokens.typography.sizes.base, fontWeight: "500", color: DesignTokens.colors.text.primary, marginBottom: 8 },
  sizeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: { borderColor: "DesignTokens.colors.semantic.error", borderWidth: 2 }, // custom color
  colorText: { fontSize: DesignTokens.typography.sizes.xs, color: DesignTokens.colors.text.secondary },
  colorTextSelected: { color: "DesignTokens.colors.semantic.error", fontWeight: "600" }, // custom color
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeWrapper: { alignItems: "center", marginBottom: 4 },
  sizeButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  sizeButtonSelected: { borderColor: "DesignTokens.colors.semantic.error", backgroundColor: "DesignTokens.colors.neutral[50]" }, // custom color
  sizeButtonDisabled: { backgroundColor: DesignTokens.colors.neutral[100], borderColor: DesignTokens.colors.neutral[100] },
  sizeText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.text.primary },
  sizeTextSelected: { color: "DesignTokens.colors.semantic.error", fontWeight: "600" }, // custom color
  sizeTextDisabled: { color: DesignTokens.colors.neutral[300] },
  recDot: { fontSize: 8, color: "DesignTokens.colors.semantic.success", fontWeight: "600" }, // custom color
  notifyText: { fontSize: DesignTokens.typography.sizes.xs, color: "DesignTokens.colors.semantic.error", marginTop: 2 }, // custom color
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: { fontSize: DesignTokens.typography.sizes.lg, color: DesignTokens.colors.text.primary },
  qtyValue: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    minWidth: 30,
    textAlign: "center",
  },
  stockText: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.text.tertiary },
  confirmButton: {
    backgroundColor: "DesignTokens.colors.semantic.error", // custom color
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: DesignTokens.colors.text.inverse },
});
