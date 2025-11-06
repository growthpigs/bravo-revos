module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed to jsdom for React component testing
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'], // Added .tsx support
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/api/**/*.{ts,tsx}',
    'app/admin/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
};
