import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, typography, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';

interface WeatherGreetingProps {
  nickname?: string;
  avatarUrl?: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '早上好';
  if (hour >= 12 && hour < 18) return '下午好';
  return '晚上好';
}

function getWeatherIcon(): React.ReactNode {
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 18;

  if (isDaytime) {
    return (
      <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <Circle cx="10" cy="10" r="4" fill={colors.warning} />
        <Path
          d="M10 2V4M10 16V18M2 10H4M16 10H18M4.93 4.93L6.34 6.34M13.66 13.66L15.07 15.07M4.93 15.07L6.34 13.66M13.66 6.34L15.07 4.93"
          stroke={colors.warning}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  return (
    <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <Path
        d="M17 12.5C17 15.5376 14.5376 18 11.5 18C8.46243 18 6 15.5376 6 12.5C6 9.46243 8.46243 7 11.5 7C11.6684 7 11.8352 7.00689 12 7.02038V7C12 4.23858 14.2386 2 17 2V12.5Z"
        fill={colors.infoLight}
      />
      <Circle cx="5" cy="5" r="1.5" fill={colors.warning} />
      <Circle cx="3" cy="10" r="1" fill={colors.warning} />
    </Svg>
  );
}

export const WeatherGreeting: React.FC<WeatherGreetingProps> = React.memo(
  ({ nickname, avatarUrl }) => {
    const greeting = useMemo(() => getGreeting(), []);
    const displayName = nickname ?? '用户';
    const weatherIcon = useMemo(() => getWeatherIcon(), []);

    return (
      <View style={styles.container}>
        <View style={styles.left}>
          <View style={styles.greetingRow}>
            <Text variant="h2" style={styles.greetingText}>
              {greeting}, {displayName}
            </Text>
            {weatherIcon}
          </View>
          <Text variant="bodySmall" color={colors.textTertiary}>
            今天穿什么好呢？
          </Text>
        </View>
        <Avatar
          size="md"
          source={avatarUrl ? { uri: avatarUrl } : undefined}
          placeholder={displayName}
        />
      </View>
    );
  },
);

WeatherGreeting.displayName = 'WeatherGreeting';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  left: {
    flex: 1,
    marginRight: spacing.md,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingText: {
    color: colors.textPrimary,
  },
});
