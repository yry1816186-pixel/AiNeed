module.exports = {
  preset: 'detox/test-runner',
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 120000,
  setupFilesAfterEnv: ['detox/runners/jest/reporter'],
  verbose: true,
};
