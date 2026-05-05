import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ViewStyle,
  Animated as RNAnimated,
} from "react-native";
import { Duration } from "../../design-system/theme/tokens/animations";
import { useReducedMotion } from "../../shared/hooks/useReducedMotion";
import { useFeatureFlags } from "../../shared/contexts/FeatureFlagContext";
import { FeatureFlagKeys } from "../../constants/feature-flags";

export interface ModalAnimationProps {
  visible: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
  backdropOpacity?: number;
  contentHeight?: number | string;
  style?: ViewStyle;
}

export const ModalAnimation: React.FC<ModalAnimationProps> = ({
  visible,
  onDismiss,
  children,
  backdropOpacity = 0.5,
  contentHeight = "60%",
  style,
}) => {
  const { reducedMotion } = useReducedMotion();
  const featureFlags = useFeatureFlags();
  const [isShown, setIsShown] = useState(visible);

  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const contentAnim = useRef(new RNAnimated.Value(0)).current;

  const isEnabled =
    !reducedMotion && featureFlags.isEnabled(FeatureFlagKeys.ENABLE_MODAL_ANIMATION);

  useEffect(() => {
    if (visible) {
      setIsShown(true);
      if (isEnabled) {
        backdropAnim.setValue(0);
        contentAnim.setValue(0);
        RNAnimated.parallel([
          RNAnimated.timing(backdropAnim, {
            toValue: 1,
            duration: Duration.fast,
            useNativeDriver: true,
          }),
          RNAnimated.spring(contentAnim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 25,
            stiffness: 180,
          }),
        ]).start();
      } else {
        backdropAnim.setValue(1);
        contentAnim.setValue(1);
      }
    } else {
      if (isEnabled) {
        RNAnimated.parallel([
          RNAnimated.timing(backdropAnim, {
            toValue: 0,
            duration: Duration.fastest,
            useNativeDriver: true,
          }),
          RNAnimated.timing(contentAnim, {
            toValue: 0,
            duration: Duration.fast,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsShown(false);
        });
      } else {
        setIsShown(false);
      }
    }
  }, [visible, isEnabled]);

  if (!isShown) return null;

  const backdropStyle = {
    opacity: isEnabled
      ? backdropAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, backdropOpacity],
        })
      : backdropOpacity,
  };

  const contentStyle = {
    transform: isEnabled
      ? [
          {
            translateY: contentAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [300, 0],
            }),
          },
        ]
      : [],
    opacity: isEnabled ? contentAnim : 1,
  };

  return (
    <Modal transparent visible={isShown} animationType="none" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <RNAnimated.View style={[styles.backdropFill, backdropStyle]} />
      </Pressable>
      <View style={styles.contentWrapper} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <RNAnimated.View
          style={[styles.content, { height: contentHeight as any }, contentStyle as any, style]}
        >
          <View style={styles.handle} />
          {children}
        </RNAnimated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
});

export default ModalAnimation;
