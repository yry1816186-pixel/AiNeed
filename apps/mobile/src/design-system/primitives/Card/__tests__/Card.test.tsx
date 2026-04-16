import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { Card } from "../Card";
import { DesignTokens } from '../../../theme/tokens/design-tokens';


jest.mock("@/src/polyfills/expo-linear-gradient", () => {
  const { View } = require("react-native");
  const MockLinearGradient = (props: Record<string, unknown>) => <View {...props} />;
  MockLinearGradient.displayName = "LinearGradient";
  return { LinearGradient: MockLinearGradient, default: MockLinearGradient };
});

jest.mock("@/src/polyfills/expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  default: {
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
    NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  },
}));

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return { BlurView: View, BlurViewPropTypes: {} };
});

// Helper to wrap children in Text for getByText to work in RN test env
const T = ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>;

describe("Card", () => {
  it("renders children correctly", () => {
    const { getByText } = render(
      <Card>
        <T>Card Content</T>
      </Card>
    );
    expect(getByText("Card Content")).toBeTruthy();
  });

  it("applies custom styles", () => {
    const { getByText } = render(
      <Card style={{ marginTop: DesignTokens.spacing['2.5']}}>
        <T>Styled Card</T>
      </Card>
    );
    expect(getByText("Styled Card")).toBeTruthy();
  });

  it("renders elevated variant by default", () => {
    const { getByText } = render(
      <Card>
        <T>Elevated</T>
      </Card>
    );
    expect(getByText("Elevated")).toBeTruthy();
  });

  it("renders outlined variant", () => {
    const { getByText } = render(
      <Card variant="outlined">
        <T>Outlined</T>
      </Card>
    );
    expect(getByText("Outlined")).toBeTruthy();
  });

  it("renders filled variant", () => {
    const { getByText } = render(
      <Card variant="filled">
        <T>Filled</T>
      </Card>
    );
    expect(getByText("Filled")).toBeTruthy();
  });

  it("renders glass variant", () => {
    const { getByText } = render(
      <Card variant="glass">
        <T>Glass</T>
      </Card>
    );
    expect(getByText("Glass")).toBeTruthy();
  });

  it("renders gradient variant", () => {
    const { getByText } = render(
      <Card variant="gradient">
        <T>Gradient</T>
      </Card>
    );
    expect(getByText("Gradient")).toBeTruthy();
  });

  it("handles press events when interactive", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Card interactive onPress={onPress}>
        <T>Touchable</T>
      </Card>
    );
    fireEvent.press(getByText("Touchable"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not render as touchable when not interactive", () => {
    const { getByText } = render(
      <Card>
        <T>Non-interactive</T>
      </Card>
    );
    expect(getByText("Non-interactive")).toBeTruthy();
  });

  it("handles long press events when interactive", () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <Card interactive onPress={jest.fn()} onLongPress={onLongPress}>
        <T>Long Press</T>
      </Card>
    );
    fireEvent(getByText("Long Press"), "onLongPress");
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("applies padding sm", () => {
    const { getByText } = render(
      <Card padding="sm">
        <T>Padded</T>
      </Card>
    );
    expect(getByText("Padded")).toBeTruthy();
  });

  it("applies padding md by default", () => {
    const { getByText } = render(
      <Card>
        <T>Default Padding</T>
      </Card>
    );
    expect(getByText("Default Padding")).toBeTruthy();
  });

  it("applies padding lg", () => {
    const { getByText } = render(
      <Card padding="lg">
        <T>Large Padding</T>
      </Card>
    );
    expect(getByText("Large Padding")).toBeTruthy();
  });

  it("applies padding none", () => {
    const { getByText } = render(
      <Card padding="none">
        <T>No Padding</T>
      </Card>
    );
    expect(getByText("No Padding")).toBeTruthy();
  });

  it("renders with glassIntensity prop", () => {
    const { getByText } = render(
      <Card variant="glass" glassIntensity={50}>
        <T>Glass 50</T>
      </Card>
    );
    expect(getByText("Glass 50")).toBeTruthy();
  });

  it("renders with gradientColors prop", () => {
    const { getByText } = render(
      <Card variant="gradient" gradientColors={["#ff0000", "#00ff00"]}>
        <T>Custom Gradient</T>
      </Card>
    );
    expect(getByText("Custom Gradient")).toBeTruthy();
  });

  it("renders multiple children", () => {
    const { getByText } = render(
      <Card>
        <T>Child 1</T>
        <T>Child 2</T>
      </Card>
    );
    expect(getByText("Child 1")).toBeTruthy();
    expect(getByText("Child 2")).toBeTruthy();
  });
});
