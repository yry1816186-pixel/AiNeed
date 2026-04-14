module.exports = {
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@unimodules|unimodules|react-native-paper|@gorhom|@sentry|@shopify|@tanstack|axios|zustand|@react-navigation|react-native-gesture-handler|react-native-reanimated|react-native-svg|react-native-safe-area-context|react-native-screens|react-native-linear-gradient|expo-blur|expo-haptics|@react-native-async-storage)/.+\\.(js|ts)$',
  ],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    'src/**/__tests__/**/*.(ts|tsx)',
    'src/**/*.(spec|test).(ts|tsx)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFiles: ['./jest.setup.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/*.styles.{ts,tsx}',
    '!**/navigation/**',
    '!**/types/**',
    '!**/constants/**',
    '!**/theme/**',
    '!**/polyfills/**',
    '!**/index.{ts,tsx}',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};