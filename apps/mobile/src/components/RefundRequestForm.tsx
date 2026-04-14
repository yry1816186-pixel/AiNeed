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
import { refundApi } from "../services/api/commerce.api";

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

const REFUND_REASONS = [
  "不想要了",
  "商品质量问题",
  "与描述不符",
  "其他",
];

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
                style={[
                  styles.typeButton,
                  refundType === "REFUND_ONLY" && styles.typeButtonActive,
                ]}
                onPress={() => setRefundType("REFUND_ONLY")}
              >
                <Text
                  style={[
                    styles.typeText,
                    refundType === "REFUND_ONLY" && styles.typeTextActive,
                  ]}
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
                  style={[
                    styles.typeText,
                    refundType === "RETURN_REFUND" && styles.typeTextActive,
                  ]}
                >
                  退货退款
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>退款原因</Text>
            {REFUND_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={styles.reasonRow}
                onPress={() => setReason(r)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    reason === r && styles.radioActive,
                  ]}
                >
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
              placeholderTextColor="#CCCCCC"
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
            <Text style={styles.submitText}>
              {submitting ? "提交中..." : "提交申请"}
            </Text>
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
    maxHeight: "80%",
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
  closeText: { fontSize: 14, color: "#999999" },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333333",
    marginBottom: 8,
    marginTop: 12,
  },
  typeRow: { flexDirection: "row", gap: 12 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FF4D4F",
  },
  typeText: { fontSize: 14, color: "#666666" },
  typeTextActive: { color: "#FF4D4F", fontWeight: "600" },
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
    borderColor: "#CCCCCC",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: "#FF4D4F" },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4D4F",
  },
  reasonText: { fontSize: 14, color: "#333333" },
  textArea: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: "top",
    color: "#333333",
  },
  charCount: {
    fontSize: 12,
    color: "#999999",
    textAlign: "right",
    marginTop: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF4D4F",
  },
  submitButton: {
    backgroundColor: "#FF4D4F",
    paddingVertical: 16,
    alignItems: "center",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
