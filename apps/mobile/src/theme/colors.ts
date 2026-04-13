import { Platform } from 'react-native';

const NightBlue = {
  50: '#E8E8F0',
  100: '#D1D1E1',
  200: '#A3A3C3',
  300: '#7575A5',
  400: '#474787',
  500: '#1A1A2E',
  600: '#151525',
  700: '#10101C',
  800: '#0B0B13',
  900: '#06060A',
} as const;

const RoseRed = {
  50: '#FDE8EC',
  100: '#FBD1D9',
  200: '#F7A3B3',
  300: '#F3758D',
  400: '#EF4767',
  500: '#E94560',
  600: '#D13A53',
  700: '#A82E42',
  800: '#7F2232',
  900: '#561621',
} as const;

const Neutral = {
  white: '#FFFFFF',
  0: '#FFFFFF',
  50: '#F8F8FA',
  100: '#F0F0F3',
  200: '#E0E0E5',
  300: '#C8C8D0',
  400: '#A0A0AD',
  500: '#78788A',
  600: '#58586A',
  700: '#3A3A4A',
  800: '#2A2A38',
  900: '#1A1A26',
  950: '#0F0F18',
  black: '#0A0A12',
} as const;

const Gold = {
  50: '#FFF9EB',
  100: '#FFF0CC',
  200: '#FFE099',
  300: '#FFD066',
  400: '#FFC033',
  500: '#D4A853',
  600: '#B8923F',
  700: '#8C6E2F',
  800: '#604B20',
  900: '#3A2D13',
} as const;

const Semantic = {
  success: '#34C759',
  successLight: '#E8F9EE',
  warning: '#FF9F0A',
  warningLight: '#FFF5E5',
  error: '#FF3B30',
  errorLight: '#FFEBE9',
  info: '#5AC8FA',
  infoLight: '#EAF7FD',
} as const;

const Fashion = {
  blush: '#FFB6C1',
  champagne: '#F7E7CE',
  ivory: '#FFFFF0',
  cream: '#FFFDD0',
  navy: '#1E3A5F',
  burgundy: '#800020',
  olive: '#808000',
  taupe: '#483C32',
  charcoal: '#36454F',
  lavender: '#E6E6FA',
  peach: '#FFDAB9',
  mint: '#98FB98',
} as const;

const ColorSeasons = {
  spring: { label: '春季型', colors: ['#FF6B6B', '#FFA07A', '#FFD700', '#98FB98'], bg: '#FFF5F0' },
  summer: { label: '夏季型', colors: ['#87CEEB', '#DDA0DD', '#B0C4DE', '#F0E68C'], bg: '#F0F5FF' },
  autumn: { label: '秋季型', colors: ['#D2691E', '#B8860B', '#8B4513', '#CD853F'], bg: '#FFF8F0' },
  winter: { label: '冬季型', colors: ['#1A1A2E', '#E94560', '#FFFFFF', '#C0C0C0'], bg: '#F5F5FA' },
} as const;

const Gradients = {
  primary: ['#1A1A2E', '#2D2D4A'] as [string, string],
  rose: ['#E94560', '#FF6B81'] as [string, string],
  hero: ['#1A1A2E', '#E94560'] as [string, string],
  warm: ['#E94560', '#FF9F0A'] as [string, string],
  cool: ['#1A1A2E', '#5AC8FA'] as [string, string],
  gold: ['#D4A853', '#FFC033'] as [string, string],
  glass: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.05)'] as [string, string],
  glassDark: ['rgba(26,26,46,0.6)', 'rgba(26,26,46,0.2)'] as [string, string],
  shimmer: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)'] as [string, string, string],
} as const;

const Overlay = {
  light: 'rgba(255,255,255,0.85)',
  dark: 'rgba(0,0,0,0.5)',
  modal: 'rgba(0,0,0,0.4)',
  subtle: 'rgba(26,26,46,0.08)',
  medium: 'rgba(26,26,46,0.16)',
  strong: 'rgba(26,26,46,0.32)',
} as const;

export const colors = {
  primary: NightBlue,
  secondary: RoseRed,
  neutral: Neutral,
  gold: Gold,
  semantic: Semantic,
  fashion: Fashion,
  colorSeasons: ColorSeasons,
  gradients: Gradients,
  overlay: Overlay,
} as const;

export type XunOColors = typeof colors;

export default colors;
