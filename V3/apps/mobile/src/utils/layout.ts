import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const isSmallScreen = SCREEN_HEIGHT < 700;
export const isLargeScreen = SCREEN_WIDTH > 414;

export const s = (multiplier: number): number => 8 * multiplier;

export const getCardWidth = (columns: number = 2, gap: number = 12): number => {
  const totalGap = gap * (columns + 1);
  return (SCREEN_WIDTH - totalGap) / columns;
};

export const getCardHeight = (width: number, aspectRatio: number = 4 / 3): number => {
  return width / aspectRatio;
};

export const TAB_BAR_HEIGHT = Platform.select({
  ios: 83,
  android: 56,
  default: 56,
});

export const BOTTOM_SAFE = Platform.select({
  ios: 34,
  android: 0,
  default: 0,
});

export const HEADER_HEIGHT = 44;

export const getContentHeight = (
  hasTabBar: boolean = false,
  hasHeader: boolean = false,
): number => {
  let height = SCREEN_HEIGHT;
  if (hasTabBar) {
    height -= TAB_BAR_HEIGHT;
  }
  if (hasHeader) {
    height -= HEADER_HEIGHT;
  }
  return height;
};
