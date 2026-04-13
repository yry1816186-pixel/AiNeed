import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { AlignmentStatus } from '../../../hooks/useReferenceLines';

interface AlignmentGuideProps {
  alignmentStatus: AlignmentStatus | null;
}

const STATUS_COLORS = {
  aligned: '#4CAF50',
  perfect: '#4CAF50',
  good: '#4CAF50',
  slight: '#FFC107',
  off: '#F44336',
  adjust: '#F44336',
} as const;

function getStatusMessage(status: AlignmentStatus): { message: string; color: string } | null {
  if (status.overall === 'perfect') {
    return { message: '完美！', color: STATUS_COLORS.perfect };
  }
  if (status.overall === 'adjust') {
    return { message: '请调整姿势', color: STATUS_COLORS.adjust };
  }
  if (status.shoulder === 'off') {
    return { message: '请调整肩膀水平', color: STATUS_COLORS.off };
  }
  if (status.shoulder === 'slight') {
    return { message: '肩膀稍向左/右偏', color: STATUS_COLORS.slight };
  }
  if (status.posture === 'off') {
    return { message: '请站直', color: STATUS_COLORS.off };
  }
  if (status.posture === 'slight') {
    return { message: '姿势稍有不正', color: STATUS_COLORS.slight };
  }
  if (status.center === 'off') {
    return { message: '请站到画面中央', color: STATUS_COLORS.off };
  }
  if (status.center === 'slight') {
    return { message: '请稍向左/右移动', color: STATUS_COLORS.slight };
  }
  if (status.overall === 'good') {
    return { message: '很好，可以拍照', color: STATUS_COLORS.good };
  }
  return null;
}

const AlignmentGuide: React.FC<AlignmentGuideProps> = ({ alignmentStatus }) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const prevMessageRef = useRef<string | null>(null);

  const statusInfo = useMemo(() => {
    if (!alignmentStatus) return null;
    return getStatusMessage(alignmentStatus);
  }, [alignmentStatus]);

  useEffect(() => {
    if (statusInfo && statusInfo.message !== prevMessageRef.current) {
      prevMessageRef.current = statusInfo.message;
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!statusInfo) {
      prevMessageRef.current = null;
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [statusInfo, opacityAnim]);

  if (!statusInfo) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.badge,
          { backgroundColor: statusInfo.color, opacity: opacityAnim },
        ]}
      >
        <Text style={styles.text}>{statusInfo.message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AlignmentGuide;
