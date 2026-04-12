import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

export type ErrorIllustration = 'network' | 'server' | 'permission' | 'notFound';

interface ErrorScreenProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  illustration?: ErrorIllustration;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const NetworkIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M60 95C62.7614 95 65 92.7614 65 90C65 87.2386 62.7614 85 60 85C57.2386 85 55 87.2386 55 90C55 92.7614 57.2386 95 60 95Z"
      fill={colors.gray300}
    />
    <Path
      d="M42 78C47.5 72 53.5 69 60 69C66.5 69 72.5 72 78 78"
      stroke={colors.gray300}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M28 65C37 56 47.5 51 60 51C72.5 51 83 56 92 65"
      stroke={colors.gray300}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M15 52C28 40 42.5 33 60 33C77.5 33 92 40 105 52"
      stroke={colors.gray300}
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M25 100L95 20"
      stroke={colors.error}
      strokeWidth={4}
      strokeLinecap="round"
    />
  </Svg>
);

const ServerIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M35 25H85C87.2091 25 89 26.7909 89 29V49C89 51.2091 87.2091 53 85 53H35C32.7909 53 31 51.2091 31 49V29C31 26.7909 32.7909 25 35 25Z"
      stroke={colors.gray300}
      strokeWidth={3}
    />
    <Circle cx={42} cy={39} r={3} fill={colors.error} />
    <Path d="M70 39H82" stroke={colors.gray200} strokeWidth={3} strokeLinecap="round" />
    <Path
      d="M35 67H85C87.2091 67 89 68.7909 89 71V91C89 93.2091 87.2091 95 85 95H35C32.7909 95 31 93.2091 31 91V71C31 68.7909 32.7909 67 35 67Z"
      stroke={colors.gray300}
      strokeWidth={3}
    />
    <Circle cx={42} cy={81} r={3} fill={colors.warning} />
    <Path d="M70 81H82" stroke={colors.gray200} strokeWidth={3} strokeLinecap="round" />
  </Svg>
);

const PermissionIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M60 20C51.7157 20 45 26.7157 45 35V48H38C35.7909 48 34 49.7909 34 52V98C34 100.209 35.7909 102 38 102H82C84.2091 102 86 100.209 86 98V52C86 49.7909 84.2091 48 82 48H75V35C75 26.7157 68.2843 20 60 20ZM67 48H53V35C53 31.134 56.134 28 60 28C63.866 28 67 31.134 67 35V48Z"
      fill={colors.gray200}
    />
    <Circle cx={60} cy={72} r={5} fill={colors.white} />
    <Path d="M60 80V92" stroke={colors.white} strokeWidth={4} strokeLinecap="round" />
  </Svg>
);

const NotFoundIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Circle cx={50} cy={50} r={28} stroke={colors.gray300} strokeWidth={4} fill="none" />
    <Path d="M70 70L100 100" stroke={colors.gray300} strokeWidth={6} strokeLinecap="round" />
    <Path
      d="M45 44C45 40.6863 47.6863 38 51 38C54.3137 38 57 40.6863 57 44C57 47.3137 54.3137 48 51 48V54"
      stroke={colors.gray400}
      strokeWidth={3}
      strokeLinecap="round"
    />
    <Circle cx={51} cy={61} r={2.5} fill={colors.gray400} />
  </Svg>
);

const illustrations: Record<ErrorIllustration, React.FC> = {
  network: NetworkIllustration,
  server: ServerIllustration,
  permission: PermissionIllustration,
  notFound: NotFoundIllustration,
};

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  title,
  message,
  onRetry,
  illustration = 'network',
  retryLabel = '重试',
  style,
}) => {
  const Illustration = illustrations[illustration];

  return (
    <View style={[styles.container, style]}>
      <Illustration />
      <Text variant="h3" align="center" style={styles.title}>
        {title}
      </Text>
      {message && (
        <Text variant="body2" color={colors.textTertiary} align="center" style={styles.message}>
          {message}
        </Text>
      )}
      {onRetry && (
        <Button variant="primary" size="medium" onPress={onRetry} style={styles.retryButton}>
          {retryLabel}
        </Button>
      )}
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
    maxWidth: 280,
    marginBottom: spacing.xl,
  },
  retryButton: {
    marginTop: spacing.lg,
  },
});
