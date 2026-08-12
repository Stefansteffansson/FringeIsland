const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/**
 * Two projects, mirroring the hub-legacy oracle (copy-with-correction):
 *  - unit:        jsdom, component/pure-function tests
 *  - integration: node, real Supabase via .env.local (anon client = RLS-enforced
 *                 assertions; service-role admin client = setup/teardown only)
 *
 * next/jest does not propagate its transform into `projects`, so each project
 * declares ts-jest explicitly (the proven oracle pattern).
 */
const customJestConfig = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
    },
    {
      displayName: 'integration',
      testEnvironment: 'jest-environment-node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts',
        '<rootDir>/tests/integration/suite-setup.ts',
      ],
      // Cleanup is part of testing. The E2E tier has had a global teardown since
      // TASK-INT-05; this tier had none, so a suite that forgot its own afterAll
      // leaked silently and forever. Sweeps `test-*` fixture residue and says so.
      globalTeardown: '<rootDir>/tests/integration/global-teardown.ts',
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
      },
    },
  ],
};

module.exports = createJestConfig(customJestConfig);
