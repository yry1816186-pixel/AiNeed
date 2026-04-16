import React, { useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from "react-native";
import { Snackbar } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useNotificationStore } from '../stores/notificationStore';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { RootStackParamList } from '../../../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

interface CategoryToggle {
  key: "order" | "recommendation" | "community" | "system";
  title: string;
  description: string;
  icon: string;
}

const CATEGORY_TOGGLES: CategoryToggle[] = [
  {
    key: "order",
    title: "Order Notifications",
    description: "Payment, shipping, delivery status",
    icon: "bag-outline",
  },
  {
    key: "recommendation",
    title: "Recommendations",
    description: "Daily outfits, new styles, price drops",
    icon: "sparkles-outline",
  },
  {
    key: "community",
    title: "Community",
    description: "Likes, comments, followers",
    icon: "people-outline",
  },
  {
    key: "system",
    title: "System",
    description: "Updates, security, announcements",
    icon: "information-circle-outline",
  },
];

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { settings, settingsLoading, fetchSettings, updateSettings } = useNotificationStore();
  const error = useNotificationStore(state => state.error);
  const clearError = useNotificationStore(state => state.clearError);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleToggle = useCallback(
    (key: CategoryToggle["key"], value: boolean) => {
      void updateSettings({ [key]: value });
    },
    [updateSettings]
  );

  const handleQuietHoursToggle = useCallback(
    (value: boolean) => {
      void updateSettings({ quietHoursEnabled: value });
    },
    [updateSettings]
  );

  const handleTimeAdjust = useCallback(
    (field: "quietHoursStart" | "quietHoursEnd", direction: "up" | "down") => {
      if (!settings) {
        return;
      }
      const current = settings[field];
      const [hours, minutes] = current.split(":").map(Number);
      let newMinutes = hours * 60 + minutes + (direction === "up" ? 30 : -30);
      if (newMinutes < 0) {
        newMinutes = 0;
      }
      if (newMinutes >= 1440) {
        newMinutes = 1430;
      }
      const newHours = Math.floor(newMinutes / 60);
      const newMins = newMinutes % 60;
      const newTime = `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
      void updateSettings({ [field]: newTime });
    },
    [settings, updateSettings]
  );

  const allEnabled = settings
    ? settings.order || settings.recommendation || settings.community || settings.system
    : true;

  const handleMasterToggle = useCallback(
    (value: boolean) => {
      void updateSettings({
        order: value,
        recommendation: value,
        community: value,
        system: value,
      });
    },
    [updateSettings]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Master toggle */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDesc}>Enable push notifications</Text>
            </View>
            <Switch
              value={allEnabled}
              onValueChange={handleMasterToggle}
              accessibilityLabel="Push notifications master switch"
              trackColor={{ false: DesignTokens.colors.neutral[200], true: colors.primary }}
              thumbColor={DesignTokens.colors.neutral.white}
            />
          </View>
        </View>

        {/* Category toggles */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.section}>
          {CATEGORY_TOGGLES.map((toggle, index) => (
            <View
              key={toggle.key}
              style={[
                styles.settingItem,
                index < CATEGORY_TOGGLES.length - 1 && styles.settingItemBorder,
              ]}
            >
              <View style={[styles.categoryIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons
                  name={toggle.icon as "bag-outline"}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{toggle.title}</Text>
                <Text style={styles.settingDesc}>{toggle.description}</Text>
              </View>
              <Switch
                value={settings?.[toggle.key] ?? true}
                onValueChange={(value) => handleToggle(toggle.key, value)}
                accessibilityLabel={`${toggle.title} notifications`}
                trackColor={{ false: DesignTokens.colors.neutral[200], true: colors.primary }}
                thumbColor={DesignTokens.colors.neutral.white}
              />
            </View>
          ))}
        </View>

        {/* Quiet hours */}
        <Text style={styles.sectionTitle}>Quiet Hours</Text>
        <View style={styles.section}>
          <View style={[styles.settingItem, styles.settingItemBorder]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Do Not Disturb</Text>
              <Text style={styles.settingDesc}>Silence notifications during set hours</Text>
            </View>
            <Switch
              value={settings?.quietHoursEnabled ?? false}
              onValueChange={handleQuietHoursToggle}
              accessibilityLabel="Quiet hours toggle"
              trackColor={{ false: DesignTokens.colors.neutral[200], true: colors.primary }}
              thumbColor={DesignTokens.colors.neutral.white}
            />
          </View>

          {settings?.quietHoursEnabled && (
            <View style={styles.quietHoursRow}>
              <View style={styles.timePicker}>
                <TouchableOpacity
                  onPress={() => handleTimeAdjust("quietHoursStart", "up")}
                  accessibilityLabel="Increase start time"
                >
                  <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{settings.quietHoursStart}</Text>
                <TouchableOpacity
                  onPress={() => handleTimeAdjust("quietHoursStart", "down")}
                  accessibilityLabel="Decrease start time"
                >
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.timeSeparator}>to</Text>
              <View style={styles.timePicker}>
                <TouchableOpacity
                  onPress={() => handleTimeAdjust("quietHoursEnd", "up")}
                  accessibilityLabel="Increase end time"
                >
                  <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.timeValue}>{settings.quietHoursEnd}</Text>
                <TouchableOpacity
                  onPress={() => handleTimeAdjust("quietHoursEnd", "down")}
                  accessibilityLabel="Decrease end time"
                >
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={3000}
        action={{ label: '关闭', onPress: clearError }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: colors.text },
  placeholder: { width: 40 },
  content: { flex: 1 },
  sectionTitle: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[100],
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "500", color: colors.text },
  settingDesc: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  quietHoursRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 20,
  },
  timePicker: {
    alignItems: "center",
    gap: 4,
  },
  timeValue: {
    fontSize: DesignTokens.typography.sizes['2xl'],
    fontWeight: "600",
    color: colors.textPrimary,
  },
  timeSeparator: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
  },
});

export default NotificationSettingsScreen;
