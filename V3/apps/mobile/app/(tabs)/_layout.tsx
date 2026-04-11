import { Tabs } from 'expo-router';
import { StyleSheet, TouchableOpacity, Platform, View } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, typography } from '../../src/theme';
import { useRouter } from 'expo-router';

function HomeIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.accent : colors.textTertiary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15C15 14.4477 14.5523 14 14 14H10C9.44772 14 9 14.4477 9 15V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StylistIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.accent : colors.textTertiary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WardrobeIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.accent : colors.textTertiary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3H18C18.5523 3 19 3.44772 19 4V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V4C5 3.44772 5.44772 3 6 3Z"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path d="M12 3V21" stroke={color} strokeWidth="1.8" />
      <Path d="M5 8H19" stroke={color} strokeWidth="1.8" />
      <Circle cx="10" cy="5.5" r="0.8" fill={color} />
      <Circle cx="14" cy="5.5" r="0.8" fill={color} />
    </Svg>
  );
}

function ProfileIcon({ focused }: { focused: boolean }) {
  const color = focused ? colors.accent : colors.textTertiary;
  return (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <Path
        d="M4 21C4 16.5817 7.58172 13 12 13C16.4183 13 20 16.5817 20 21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CenterButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.centerButton}
      onPress={() => router.push('/(tabs)')}
      activeOpacity={0.85}
    >
      <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <Path d="M14 4V24M4 14H24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          elevation: 0,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stylist"
        options={{
          title: '造型',
          tabBarIcon: ({ focused }) => <StylistIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="actions"
        options={{
          title: '',
          tabBarIcon: () => <View style={{ width: 1, height: 1 }} />,
          tabBarButton: () => <CenterButton />,
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: '衣橱',
          tabBarIcon: ({ focused }) => <WardrobeIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => <ProfileIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
