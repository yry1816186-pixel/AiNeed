import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { merchantApi } from '../../../services/api/commerce.api";
import { DesignTokens } from '../../../theme/tokens/design-tokens";

type ScreenState = "form" | "pending" | "approved" | "rejected";

const BUSINESS_LICENSE_REGEX = /^[0-9A-HJ-NP-RTUW-Y]{2}\d{6}[0-9A-HJ-NP-RTUW-Y]{10}$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export const MerchantApplyScreen: React.FC = () => {
  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [brandName, setBrandName] = useState("");
  const [businessLicense, setBusinessLicense] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [brandNameError, setBrandNameError] = useState("");

  const checkExistingApplication = useCallback(async () => {
    try {
      const response = await merchantApi.getMerchantApplicationStatus();
      if (response.success && response.data) {
        const status = response.data.status;
        if (status === "pending" || status === "PENDING") {
          setScreenState("pending");
        } else if (status === "approved" || status === "APPROVED") {
          setScreenState("approved");
        } else if (status === "rejected" || status === "REJECTED") {
          setScreenState("rejected");
          setRejectReason((response.data as any).reason ?? "未通过审核");
        }
      }
    } catch {
      // No existing application, show form
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkExistingApplication();
  }, [checkExistingApplication]);

  const isLicenseValid = BUSINESS_LICENSE_REGEX.test(businessLicense);
  const isPhoneValid = PHONE_REGEX.test(phone);
  const isFormValid =
    brandName.trim().length > 0 &&
    isLicenseValid &&
    contactName.trim().length > 0 &&
    isPhoneValid &&
    description.length <= 500;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await merchantApi.applyForMerchant({
        brandName: brandName.trim(),
        businessLicense,
        contactName: contactName.trim(),
        phone,
        description: description.trim() || undefined,
      });
      if (response.success) {
        setScreenState("pending");
      } else {
        Alert.alert("提交失败", response.error?.message ?? "请稍后重试");
      }
    } catch {
      Alert.alert("提交失败", "网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setScreenState("form");
    setBrandName("");
    setBusinessLicense("");
    setContactName("");
    setPhone("");
    setDescription("");
    setRejectReason("");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={DesignTokens.colors.semantic.error} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>商家入驻</Text>
      </View>

      {screenState === "form" ? (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>品牌名称</Text>
          <TextInput
            style={styles.input}
            value={brandName}
            onChangeText={(text) => {
              setBrandName(text);
              setBrandNameError("");
            }}
            placeholder="请输入品牌名称"
            placeholderTextColor={DesignTokens.colors.neutral[300]}
          />
          {brandNameError ? <Text style={styles.errorText}>{brandNameError}</Text> : null}

          <Text style={styles.fieldLabel}>营业执照号</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={businessLicense}
              onChangeText={setBusinessLicense}
              placeholder="18位统一社会信用代码"
              placeholderTextColor={DesignTokens.colors.neutral[300]}
              maxLength={18}
            />
            {businessLicense.length > 0 && (
              <Ionicons
                name={isLicenseValid ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isLicenseValid ? DesignTokens.colors.semantic.success : DesignTokens.colors.semantic.error}
                style={styles.validationIcon}
              />
            )}
          </View>

          <Text style={styles.fieldLabel}>联系人</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="请输入联系人姓名"
            placeholderTextColor={DesignTokens.colors.neutral[300]}
          />

          <Text style={styles.fieldLabel}>手机号</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入手机号"
              placeholderTextColor={DesignTokens.colors.neutral[300]}
              keyboardType="phone-pad"
              maxLength={11}
            />
            {phone.length > 0 && (
              <Ionicons
                name={isPhoneValid ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isPhoneValid ? DesignTokens.colors.semantic.success : DesignTokens.colors.semantic.error}
                style={styles.validationIcon}
              />
            )}
          </View>

          <Text style={styles.fieldLabel}>品牌简介</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="请简要介绍品牌（选填）"
            placeholderTextColor={DesignTokens.colors.neutral[300]}
            multiline
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          <TouchableOpacity
            style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isFormValid || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
            ) : (
              <Text style={styles.submitButtonText}>提交申请</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {screenState === "pending" ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={DesignTokens.colors.semantic.error} />
          <Text style={styles.statusTitle}>申请审核中</Text>
          <Text style={styles.statusMessage}>申请已提交，我们将在1-3个工作日内完成审核</Text>
        </View>
      ) : null}

      {screenState === "approved" ? (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={64} color={DesignTokens.colors.semantic.success} />
          <Text style={styles.statusTitle}>恭喜！您的商家申请已通过</Text>
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>进入商家后台</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {screenState === "rejected" ? (
        <View style={styles.statusContainer}>
          <Ionicons name="close-circle" size={64} color={DesignTokens.colors.semantic.error} />
          <Text style={styles.statusTitle}>很抱歉，您的申请未通过</Text>
          <Text style={styles.statusMessage}>原因：{rejectReason}</Text>
          <TouchableOpacity style={styles.submitButton} onPress={handleRetry}>
            <Text style={styles.submitButtonText}>重新申请</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DesignTokens.colors.backgrounds.primary },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: DesignTokens.colors.text.primary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, padding: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: DesignTokens.colors.text.primary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DesignTokens.colors.text.primary,
  },
  inputRow: { position: "relative" },
  inputWithIcon: { paddingRight: 40 },
  validationIcon: { position: "absolute", right: 12, top: 12 },
  errorText: { fontSize: 12, color: DesignTokens.colors.semantic.error, marginTop: 4 },
  textArea: { height: 80, textAlignVertical: "top" },
  charCount: {
    fontSize: 12,
    color: DesignTokens.colors.text.tertiary,
    textAlign: "right",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: DesignTokens.colors.semantic.error,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: { backgroundColor: "#FFB0B0" }, // custom color
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: DesignTokens.colors.text.primary,
    marginTop: 16,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 14,
    color: DesignTokens.colors.text.tertiary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default MerchantApplyScreen;
