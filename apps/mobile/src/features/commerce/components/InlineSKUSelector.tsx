import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { cartEnhancementApi } from "../services/api/commerce.api";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface InlineSKUSelectorProps {
  visible: boolean;
  colors: string[];
  sizes: string[];
  currentColor: string;
  currentSize: string;
  cartItemId: string;
  onChange: (newColor: string, newSize: string) => void;
  onClose: () => void;
}

export const InlineSKUSelector: React.FC<InlineSKUSelectorProps> = ({
  visible,
  colors,
  sizes,
  currentColor,
  currentSize,
  cartItemId,
  onChange,
  onClose,
}) => {
  const [color, setColor] = useState(currentColor);
  const [size, setSize] = useState(currentSize);

  const handleConfirm = async () => {
    try {
      await cartEnhancementApi.updateCartItemSku(cartItemId, color, size);
      onChange(color, size);
    } catch {
      // silent
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>修改规格</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={styles.sectionTitle}>颜色</Text>
            <View style={styles.row}>
              {colors.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, c === color && styles.chipSelected]}
                  onPress={() => setColor(c)}
                >
                  <Text style={[styles.chipText, c === color && styles.chipTextSelected]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionTitle}>尺码</Text>
            <View style={styles.row}>
              {sizes.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, s === size && styles.chipSelected]}
                  onPress={() => setSize(s)}
                >
                  <Text style={[styles.chipText, s === size && styles.chipTextSelected]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={styles.confirm} onPress={handleConfirm}>
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
    maxHeight: "50%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: { fontSize: 16, fontWeight: "600", color: DesignTokens.colors.text.primary },
  close: { fontSize: 16, color: DesignTokens.colors.text.tertiary },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: DesignTokens.colors.text.primary,
    marginBottom: 8,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DesignTokens.colors.backgrounds.tertiary,
  },
  chipSelected: { backgroundColor: "#FFF0F0", borderWidth: 1, borderColor: "#FF4D4F" },
  chipText: { fontSize: 14, color: DesignTokens.colors.text.secondary },
  chipTextSelected: { color: "#FF4D4F", fontWeight: "500" },
  confirm: {
    backgroundColor: "#FF4D4F",
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
