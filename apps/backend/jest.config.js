module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  resolver: '<rootDir>/jest.resolver.js',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  modulePaths: ['<rootDir>/../../node_modules'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: {
        ignoreCodes: ['TS18046', 'TS7006', 'TS2694', 'TS2304', 'TS2307'],
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.constants.ts',
    '!src/**/*.decorator.ts',
    '!src/**/*.guard.ts',
    '!src/**/*.filter.ts',
    '!src/**/*.middleware.ts',
    '!src/**/*.pipe.ts',
    '!src/**/*.interceptor.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
  testTimeout: 30000,
};
