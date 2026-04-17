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
import { merchantApi } from '../../../services/api/commerce.api';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';


type ScreenState = "form" | "pending" | "approved" | "rejected";

const BUSINESS_LICENSE_REGEX = /^[0-9A-HJ-NP-RTUW-Y]{2}\d{6}[0-9A-HJ-NP-RTUW-Y]{10}$/;
const PHONE_REGEX = /^1[3-9]\d{9}$/;

export const MerchantApplyScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
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
          setRejectReason((response.data as { reason?: string }).reason ?? "\u672A\u901A\u8FC7\u5BA1\u6838");
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
        Alert.alert("\u63D0\u4EA4\u5931\u8D25", response.error?.message ?? "\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      }
    } catch {
      Alert.alert("\u63D0\u4EA4\u5931\u8D25", "\u7F51\u7EDC\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
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
          <ActivityIndicator size="large" color={colors.error} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{"\u5546\u5BB6\u5165\u9A7B"}</Text>
      </View>

      {screenState === "form" ? (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.fieldLabel}>{"\u54C1\u724C\u540D\u79F0"}</Text>
          <TextInput
            style={styles.input}
            value={brandName}
            onChangeText={(text) => {
              setBrandName(text);
              setBrandNameError("");
            }}
            placeholder={"\u8BF7\u8F93\u5165\u54C1\u724C\u540D\u79F0"}
            placeholderTextColor={DesignTokens.colors.neutral[300]}
          />
          {brandNameError ? <Text style={styles.errorText}>{brandNameError}</Text> : null}

          <Text style={styles.fieldLabel}>{"\u8425\u4E1A\u6267\u7167\u53F7"}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={businessLicense}
              onChangeText={setBusinessLicense}
              placeholder="18\u4F4D\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801"
              placeholderTextColor={DesignTokens.colors.neutral[300]}
              maxLength={18}
            />
            {businessLicense.length > 0 && (
              <Ionicons
                name={isLicenseValid ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isLicenseValid ? colors.success : colors.error}
                style={styles.validationIcon}
              />
            )}
          </View>

          <Text style={styles.fieldLabel}>{"\u8054\u7CFB\u4EBA"}</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder={"\u8BF7\u8F93\u5165\u8054\u7CFB\u4EBA\u59D3\u540D"}
            placeholderTextColor={DesignTokens.colors.neutral[300]}
          />

          <Text style={styles.fieldLabel}>{"\u624B\u673A\u53F7"}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              value={phone}
              onChangeText={setPhone}
              placeholder={"\u8BF7\u8F93\u5165\u624B\u673A\u53F7"}
              placeholderTextColor={DesignTokens.colors.neutral[300]}
              keyboardType="phone-pad"
              maxLength={11}
            />
            {phone.length > 0 && (
              <Ionicons
                name={isPhoneValid ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isPhoneValid ? colors.success : colors.error}
                style={styles.validationIcon}
              />
            )}
          </View>

          <Text style={styles.fieldLabel}>{"\u54C1\u724C\u7B80\u4ECB"}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={"\u8BF7\u7B80\u8981\u4ECB\u7ECD\u54C1\u724C\uFF08\u9009\u586B\uFF09"}
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
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>{"\u63D0\u4EA4\u7533\u8BF7"}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      {screenState === "pending" ? (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={colors.error} />
          <Text style={styles.statusTitle}>{"\u7533\u8BF7\u5BA1\u6838\u4E2D"}</Text>
          <Text style={styles.statusMessage}>{"\u7533\u8BF7\u5DF2\u63D0\u4EA4\uFF0C\u6211\u4EEC\u5C06\u57281-3\u4E2A\u5DE5\u4F5C\u65E5\u5185\u5B8C\u6210\u5BA1\u6838"}</Text>
        </View>
      ) : null}

      {screenState === "approved" ? (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={styles.statusTitle}>{"\u606D\u559C\uFF01\u60A8\u7684\u5546\u5BB6\u7533\u8BF7\u5DF2\u901A\u8FC7"}</Text>
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>{"\u8FDB\u5165\u5546\u5BB6\u540E\u53F0"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {screenState === "rejected" ? (
        <View style={styles.statusContainer}>
          <Ionicons name="close-circle" size={64} color={colors.error} />
          <Text style={styles.statusTitle}>{"\u5F88\u62B1\u6B49\uFF0C\u60A8\u7684\u7533\u8BF7\u672A\u901A\u8FC7"}</Text>
          <Text style={styles.statusMessage}>{"\u539F\u56E0\uFF1A"}{rejectReason}</Text>
          <TouchableOpacity style={styles.submitButton} onPress={handleRetry}>
            <Text style={styles.submitButtonText}>{"\u91CD\u65B0\u7533\u8BF7"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, padding: Spacing.md},
  fieldLabel: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing['1.5'],
    marginTop: DesignTokens.spacing[3],
  },
  input: {
    borderWidth: 1,
    borderColor: DesignTokens.colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['2.5'],
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textPrimary,
  },
  inputRow: { position: "relative" },
  inputWithIcon: { paddingRight: DesignTokens.spacing[10]},
  validationIcon: { position: "absolute", right: DesignTokens.spacing[3], top: DesignTokens.spacing[3]},
  errorText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.error, marginTop: Spacing.xs},
  textArea: { height: Spacing['4xl'], textAlignVertical: "top" },
  charCount: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: Spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.error,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 10,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  submitButtonDisabled: { backgroundColor: colors.errorLight },
  submitButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  statusTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
    marginTop: Spacing.sm,
    textAlign: "center",
    lineHeight: 22,
  },
}))

export default MerchantApplyScreen;
