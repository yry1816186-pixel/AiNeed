import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { cartEnhancementApi } from '../../../services/api/commerce.api';
import { DesignTokens, Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
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

const useStyles = createStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "50%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "colors.backgroundTertiary",
  },
  title: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary },
  close: { fontSize: DesignTokens.typography.sizes.md, color: colors.textTertiary },
  body: { padding: Spacing.md},
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.md},
  chip: {
    paddingHorizontal: DesignTokens.spacing['3.5'],
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
  },
  chipSelected: { backgroundColor: "colors.errorLight", borderWidth: 1, borderColor: "colors.error" },
  chipText: { fontSize: DesignTokens.typography.sizes.base, color: colors.textSecondary },
  chipTextSelected: { color: "colors.error", fontWeight: "500" },
  confirm: {
    backgroundColor: "colors.error",
    paddingVertical: DesignTokens.spacing['3.5'],
    alignItems: "center",
  },
  confirmText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.surface },
}))
