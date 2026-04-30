const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // server-only is a Next.js build-time guard; in Jest (Node) it's a no-op
    '^server-only$': '<rootDir>/__mocks__/server-only.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react', esModuleInterop: true } }],
  },
  setupFiles: ['<rootDir>/jest.setup.env.js'],
};

module.exports = customJestConfig;
