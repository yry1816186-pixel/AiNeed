import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  type LayoutChangeEvent,
  type GestureResponderEvent,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Canvas, Circle, Rect, RoundedRect, Group, Paint } from '@shopify/react-native-skia';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, radius, shadows } from '../../src/theme';
import {
  type SkinTone,
  type EyeType,
  type HairStyle,
  type HairColor,
  type AccessoryType,
  SKIN_TONE_COLORS,
  SKIN_TONE_LABELS,
  EYE_TYPE_LABELS,
  HAIR_STYLE_LABELS,
  HAIR_COLOR_VALUES,
  HAIR_COLOR_LABELS,
  ACCESSORY_LABELS,
} from '../../src/services/avatar.service';
import { useMyAvatar, useUpdateAvatar } from '../../src/hooks/useAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SKIN_TONES: SkinTone[] = ['porcelain', 'natural', 'wheat', 'honey', 'deepBrown', 'dark'];
const EYE_TYPES: EyeType[] = ['roundBig', 'almond', 'cat', 'downturned'];
const HAIR_STYLES: HairStyle[] = [
  'bob', 'pixie', 'shortStraight', 'texturedShort',
  'straight', 'wavy', 'bigCurls', 'layered',
  'woolCurls', 'waterWave', 'spiralCurl', 'afroCurl',
  'ponytail', 'twinTails', 'bun', 'twinBuns',
  'braid', 'twinBraids', 'fishtail',
  'buzz', 'mohawk', 'fadeShort', 'bangs',
];
const HAIR_COLORS: HairColor[] = ['black', 'darkBrown', 'lightBrown', 'blonde', 'redBrown', 'grayWhite'];
const ACCESSORIES: AccessoryType[] = ['glasses', 'earrings', 'hat'];

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

function SkinToneSelector({ value, onChange }: { value: SkinTone; onChange: (v: SkinTone) => void }) {
  return (
    <View style={styles.optionRow}>
      <Text variant="body2" color={colors.textSecondary} style={styles.sectionLabel}>肤色</Text>
      <View style={styles.skinToneRow}>
        {SKIN_TONES.map((tone) => {
          const isSelected = tone === value;
          return (
            <View key={tone} style={[styles.skinToneItem, isSelected && styles.skinToneItemSelected]}>
              <Card
                padding={0}
                shadow={isSelected ? 'card' : undefined}
                onPress={() => onChange(tone)}
                style={[styles.skinToneCard, isSelected && styles.skinToneCardSelected]}
              >
                <View style={[styles.skinToneCircle, { backgroundColor: SKIN_TONE_COLORS[tone] }, isSelected && styles.skinToneCircleSelected]} />
              </Card>
              <Text variant="caption" color={isSelected ? colors.accent : colors.textTertiary} align="center">
                {SKIN_TONE_LABELS[tone]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FaceShapeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const thumbPosition = sliderWidth > 0 ? (value / 100) * sliderWidth : 0;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setSliderWidth(e.nativeEvent.layout.width);
  }, []);

  const handleTouch = useCallback(
    (e: GestureResponderEvent) => {
      const x = e.nativeEvent.locationX;
      const clamped = Math.max(0, Math.min(100, (x / sliderWidth) * 100));
      onChange(Math.round(clamped));
    },
    [sliderWidth, onChange],
  );

  return (
    <View style={styles.optionRow}>
      <View style={styles.sliderHeader}>
        <Text variant="body2" color={colors.textSecondary}>脸型</Text>
        <Text variant="caption" color={colors.textTertiary}>
          {value < 33 ? '圆脸' : value < 66 ? '椭圆' : '尖脸'}
        </Text>
      </View>
      <View style={styles.sliderTrack} onLayout={handleLayout} onTouchEnd={handleTouch}>
        <View style={[styles.sliderFill, { width: `${value}%` }]} />
        <View style={[styles.sliderThumb, { left: thumbPosition - 8 }]} />
      </View>
      <View style={styles.sliderLabels}>
        <Text variant="caption" color={colors.textTertiary}>圆脸</Text>
        <Text variant="caption" color={colors.textTertiary}>尖脸</Text>
      </View>
    </View>
  );
}

function EyeTypeSelector({ value, onChange }: { value: EyeType; onChange: (v: EyeType) => void }) {
  return (
    <View style={styles.optionRow}>
      <Text variant="body2" color={colors.textSecondary} style={styles.sectionLabel}>眼型</Text>
      <View style={styles.eyeTypeRow}>
        {EYE_TYPES.map((et) => {
          const isSelected = et === value;
          return (
            <Card
              key={et}
              padding={spacing.md}
              shadow={isSelected ? 'card' : undefined}
              onPress={() => onChange(et)}
              style={[styles.eyeTypeCard, isSelected && styles.eyeTypeCardSelected]}
            >
              <Text variant="buttonSmall" color={isSelected ? colors.accent : colors.textSecondary} align="center">
                {EYE_TYPE_LABELS[et]}
              </Text>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

function HairStyleSelector({
  style,
  color,
  onStyleChange,
  onColorChange,
}: {
  style: HairStyle;
  color: HairColor;
  onStyleChange: (v: HairStyle) => void;
  onColorChange: (v: HairColor) => void;
}) {
  return (
    <View style={styles.optionRow}>
      <Text variant="body2" color={colors.textSecondary} style={styles.sectionLabel}>发型</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hairScroll}>
        {HAIR_STYLES.map((hs) => {
          const isSelected = hs === style;
          return (
            <Card
              key={hs}
              padding={spacing.sm}
              shadow={isSelected ? 'card' : undefined}
              onPress={() => onStyleChange(hs)}
              style={[styles.hairCard, isSelected && styles.hairCardSelected]}
            >
              <Text variant="caption" color={isSelected ? colors.accent : colors.textSecondary} align="center">
                {HAIR_STYLE_LABELS[hs]}
              </Text>
            </Card>
          );
        })}
      </ScrollView>
      <View style={styles.hairColorRow}>
        {HAIR_COLORS.map((hc) => {
          const isSelected = hc === color;
          return (
            <Card
              key={hc}
              padding={0}
              shadow={isSelected ? 'card' : undefined}
              onPress={() => onColorChange(hc)}
              style={[styles.hairColorCard, isSelected && styles.hairColorCardSelected]}
            >
              <View style={[styles.hairColorCircle, { backgroundColor: HAIR_COLOR_VALUES[hc] }]} />
            </Card>
          );
        })}
      </View>
      <View style={styles.hairColorLabelRow}>
        {HAIR_COLORS.map((hc) => (
          <Text key={hc} variant="caption" color={colors.textTertiary} style={styles.hairColorLabel}>
            {HAIR_COLOR_LABELS[hc]}
          </Text>
        ))}
      </View>
    </View>
  );
}

function AccessorySelector({ value, onChange }: { value: AccessoryType[]; onChange: (v: AccessoryType[]) => void }) {
  const toggle = useCallback(
    (item: AccessoryType) => {
      if (value.includes(item)) {
        onChange(value.filter((v) => v !== item));
      } else {
        onChange([...value, item]);
      }
    },
    [value, onChange],
  );

  return (
    <View style={styles.optionRow}>
      <Text variant="body2" color={colors.textSecondary} style={styles.sectionLabel}>配饰</Text>
      <View style={styles.accessoryRow}>
        {ACCESSORIES.map((acc) => {
          const isSelected = value.includes(acc);
          return (
            <Card
              key={acc}
              padding={spacing.md}
              shadow={isSelected ? 'card' : undefined}
              onPress={() => toggle(acc)}
              style={[styles.accessoryCard, isSelected && styles.accessoryCardSelected]}
            >
              <Text variant="buttonSmall" color={isSelected ? colors.accent : colors.textSecondary} align="center">
                {ACCESSORY_LABELS[acc]}
              </Text>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

export default function AvatarEditScreen() {
  const router = useRouter();
  const { data: avatar, isLoading } = useMyAvatar();
  const updateAvatar = useUpdateAvatar();

  const [skinTone, setSkinTone] = useState<SkinTone>('natural');
  const [faceShape, setFaceShape] = useState(50);
  const [eyeType, setEyeType] = useState<EyeType>('roundBig');
  const [hairStyle, setHairStyle] = useState<HairStyle>('bob');
  const [hairColor, setHairColor] = useState<HairColor>('black');
  const [accessories, setAccessories] = useState<AccessoryType[]>([]);
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (avatar && !initialized) {
      setSkinTone(avatar.params.skinTone);
      setFaceShape(avatar.params.faceShape);
      setEyeType(avatar.params.eyeType);
      setHairStyle(avatar.params.hairStyle);
      setHairColor(avatar.params.hairColor);
      setAccessories(avatar.params.accessories);
      setInitialized(true);
    }
  }, [avatar, initialized]);

  const handleSave = useCallback(() => {
    updateAvatar.mutate(
      { skinTone, faceShape, eyeType, hairStyle, hairColor, accessories },
      {
        onSuccess: () => {
          Alert.alert('保存成功', '形象已更新', [
            { text: '查看形象', onPress: () => router.replace('/avatar/showcase') },
          ]);
        },
        onError: () => {
          Alert.alert('保存失败', '请稍后重试');
        },
      },
    );
  }, [skinTone, faceShape, eyeType, hairStyle, hairColor, accessories, updateAvatar, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loading variant="fullscreen" message="加载形象中..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="h2">编辑形象</Text>
        <Button
          variant="primary"
          size="small"
          loading={updateAvatar.isPending}
          onPress={handleSave}
        >
          保存
        </Button>
      </View>

      <View style={styles.previewSection}>
        <QAvatarRenderer
          skinTone={skinTone}
          faceShape={faceShape}
          eyeType={eyeType}
          hairStyle={hairStyle}
          hairColor={hairColor}
          accessories={accessories}
          size={Math.min(SCREEN_WIDTH * 0.5, 220)}
        />
      </View>

      <ScrollView
        style={styles.paramsScroll}
        contentContainerStyle={styles.paramsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SkinToneSelector value={skinTone} onChange={setSkinTone} />
        <FaceShapeSlider value={faceShape} onChange={setFaceShape} />
        <EyeTypeSelector value={eyeType} onChange={setEyeType} />
        <HairStyleSelector
          style={hairStyle}
          color={hairColor}
          onStyleChange={setHairStyle}
          onColorChange={setHairColor}
        />
        <AccessorySelector value={accessories} onChange={setAccessories} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  previewSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.backgroundSecondary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  paramsScroll: {
    flex: 1,
  },
  paramsScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  optionRow: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  skinToneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skinToneItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  skinToneItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  skinToneCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  skinToneCardSelected: {
    borderColor: colors.accent,
  },
  skinToneCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  skinToneCircleSelected: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    ...shadows.card,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  eyeTypeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  eyeTypeCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  eyeTypeCardSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}08`,
  },
  hairScroll: {
    marginBottom: spacing.md,
  },
  hairCard: {
    width: 72,
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  hairCardSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}08`,
  },
  hairColorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hairColorCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  hairColorCardSelected: {
    borderColor: colors.accent,
  },
  hairColorCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  hairColorLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hairColorLabel: {
    width: 28,
    textAlign: 'center',
  },
  accessoryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  accessoryCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  accessoryCardSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}08`,
  },
});
