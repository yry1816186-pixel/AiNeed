import React, { useEffect, useState } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

interface NetworkErrorProps {
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

const OfflineIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M60 98C63.3137 98 66 95.3137 66 92C66 88.6863 63.3137 86 60 86C56.6863 86 54 88.6863 54 92C54 95.3137 56.6863 98 60 98Z"
      fill={colors.gray300}
    />
    <Path
      d="M40 80C46.5 73 52.5 69 60 69C67.5 69 73.5 73 80 80"
      stroke={colors.gray300}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M25 66C35 56 46 50 60 50C74 50 85 56 95 66"
      stroke={colors.gray300}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M12 52C25 40 40 32 60 32C80 32 95 40 108 52"
      stroke={colors.gray300}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M22 104L98 16"
      stroke={colors.error}
      strokeWidth={4.5}
      strokeLinecap="round"
    />
  </Svg>
);

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, style }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const handleCheckNetwork = (): void => {
    NetInfo.refresh().then((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? false);
      if (state.isConnected && onRetry) {
        onRetry();
      }
    });
  };

  if (isConnected === null) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <OfflineIllustration />
      <Text variant="h3" align="center" style={styles.title}>
        网络不可用
      </Text>
      <Text variant="body2" color={colors.textTertiary} align="center" style={styles.message}>
        请检查你的网络连接后重试
      </Text>
      <Button variant="primary" size="medium" onPress={handleCheckNetwork}>
        检查网络
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 260,
    marginBottom: spacing.xl,
  },
});
