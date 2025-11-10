module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed to jsdom for React component testing
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'], // Added .tsx support
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock react-markdown to avoid ESM issues
    '^react-markdown$': '<rootDir>/__mocks__/react-markdown.tsx',
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
  transformIgnorePatterns: [
    'node_modules/(?!(react-markdown)/)',
  ],
};
