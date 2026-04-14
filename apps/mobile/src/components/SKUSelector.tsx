import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { AISizeBadge } from "./AISizeBadge";
import type { SizeRecommendation } from "../services/api/commerce.api";
import { stockNotificationApi } from "../services/api/commerce.api";

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
    } catch {
      // silent fail for now
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
                    style={[
                      styles.colorSwatch,
                      c === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    <Text
                      style={[
                        styles.colorText,
                        c === color && styles.colorTextSelected,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sizeHeader}>
                <Text style={styles.sectionTitle}>尺码</Text>
                {aiRecommendation && (
                  <AISizeBadge recommendation={aiRecommendation} />
                )}
              </View>
              <View style={styles.sizeRow}>
                {sizes.map((s) => {
                  const outOfStock = stock <= 0;
                  const isRecommended =
                    aiRecommendation?.recommendedSize === s;
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
                        {isRecommended && !outOfStock && (
                          <Text style={styles.recDot}>AI</Text>
                        )}
                      </TouchableOpacity>
                      {outOfStock && (
                        <TouchableOpacity
                          onPress={() => handleSubscribeStock(s)}
                        >
                          <Text style={styles.notifyText}>
                            到货通知我
                          </Text>
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
                <Text style={styles.stockText}>
                  库存: {stock}
                </Text>
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
    backgroundColor: "#FFFFFF",
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
    borderBottomColor: "#F0F0F0",
  },
  title: { fontSize: 16, fontWeight: "600", color: "#333333" },
  closeText: { fontSize: 16, color: "#999999" },
  body: { padding: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "500", color: "#333333", marginBottom: 8 },
  sizeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: { borderColor: "#FF4D4F", borderWidth: 2 },
  colorText: { fontSize: 10, color: "#666666" },
  colorTextSelected: { color: "#FF4D4F", fontWeight: "600" },
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeWrapper: { alignItems: "center", marginBottom: 4 },
  sizeButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  sizeButtonSelected: { borderColor: "#FF4D4F", backgroundColor: "#FFF5F5" },
  sizeButtonDisabled: { backgroundColor: "#F5F5F5", borderColor: "#F5F5F5" },
  sizeText: { fontSize: 14, color: "#333333" },
  sizeTextSelected: { color: "#FF4D4F", fontWeight: "600" },
  sizeTextDisabled: { color: "#CCCCCC" },
  recDot: { fontSize: 8, color: "#52C41A", fontWeight: "600" },
  notifyText: { fontSize: 10, color: "#FF4D4F", marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyButtonText: { fontSize: 18, color: "#333333" },
  qtyValue: { fontSize: 16, fontWeight: "600", color: "#333333", minWidth: 30, textAlign: "center" },
  stockText: { fontSize: 12, color: "#999999" },
  confirmButton: {
    backgroundColor: "#FF4D4F",
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
