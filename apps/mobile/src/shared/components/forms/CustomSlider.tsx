/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  GestureResponderEvent,
  type ViewStyle,
} from "react-native";
import {
  Spacing,
  BorderRadius,
  DesignTokens,
  flatColors as colors,
} from "../../../design-system/theme";

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: ViewStyle;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor = colors.primary,
  maximumTrackTintColor = colors.neutral[200],
  thumbTintColor = colors.primary,
  style,
}) => {
  const trackLayoutRef = useRef({ width: 0, x: 0 });

  const getRatio = useCallback(
    (val: number) => {
      return (val - minimumValue) / (maximumValue - minimumValue);
    },
    [minimumValue, maximumValue]
  );

  const getValueFromX = useCallback(
    (x: number) => {
      const ratio = Math.max(0, Math.min(1, x / trackLayoutRef.current.width));
      const rawValue = minimumValue + ratio * (maximumValue - minimumValue);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
    },
    [minimumValue, maximumValue, step]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.locationX;
        onValueChange(getValueFromX(x));
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const x = evt.nativeEvent.locationX;
        onValueChange(getValueFromX(x));
      },
    })
  ).current;

  const ratio = getRatio(value);

  return (
    <View style={[styles.container, style]}>
      <View
        style={styles.track}
        onLayout={(e) => {
          trackLayoutRef.current.width = e.nativeEvent.layout.width;
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.trackFill,
            {
              width: `${ratio * 100}%`,
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
        <View style={[styles.trackBackground, { backgroundColor: maximumTrackTintColor }]} />
      </View>
      <View
        style={[
          styles.thumb,
          {
            left: `${ratio * 100}%`,
            backgroundColor: thumbTintColor,
          },
        ]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  trackFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 3,
    zIndex: 1,
  },
  trackBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    top: "50%",
    marginTop: -11,
    marginLeft: -11,
    zIndex: 2,
    ...{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
  },
});
