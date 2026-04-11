import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { theme } from '../theme';

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [recommendations, setRecommendations] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityLabel="返回">
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>通知设置</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>推送通知</Text>
              <Text style={styles.settingDesc}>接收应用推送通知</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              accessibilityLabel="推送通知开关"
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>邮件通知</Text>
              <Text style={styles.settingDesc}>接收邮件通知</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              accessibilityLabel="邮件通知开关"
            />
          </View>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>推荐提醒</Text>
              <Text style={styles.settingDesc}>接收个性化推荐通知</Text>
            </View>
            <Switch
              value={recommendations}
              onValueChange={setRecommendations}
              accessibilityLabel="推荐提醒开关"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F3F4', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  placeholder: { width: 40 },
  content: { flex: 1 },
  section: { backgroundColor: theme.colors.surface, margin: 20, borderRadius: 16, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F3F4' },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: theme.colors.text },
  settingDesc: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
});

export default NotificationSettingsScreen;
