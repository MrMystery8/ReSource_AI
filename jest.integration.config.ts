import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/backend'],
  testMatch: [
    '**/__tests__/integration/**/*.ts',
    '**/*.integration.test.ts',
    '**/*.integration.spec.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  // Integration tests may need longer timeouts for deployed stack calls
  testTimeout: 30000,
};

export default config;
