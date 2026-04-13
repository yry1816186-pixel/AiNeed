import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Colors, Spacing, BorderRadius } from "../../../theme";

interface QuizProgressProps {
  currentStep: number;
  totalSteps: number;
}

export const QuizProgress: React.FC<QuizProgressProps> = ({
  currentStep,
  totalSteps,
}) => {
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const progress = totalSteps > 0 ? currentStep / totalSteps : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isCompleted && styles.dotCompleted,
                  isCurrent && styles.dotCurrent,
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.stepText}>
          {currentStep}/{totalSteps}
        </Text>
      </View>
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing[1],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.neutral[300],
  },
  dotCompleted: {
    backgroundColor: Colors.primary[500],
  },
  dotCurrent: {
    backgroundColor: Colors.primary[500],
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutral[600],
  },
  barBackground: {
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[200],
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary[500],
  },
});
