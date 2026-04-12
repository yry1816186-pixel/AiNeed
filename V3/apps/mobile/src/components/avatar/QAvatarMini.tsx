import React, { useMemo } from 'react';
import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { drawHead } from './drawing/Head';
import { drawEyes } from './drawing/Eyes';
import { drawMouth, drawNose } from './drawing/Mouth';
import { drawHair } from './drawing/Hair';
import {
  SKIN_COLORS,
  HAIR_COLORS,
  DEFAULT_TRANSFORM,
  type AvatarParams,
  type DrawingContext,
} from './types';

const EYE_PUPIL = '#1A1A1A';
const EYE_WHITES = '#FFFFFF';
const EYE_HIGHLIGHT = '#FFFFFF';
const MOUTH_COLOR = '#D4736A';
const MOUTH_DARK = '#B85A52';

interface QAvatarMiniProps {
  params: AvatarParams;
  size?: number;
}

function pathToOp(path: ReturnType<typeof import('@shopify/react-native-skia').Skia.Path.Make>): string {
  return path.toSVGString();
}

export const QAvatarMini: React.FC<QAvatarMiniProps> = ({
  params,
  size = 48,
}) => {
  const headRadius = size * 0.42;
  const cx = size / 2;
  const cy = size * 0.45;

  const drawingCtx: DrawingContext = useMemo(
    () => ({
      cx,
      cy,
      size,
      headRadius,
      params,
      clothingMap: {},
      transform: DEFAULT_TRANSFORM,
      sharedValues: {},
    }),
    [cx, cy, size, headRadius, params],
  );

  const headData = useMemo(() => drawHead(drawingCtx), [drawingCtx]);
  const eyeData = useMemo(() => drawEyes(drawingCtx), [drawingCtx]);
  const mouthData = useMemo(() => drawMouth(drawingCtx), [drawingCtx]);
  const noseData = useMemo(() => drawNose(drawingCtx), [drawingCtx]);
  const hairData = useMemo(() => drawHair(drawingCtx), [drawingCtx]);

  const skinColor = SKIN_COLORS[params.skinTone];
  const hairColor = HAIR_COLORS[params.hairColor];

  const headSvg = useMemo(() => pathToOp(headData.headPath), [headData]);
  const leftEyeSvg = useMemo(() => pathToOp(eyeData.leftEyePath), [eyeData]);
  const rightEyeSvg = useMemo(() => pathToOp(eyeData.rightEyePath), [eyeData]);
  const leftPupilSvg = useMemo(() => pathToOp(eyeData.leftPupilPath), [eyeData]);
  const rightPupilSvg = useMemo(() => pathToOp(eyeData.rightPupilPath), [eyeData]);
  const leftHighlightSvg = useMemo(() => pathToOp(eyeData.leftHighlightPath), [eyeData]);
  const rightHighlightSvg = useMemo(() => pathToOp(eyeData.rightHighlightPath), [eyeData]);
  const mouthSvg = useMemo(() => pathToOp(mouthData.mouthPath), [mouthData]);
  const noseSvg = useMemo(() => pathToOp(noseData.nosePath), [noseData]);
  const hairSvg = useMemo(() => pathToOp(hairData.hairPath), [hairData]);

  return (
    <Canvas style={{ width: size, height: size }}>
      <Group>
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
    </Canvas>
  );
};
