import type { Transforms3d } from '@shopify/react-native-skia';
import React, { useMemo, useRef } from 'react';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useFrameCallback,
  useDerivedValue,
} from 'react-native-reanimated';
import { computeAnimation } from './animations';
import { drawHead } from './drawing/Head';
import { drawEyes } from './drawing/Eyes';
import { drawMouth, drawNose } from './drawing/Mouth';
import { drawHair } from './drawing/Hair';
import { drawBody, drawLegs } from './drawing/Body';
import { drawClothingSlots } from './drawing/ClothingSlots';
import {
  SKIN_COLORS,
  HAIR_COLORS,
  DEFAULT_TRANSFORM,
  type AvatarParams,
  type ClothingMap,
  type AnimationState,
  type AnimationName,
  type DrawingContext,
} from './types';

const EYE_PUPIL = '#1A1A1A';
const EYE_WHITES = '#FFFFFF';
const EYE_HIGHLIGHT = '#FFFFFF';
const MOUTH_COLOR = '#D4736A';
const MOUTH_DARK = '#B85A52';

interface QAvatarRendererProps {
  params: AvatarParams;
  clothingMap?: ClothingMap;
  size: number;
  animation?: AnimationState;
}

function pathToSvg(path: ReturnType<typeof import('@shopify/react-native-skia').Skia.Path.Make>): string {
  return path.toSVGString();
}

export const QAvatarRenderer: React.FC<QAvatarRendererProps> = ({
  params,
  clothingMap = {},
  size,
  animation,
}) => {
  const clock = useSharedValue(0);
  const animationStartTime = useSharedValue(animation?.startedAt ?? 0);
  const currentAnimation = useSharedValue<AnimationName>(animation?.name ?? 'idle');

  const prevAnimationName = useRef<AnimationName>(animation?.name ?? 'idle');
  if (animation && animation.name !== prevAnimationName.current) {
    currentAnimation.value = animation.name;
    animationStartTime.value = animation.startedAt;
    prevAnimationName.current = animation.name;
  }

  useFrameCallback((frameInfo) => {
    clock.value = frameInfo.timeSinceFirstFrame;
  });

  const headRadius = size * 0.28;
  const cx = size / 2;
  const cy = size * 0.32;

  const bodyTransform = useDerivedValue<Transforms3d>(() => {
    const elapsed = Math.max(0, clock.value - animationStartTime.value);
    const t = computeAnimation(currentAnimation.value, elapsed);
    return [{ translateY: t.bodyTranslateY }];
  });

  const headTransform = useDerivedValue<Transforms3d>(() => {
    const elapsed = Math.max(0, clock.value - animationStartTime.value);
    const t = computeAnimation(currentAnimation.value, elapsed);
    return [
      { translateY: t.headTranslateY },
      { scale: t.headScaleX },
    ];
  });

  const skinColor = SKIN_COLORS[params.skinTone];
  const hairColor = HAIR_COLORS[params.hairColor];

  const drawingCtx: DrawingContext = useMemo(
    () => ({
      cx,
      cy,
      size,
      headRadius,
      params,
      clothingMap,
      transform: DEFAULT_TRANSFORM,
      sharedValues: {},
    }),
    [cx, cy, size, headRadius, params, clothingMap],
  );

  const headData = useMemo(() => drawHead(drawingCtx), [drawingCtx]);
  const eyeData = useMemo(() => drawEyes(drawingCtx), [drawingCtx]);
  const mouthData = useMemo(() => drawMouth(drawingCtx), [drawingCtx]);
  const noseData = useMemo(() => drawNose(drawingCtx), [drawingCtx]);
  const hairData = useMemo(() => drawHair(drawingCtx), [drawingCtx]);
  const bodyData = useMemo(() => drawBody(drawingCtx), [drawingCtx]);
  const legsData = useMemo(() => drawLegs(drawingCtx), [drawingCtx]);
  const clothingData = useMemo(() => drawClothingSlots(drawingCtx), [drawingCtx]);

  const headSvg = useMemo(() => pathToSvg(headData.headPath), [headData]);
  const leftEyeSvg = useMemo(() => pathToSvg(eyeData.leftEyePath), [eyeData]);
  const rightEyeSvg = useMemo(() => pathToSvg(eyeData.rightEyePath), [eyeData]);
  const leftPupilSvg = useMemo(() => pathToSvg(eyeData.leftPupilPath), [eyeData]);
  const rightPupilSvg = useMemo(() => pathToSvg(eyeData.rightPupilPath), [eyeData]);
  const leftHighlightSvg = useMemo(() => pathToSvg(eyeData.leftHighlightPath), [eyeData]);
  const rightHighlightSvg = useMemo(() => pathToSvg(eyeData.rightHighlightPath), [eyeData]);
  const mouthSvg = useMemo(() => pathToSvg(mouthData.mouthPath), [mouthData]);
  const noseSvg = useMemo(() => pathToSvg(noseData.nosePath), [noseData]);
  const hairSvg = useMemo(() => pathToSvg(hairData.hairPath), [hairData]);
  const bodySvg = useMemo(() => pathToSvg(bodyData.bodyPath), [bodyData]);
  const leftArmSvg = useMemo(() => pathToSvg(bodyData.leftArmPath), [bodyData]);
  const rightArmSvg = useMemo(() => pathToSvg(bodyData.rightArmPath), [bodyData]);
  const legsSvg = useMemo(() => pathToSvg(legsData.legsPath), [legsData]);

  const topSvg = useMemo(() => clothingData.topPath ? pathToSvg(clothingData.topPath) : null, [clothingData]);
  const bottomSvg = useMemo(() => clothingData.bottomPath ? pathToSvg(clothingData.bottomPath) : null, [clothingData]);
  const shoesSvg = useMemo(() => clothingData.shoesPath ? pathToSvg(clothingData.shoesPath) : null, [clothingData]);
  const outerwearSvg = useMemo(() => clothingData.outerwearPath ? pathToSvg(clothingData.outerwearPath) : null, [clothingData]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group
        transform={bodyTransform}
      >
        <Path path={legsSvg} color={legsData.color} />
        <Path path={bodySvg} color={bodyData.bodyColor} />

        {clothingData.bottomColor && bottomSvg && (
          <Path path={bottomSvg} color={clothingData.bottomColor} />
        )}
        {clothingData.shoesColor && shoesSvg && (
          <Path path={shoesSvg} color={clothingData.shoesColor} />
        )}
        {clothingData.topColor && topSvg && (
          <Path path={topSvg} color={clothingData.topColor} />
        )}
        {clothingData.outerwearColor && outerwearSvg && (
          <Path path={outerwearSvg} color={clothingData.outerwearColor} />
        )}

        <Path path={leftArmSvg} color={bodyData.armColor} />
        <Path path={rightArmSvg} color={bodyData.armColor} />

        <Group
          transform={headTransform}
        >
          <Path path={headSvg} color={skinColor} />

          <Path path={leftEyeSvg} color={EYE_WHITES} />
          <Path path={rightEyeSvg} color={EYE_WHITES} />
          <Path path={leftPupilSvg} color={EYE_PUPIL} />
          <Path path={rightPupilSvg} color={EYE_PUPIL} />
          <Path path={leftHighlightSvg} color={EYE_HIGHLIGHT} />
          <Path path={rightHighlightSvg} color={EYE_HIGHLIGHT} />

          <Path path={noseSvg} color={MOUTH_DARK} />
          <Path path={mouthSvg} color={MOUTH_COLOR} />

          <Path path={hairSvg} color={hairColor} />
        </Group>
      </Group>
    </Canvas>
  );
};
