import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Svg, Path, Circle, Rect, Ellipse, Line } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, typography } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { ActionSheet } from '../../src/components/actions/ActionSheet';
import { QuickActionCard } from '../../src/components/actions/QuickActionCard';

function TryOnActionIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 3C11.7909 3 10 4.79086 10 7V11C10 13.2091 11.7909 15 14 15C16.2091 15 18 13.2091 18 11V7C18 4.79086 16.2091 3 14 3Z"
        stroke={colors.accent}
        strokeWidth="1.6"
      />
      <Path
        d="M6 25C6 19.4772 9.58172 15 14 15C18.4183 15 22 19.4772 22 25"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M8 10H5L3 15H8"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 10H23L25 15H20"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CustomizeActionIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Path
        d="M7 3L21 3L25 10L14 25L3 10L7 3Z"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <Path d="M3 10H25" stroke={colors.accent} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M11 10L14 25" stroke={colors.accent} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M17 10L14 25" stroke={colors.accent} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M20 5L17 3" stroke={colors.accent} strokeWidth="1.6" strokeLinecap="round" />
      <Path d="M8 5L11 3" stroke={colors.accent} strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

function PostActionIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Rect
        x="3"
        y="3"
        width="22"
        height="22"
        rx="3"
        stroke={colors.accent}
        strokeWidth="1.6"
      />
      <Path
        d="M9 14H19"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M14 9V19"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function BespokeActionIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Path
        d="M14 3L16.5 9.5L24 10.5L18.5 15.5L20 22.5L14 19L8 22.5L9.5 15.5L4 10.5L11.5 9.5L14 3Z"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <Path
        d="M10 13H18"
        stroke={colors.accent}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <Path
        d="M12 16H16"
        stroke={colors.accent}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MarketActionIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Path
        d="M3 10L5 3H23L25 10"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="3"
        y="10"
        width="22"
        height="15"
        rx="2"
        stroke={colors.accent}
        strokeWidth="1.6"
      />
      <Path d="M10 10V25" stroke={colors.accent} strokeWidth="1.4" />
      <Path d="M18 10V25" stroke={colors.accent} strokeWidth="1.4" />
      <Path d="M3 17H25" stroke={colors.accent} strokeWidth="1.4" />
      <Path
        d="M10 3L14 10L18 3"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AIStylistActionIcon() {
  return (
    <Svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <Circle cx="14" cy="10" r="5" stroke={colors.accent} strokeWidth="1.6" />
      <Path
        d="M5 25C5 19.4772 9.02944 15 14 15C18.9706 15 23 19.4772 23 25"
        stroke={colors.accent}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Path
        d="M17 8L20 5"
        stroke={colors.accent}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <Path
        d="M11 8L8 5"
        stroke={colors.accent}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <Circle cx="11.5" cy="9.5" r="0.8" fill={colors.accent} />
      <Circle cx="16.5" cy="9.5" r="0.8" fill={colors.accent} />
    </Svg>
  );
}

interface ActionItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  color: string;
}

export default function ActionsScreen() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => setVisible(true), 150);
      return () => {
        clearTimeout(timer);
        setVisible(false);
      };
    }, []),
  );

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      }
    }, 300);
  }, [router]);

  const handleTryOn = useCallback(() => {
    setVisible(false);
    setTimeout(() => router.push('/(tabs)'), 350);
  }, [router]);

  const handleCustomize = useCallback(() => {
    setVisible(false);
    setTimeout(() => router.push('/customize/select-product'), 350);
  }, [router]);

  const handlePost = useCallback(() => {
    setVisible(false);
    setTimeout(() => router.push('/community/create'), 350);
  }, [router]);

  const handleBespoke = useCallback(() => {
    setVisible(false);
    setTimeout(() => router.push('/bespoke'), 350);
  }, [router]);

  const handleMarket = useCallback(() => {
    setVisible(false);
    setTimeout(() => router.push('/market'), 350);
  }, [router]);

  const handleAIStylist = useCallback(() => {
    setVisible(false);
    setTimeout(() => router.push('/(tabs)/stylist'), 350);
  }, [router]);

  const actions: ActionItem[] = [
    { key: 'tryon', label: '虚拟试衣', icon: <TryOnActionIcon />, onPress: handleTryOn, color: colors.accent },
    { key: 'customize', label: '服装定制', icon: <CustomizeActionIcon />, onPress: handleCustomize, color: '#8B5CF6' },
    { key: 'post', label: '发帖分享', icon: <PostActionIcon />, onPress: handlePost, color: '#F59E0B' },
    { key: 'bespoke', label: '高端定制', icon: <BespokeActionIcon />, onPress: handleBespoke, color: '#EC4899' },
    { key: 'market', label: '设计市集', icon: <MarketActionIcon />, onPress: handleMarket, color: '#10B981' },
    { key: 'stylist', label: 'AI搭配', icon: <AIStylistActionIcon />, onPress: handleAIStylist, color: '#3B82F6' },
  ];

  return (
    <View style={styles.container}>
      <ActionSheet visible={visible} onClose={handleClose}>
        <View style={styles.content}>
          <View style={styles.grid}>
            {actions.map((action) => (
              <QuickActionCard
                key={action.key}
                icon={action.icon}
                label={action.label}
                onPress={action.onPress}
                color={action.color}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
            <Text variant="buttonSmall" color={colors.textTertiary} align="center">
              取消
            </Text>
          </TouchableOpacity>
        </View>
      </ActionSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
