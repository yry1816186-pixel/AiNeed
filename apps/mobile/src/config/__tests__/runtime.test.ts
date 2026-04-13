jest.mock('@/src/polyfills/expo-constants', () => ({
  expoConfig: { extra: {} },
}));

import { resolveUnverifiedMobileDemosFlag } from '../runtime';

describe('resolveUnverifiedMobileDemosFlag', () => {
  it('returns true when ENABLE=true (explicit enable overrides everything)', () => {
    expect(resolveUnverifiedMobileDemosFlag(true, undefined, false)).toBe(true);
  });

  it('returns false when DISABLE=true (explicit disable overrides default)', () => {
    expect(resolveUnverifiedMobileDemosFlag(undefined, true, true)).toBe(false);
  });

  it('returns true when both ENABLE and DISABLE are true (ENABLE wins)', () => {
    expect(resolveUnverifiedMobileDemosFlag(true, true, false)).toBe(true);
  });

  it('returns true when neither is set and isDev=true', () => {
    expect(resolveUnverifiedMobileDemosFlag(undefined, undefined, true)).toBe(true);
  });

  it('returns false when neither is set and isDev=false', () => {
    expect(resolveUnverifiedMobileDemosFlag(undefined, undefined, false)).toBe(false);
  });

  it('falls back to isDev when DISABLE=false', () => {
    expect(resolveUnverifiedMobileDemosFlag(undefined, false, true)).toBe(true);
    expect(resolveUnverifiedMobileDemosFlag(undefined, false, false)).toBe(false);
  });
});
