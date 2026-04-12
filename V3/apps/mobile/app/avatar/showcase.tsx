import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Canvas, Circle, Rect, RoundedRect, Group, Paint } from '@shopify/react-native-skia';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import { colors, spacing, radius, shadows } from '../../src/theme';
import {
  type SkinTone,
  type EyeType,
  type HairStyle,
  type HairColor,
  type AccessoryType,
  type ClothingMap,
  SKIN_TONE_COLORS,
  HAIR_COLOR_VALUES,
} from '../../src/services/avatar.service';
import { useMyAvatar } from '../../src/hooks/useAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QAvatarRendererProps {
  skinTone: SkinTone;
  faceShape: number;
  eyeType: EyeType;
  hairStyle: HairStyle;
  hairColor: HairColor;
  accessories: AccessoryType[];
  size: number;
}

const QAvatarRenderer: React.FC<QAvatarRendererProps> = React.memo(({
  skinTone,
  faceShape,
  eyeType,
  hairStyle,
  hairColor,
  accessories,
  size,
}) => {
  const skinColor = SKIN_TONE_COLORS[skinTone];
  const hColor = HAIR_COLOR_VALUES[hairColor];
  const centerX = size / 2;
  const centerY = size / 2;
  const headRadius = size * 0.28;
  const faceWidthFactor = 1 - (faceShape / 100) * 0.25;

  const eyeOffsetY = centerY - headRadius * 0.1;
  const eyeSpacing = headRadius * 0.35;
  const eyeRadius = eyeType === 'roundBig' ? headRadius * 0.14 : headRadius * 0.11;

  const bodyTop = centerY + headRadius * 0.85;
  const bodyWidth = headRadius * 1.1;
  const bodyHeight = size * 0.28;

  const showGlasses = accessories.includes('glasses');
  const showEarrings = accessories.includes('earrings');
  const showHat = accessories.includes('hat');

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group>
        <RoundedRect
          x={centerX - bodyWidth}
          y={bodyTop}
          width={bodyWidth * 2}
          height={bodyHeight}
          r={bodyWidth * 0.3}
          color={colors.primary}
        />
        <Circle
          cx={centerX}
          cy={centerY}
          r={headRadius * faceWidthFactor}
          color={skinColor}
        />
        <Circle
          cx={centerX - eyeSpacing}
          cy={eyeOffsetY}
          r={eyeRadius}
          color="#FFFFFF"
        />
        <Circle
          cx={centerX + eyeSpacing}
          cy={eyeOffsetY}
          r={eyeRadius}
          color="#FFFFFF"
        />
        <Circle
          cx={centerX - eyeSpacing}
          cy={eyeOffsetY + eyeRadius * 0.1}
          r={eyeRadius * 0.55}
          color="#1A1A1A"
        />
        <Circle
          cx={centerX + eyeSpacing}
          cy={eyeOffsetY + eyeRadius * 0.1}
          r={eyeRadius * 0.55}
          color="#1A1A1A"
        />
        <Circle
          cx={centerX - eyeSpacing + eyeRadius * 0.15}
          cy={eyeOffsetY - eyeRadius * 0.15}
          r={eyeRadius * 0.2}
          color="#FFFFFF"
        />
        <Circle
          cx={centerX + eyeSpacing + eyeRadius * 0.15}
          cy={eyeOffsetY - eyeRadius * 0.15}
          r={eyeRadius * 0.2}
          color="#FFFFFF"
        />
        <Circle
          cx={centerX}
          cy={centerY + headRadius * 0.25}
          r={headRadius * 0.06}
          color={SKIN_TONE_COLORS[skinTone === 'porcelain' ? 'natural' : 'porcelain']}
          opacity={0.4}
        />
        <RoundedRect
          x={centerX - headRadius * 0.12}
          y={centerY + headRadius * 0.35}
          width={headRadius * 0.24}
          height={headRadius * 0.08}
          r={headRadius * 0.04}
          color="#E88B8B"
        />
        {hairStyle !== 'buzz' && (
          <RoundedRect
            x={centerX - headRadius * faceWidthFactor * 0.95}
            y={centerY - headRadius * 0.9}
            width={headRadius * faceWidthFactor * 1.9}
            height={headRadius * 0.5}
            r={headRadius * 0.3}
            color={hColor}
          />
        )}
        {showGlasses && (
          <Group>
            <Circle
              cx={centerX - eyeSpacing}
              cy={eyeOffsetY}
              r={eyeRadius * 1.6}
              color="transparent"
            >
              <Paint color="#333333" style="stroke" strokeWidth={1.5} />
            </Circle>
            <Circle
              cx={centerX + eyeSpacing}
              cy={eyeOffsetY}
              r={eyeRadius * 1.6}
              color="transparent"
            >
              <Paint color="#333333" style="stroke" strokeWidth={1.5} />
            </Circle>
            <Rect
              x={centerX - eyeSpacing + eyeRadius * 1.6}
              y={eyeOffsetY - 0.75}
              width={eyeSpacing * 2 - eyeRadius * 3.2}
              height={1.5}
              color="#333333"
            />
          </Group>
        )}
        {showEarrings && (
          <Group>
            <Circle cx={centerX - headRadius * faceWidthFactor * 0.95} cy={centerY + headRadius * 0.1} r={3} color="#FFD700" />
            <Circle cx={centerX + headRadius * faceWidthFactor * 0.95} cy={centerY + headRadius * 0.1} r={3} color="#FFD700" />
          </Group>
        )}
        {showHat && (
          <RoundedRect
            x={centerX - headRadius * faceWidthFactor * 1.1}
            y={centerY - headRadius * 1.1}
            width={headRadius * faceWidthFactor * 2.2}
            height={headRadius * 0.35}
            r={headRadius * 0.12}
            color={colors.accent}
          />
        )}
      </Group>
    </Canvas>
  );
});

QAvatarRenderer.displayName = 'QAvatarRenderer';

interface ClothingSlotCardProps {
  label: string;
  color: string;
  type: string;
}

const ClothingSlotCard: React.FC<ClothingSlotCardProps> = ({ label, color, type }) => (
  <View style={styles.clothingSlotCard}>
    <View style={[styles.clothingColorDot, { backgroundColor: color }]} />
    <Text variant="caption" color={colors.textSecondary}>{label}</Text>
    <Text variant="caption" color={colors.textTertiary}>{type}</Text>
  </View>
);

interface HistoryOutfitCardProps {
  color: string;
  label: string;
  date: string;
}

const HistoryOutfitCard: React.FC<HistoryOutfitCardProps> = ({ color, label, date }) => (
  <Card padding={spacing.sm} style={styles.historyCard}>
    <View style={[styles.historyPreview, { backgroundColor: color }]} />
    <Text variant="caption" color={colors.textSecondary} align="center" numberOfLines={1}>
      {label}
    </Text>
    <Text variant="caption" color={colors.textTertiary} align="center">
      {date}
    </Text>
  </Card>
);

const SLOT_LABELS: Record<string, string> = {
  top: '上装',
  bottom: '下装',
  outerwear: '外套',
  shoes: '鞋子',
  accessory: '配饰',
};

const MOCK_HISTORY: Array<{ id: string; color: string; label: string; date: string }> = [
  { id: '1', color: '#E94560', label: '休闲搭配', date: '4月10日' },
  { id: '2', color: '#2196F3', label: '通勤搭配', date: '4月8日' },
  { id: '3', color: '#4CAF50', label: '周末搭配', date: '4月5日' },
  { id: '4', color: '#FF9800', label: '约会搭配', date: '4月2日' },
];

export default function AvatarShowcaseScreen() {
  const router = useRouter();
  const { data: avatar, isLoading, isError } = useMyAvatar();

  const breathAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breathAnimation.start();

    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    floatAnimation.start();

    return () => {
      breathAnimation.stop();
      floatAnimation.stop();
    };
  }, [breathAnim, floatAnim]);

  const breathScale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const handleEdit = () => {
    router.push('/avatar/edit');
  };

  const handleShare = () => {
    Alert.alert('分享', '分享功能开发中');
  };

  const handleSaveImage = () => {
    Alert.alert('保存图片', '保存图片功能开发中');
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading variant="fullscreen" message="加载形象中..." />
      </View>
    );
  }

  if (isError || !avatar) {
    return (
      <View style={styles.emptyContainer}>
        <Empty
          title="还没有形象"
          description="创建你的专属Q版形象"
          actionLabel="创建形象"
          onAction={() => router.push('/avatar/create')}
        />
      </View>
    );
  }

  const clothingMap: ClothingMap = avatar.clothingMap ?? {};
  const clothingSlots = Object.entries(clothingMap).filter(
    ([, value]) => value != null,
  ) as [string, { color: string; type: string }][];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.avatarSection,
            {
              transform: [
                { translateY: floatY },
                { scale: breathScale },
              ],
            },
          ]}
        >
          <QAvatarRenderer
            skinTone={avatar.params.skinTone}
            faceShape={avatar.params.faceShape}
            eyeType={avatar.params.eyeType}
            hairStyle={avatar.params.hairStyle}
            hairColor={avatar.params.hairColor}
            accessories={avatar.params.accessories}
            size={Math.min(SCREEN_WIDTH * 0.6, 280)}
          />
        </Animated.View>

        {clothingSlots.length > 0 && (
          <View style={styles.clothingSection}>
            <Text variant="h3" style={styles.sectionTitle}>当前穿着</Text>
            <View style={styles.clothingGrid}>
              {clothingSlots.map(([slot, info]) => (
                <ClothingSlotCard
                  key={slot}
                  label={SLOT_LABELS[slot] ?? slot}
                  color={info.color}
                  type={info.type}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionSection}>
          <Button variant="primary" size="medium" onPress={handleEdit} style={styles.actionButton}>
            编辑形象
          </Button>
          <Button variant="secondary" size="medium" onPress={handleShare} style={styles.actionButton}>
            分享
          </Button>
          <Button variant="secondary" size="medium" onPress={handleSaveImage} style={styles.actionButton}>
            保存图片
          </Button>
        </View>

        <View style={styles.historySection}>
          <Text variant="h3" style={styles.sectionTitle}>最近穿搭</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
            {MOCK_HISTORY.map((item) => (
              <HistoryOutfitCard
                key={item.id}
                color={item.color}
                label={item.label}
                date={item.date}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  clothingSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  clothingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  clothingSlotCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md * 2) / 3,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  clothingColorDot: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  actionButton: {
    minWidth: 100,
  },
  historySection: {
    paddingHorizontal: spacing.xl,
  },
  historyScroll: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  historyCard: {
    width: 110,
    alignItems: 'center',
  },
  historyPreview: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
