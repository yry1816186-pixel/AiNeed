import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Card } from '../Card';

jest.mock('@/src/polyfills/expo-linear-gradient', () => {
  const { View } = require('react-native');
  const MockLinearGradient = (props) => <View {...props} />;
  MockLinearGradient.displayName = 'LinearGradient';
  return { LinearGradient: MockLinearGradient, default: MockLinearGradient };
});

jest.mock('@/src/polyfills/expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  default: {
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  },
}));

jest.mock('expo-blur', () => {
  const { View } = require('react-native');
  return { BlurView: View, BlurViewPropTypes: {} };
});

describe('Card', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>Card Content</Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('applies custom styles', () => {
    const { getByText } = render(
      <Card style={{ marginTop: 10 }}>Styled Card</Card>
    );
    expect(getByText('Styled Card')).toBeTruthy();
  });

  it('renders elevated variant by default', () => {
    const { getByText } = render(<Card>Elevated</Card>);
    expect(getByText('Elevated')).toBeTruthy();
  });

  it('renders outlined variant', () => {
    const { getByText } = render(<Card variant="outlined">Outlined</Card>);
    expect(getByText('Outlined')).toBeTruthy();
  });

  it('renders filled variant', () => {
    const { getByText } = render(<Card variant="filled">Filled</Card>);
    expect(getByText('Filled')).toBeTruthy();
  });

  it('renders glass variant', () => {
    const { getByText } = render(<Card variant="glass">Glass</Card>);
    expect(getByText('Glass')).toBeTruthy();
  });

  it('renders gradient variant', () => {
    const { getByText } = render(<Card variant="gradient">Gradient</Card>);
    expect(getByText('Gradient')).toBeTruthy();
  });

  it('handles press events when interactive', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card interactive onPress={onPress}>Touchable</Card>
    );
    fireEvent.press(getByText('Touchable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render as touchable when not interactive', () => {
    const { getByText, queryByRole } = render(
      <Card>Non-interactive</Card>
    );
    expect(getByText('Non-interactive')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('handles long press events when interactive', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <Card interactive onPress={jest.fn()} onLongPress={onLongPress}>
        Long Press
      </Card>
    );
    fireEvent(getByText('Long Press'), 'onLongPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('applies padding sm', () => {
    const { getByText } = render(<Card padding="sm">Padded</Card>);
    expect(getByText('Padded')).toBeTruthy();
  });

  it('applies padding md by default', () => {
    const { getByText } = render(<Card>Default Padding</Card>);
    expect(getByText('Default Padding')).toBeTruthy();
  });

  it('applies padding lg', () => {
    const { getByText } = render(<Card padding="lg">Large Padding</Card>);
    expect(getByText('Large Padding')).toBeTruthy();
  });

  it('applies padding none', () => {
    const { getByText } = render(<Card padding="none">No Padding</Card>);
    expect(getByText('No Padding')).toBeTruthy();
  });

  it('renders with glassIntensity prop', () => {
    const { getByText } = render(
      <Card variant="glass" glassIntensity={50}>Glass 50</Card>
    );
    expect(getByText('Glass 50')).toBeTruthy();
  });

  it('renders with gradientColors prop', () => {
    const { getByText } = render(
      <Card variant="gradient" gradientColors={['#ff0000', '#00ff00']}>
        Custom Gradient
      </Card>
    );
    expect(getByText('Custom Gradient')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <Card>
        <React.Fragment>
          {'Child 1'}
          {'Child 2'}
        </React.Fragment>
      </Card>
    );
    expect(getByText('Child 1')).toBeTruthy();
    expect(getByText('Child 2')).toBeTruthy();
  });
});
