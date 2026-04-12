import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Svg width={80} height={80} viewBox="0 0 80 80" fill="none">
            <Path
              d="M40 8L74 68H6L40 8Z"
              stroke={colors.warning}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <Path
              d="M40 30V46"
              stroke={colors.warning}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Circle cx={40} cy={55} r={2.5} fill={colors.warning} />
          </Svg>
          <Text variant="h3" align="center" style={styles.title}>
            出了点问题
          </Text>
          <Text variant="body2" color={colors.textTertiary} align="center" style={styles.message}>
            应用遇到了一个意外错误
          </Text>
          <Button variant="primary" size="medium" onPress={this.handleRetry}>
            重试
          </Button>
        </View>
      );
    }

    return this.props.children;
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };
}

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
    marginBottom: spacing.xl,
    maxWidth: 260,
  },
});
