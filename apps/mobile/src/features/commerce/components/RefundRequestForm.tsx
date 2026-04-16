import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { refundApi } from '../../../services/api/commerce.api';

interface RefundItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface RefundRequestFormProps {
  visible: boolean;
  orderId: string;
  items: RefundItem[];
  totalAmount: number;
  onSubmit: () => void;
  onCancel: () => void;
}

const REFUND_REASONS = ["不想要了", "商品质量问题", "与描述不符", "其他"];

export const RefundRequestForm: React.FC<RefundRequestFormProps> = ({
  visible,
  orderId,
  items,
  totalAmount,
  onSubmit,
  onCancel,
}) => {
  const [refundType, setRefundType] = useState<"REFUND_ONLY" | "RETURN_REFUND">("REFUND_ONLY");
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await refundApi.createRefund({
        orderId,
        type: refundType,
        reason,
        description: description || undefined,
      });
      onSubmit();
    } catch {
      // error handled silently
    } finally {
      setSubmitting(false);
    }
  };

  const refundAmount = totalAmount;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>申请退款</Text>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.closeText}>关闭</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <Text style={styles.sectionTitle}>退款类型</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, refundType === "REFUND_ONLY" && styles.typeButtonActive]}
                onPress={() => setRefundType("REFUND_ONLY")}
              >
                <Text
                  style={[styles.typeText, refundType === "REFUND_ONLY" && styles.typeTextActive]}
                >
                  仅退款
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  refundType === "RETURN_REFUND" && styles.typeButtonActive,
                ]}
                onPress={() => setRefundType("RETURN_REFUND")}
              >
                <Text
                  style={[styles.typeText, refundType === "RETURN_REFUND" && styles.typeTextActive]}
                >
                  退货退款
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>退款原因</Text>
            {REFUND_REASONS.map((r) => (
              <TouchableOpacity key={r} style={styles.reasonRow} onPress={() => setReason(r)}>
                <View style={[styles.radioOuter, reason === r && styles.radioActive]}>
                  {reason === r && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.reasonText}>{r}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>补充说明</Text>
            <TextInput
              style={styles.textArea}
              multiline
              maxLength={200}
              placeholder="请描述退款原因（选填）"
              placeholderTextColor={DesignTokens.colors.neutral[300]}
              value={description}
              onChangeText={setDescription}
            />
            <Text style={styles.charCount}>{description.length}/200</Text>

            <Text style={styles.sectionTitle}>退款金额</Text>
            <Text style={styles.amountText}>¥{refundAmount.toFixed(2)}</Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? "提交中..." : "提交申请"}</Text>
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
    maxHeight: "80%",
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
  closeText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.text.tertiary },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.text.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  typeRow: { flexDirection: "row", gap: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "DesignTokens.colors.semantic.errorLight", // custom color
    borderWidth: 1,
    borderColor: "DesignTokens.colors.semantic.error", // custom color
  },
  typeText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.text.secondary },
  typeTextActive: { color: "DesignTokens.colors.semantic.error", fontWeight: "600" }, // custom color
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: DesignTokens.colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "DesignTokens.colors.semantic.error" }, // custom color
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "DesignTokens.colors.semantic.error", // custom color
  },
  reasonText: { fontSize: DesignTokens.typography.sizes.base, color: DesignTokens.colors.text.primary },
  textArea: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    color: DesignTokens.colors.text.primary,
  },
  charCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
    textAlign: "right",
    marginTop: 4,
  },
  amountText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: "DesignTokens.colors.semantic.error", // custom color
  },
  submitButton: {
    backgroundColor: "DesignTokens.colors.semantic.error", // custom color
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.text.inverse,
  },
});
