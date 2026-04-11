import type { AnimationTransform, AnimationName } from './types';

const IDLE_PERIOD = 2000;
const IDLE_SCALE_MIN = 1.0;
const IDLE_SCALE_MAX = 1.02;

const HAPPY_DURATION = 500;
const HAPPY_BOUNCE = 8;

const WAVE_PERIOD = 1000;
const WAVE_ANGLE = 20;

const NOD_PERIOD = 800;
const NOD_DISPLACEMENT = 4;

const THINK_PERIOD = 3000;
const THINK_ANGLE = 5;

const HEART_DURATION = 500;

const DRESS_TRANSITION_DURATION = 300;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sineWave(time: number, period: number): number {
  return Math.sin((2 * Math.PI * time) / period);
}

export function computeAnimation(
  name: AnimationName,
  elapsed: number,
): AnimationTransform {
  switch (name) {
    case 'idle': {
      const wave = sineWave(elapsed, IDLE_PERIOD);
      const scale = lerp(IDLE_SCALE_MIN, IDLE_SCALE_MAX, (wave + 1) / 2);
      return {
        headScaleX: scale,
        headScaleY: scale,
        headTranslateY: 0,
        headRotation: 0,
        bodyTranslateY: 0,
        rightArmRotation: 0,
        leftArmRotation: 0,
        eyeSquint: 0,
        opacity: 1,
      };
    }

    case 'happy': {
      const t = (elapsed % HAPPY_DURATION) / HAPPY_DURATION;
      const bounce = Math.abs(Math.sin(t * Math.PI * 2)) * HAPPY_BOUNCE;
      const squint = Math.abs(Math.sin(t * Math.PI * 2));
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: -bounce,
        headRotation: 0,
        bodyTranslateY: -bounce,
        rightArmRotation: 0,
        leftArmRotation: 0,
        eyeSquint: squint,
        opacity: 1,
      };
    }

    case 'wave': {
      const waveAngle = sineWave(elapsed, WAVE_PERIOD) * WAVE_ANGLE;
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: 0,
        headRotation: 0,
        bodyTranslateY: 0,
        rightArmRotation: waveAngle,
        leftArmRotation: 0,
        eyeSquint: 0,
        opacity: 1,
      };
    }

    case 'nod': {
      const displacement = sineWave(elapsed, NOD_PERIOD) * NOD_DISPLACEMENT;
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: displacement,
        headRotation: 0,
        bodyTranslateY: 0,
        rightArmRotation: 0,
        leftArmRotation: 0,
        eyeSquint: 0,
        opacity: 1,
      };
    }

    case 'think': {
      const rotation = sineWave(elapsed, THINK_PERIOD) * THINK_ANGLE;
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: 0,
        headRotation: rotation,
        bodyTranslateY: 0,
        rightArmRotation: 0,
        leftArmRotation: 15,
        eyeSquint: 0.3,
        opacity: 1,
      };
    }

    case 'heart': {
      const t = Math.min(elapsed / HEART_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: 0,
        headRotation: 0,
        bodyTranslateY: 0,
        rightArmRotation: -30 * eased,
        leftArmRotation: 30 * eased,
        eyeSquint: 0.5 * eased,
        opacity: 1,
      };
    }

    case 'dressTransition': {
      const t = Math.min(elapsed / DRESS_TRANSITION_DURATION, 1);
      const fadeIn = t < 0.5 ? t * 2 : 1;
      const fadeOut = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: 0,
        headRotation: 0,
        bodyTranslateY: 0,
        rightArmRotation: 0,
        leftArmRotation: 0,
        eyeSquint: 0,
        opacity: fadeIn,
      };
    }

    default:
      return {
        headScaleX: 1,
        headScaleY: 1,
        headTranslateY: 0,
        headRotation: 0,
        bodyTranslateY: 0,
        rightArmRotation: 0,
        leftArmRotation: 0,
        eyeSquint: 0,
        opacity: 1,
      };
  }
}
