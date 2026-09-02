import '@testing-library/jest-dom';
// TASK-DBT-01: the suites import `expect` from '@jest/globals', whose Matchers
// type is NOT the global one the default entry above augments — so every
// `toBeInTheDocument` / `toHaveTextContent` was a type error tsc could see and
// ts-jest never did (733 of the 1 099 test-tier errors). This entry augments
// the '@jest/globals' expect; both register the same matchers at runtime.
import '@testing-library/jest-dom/jest-globals';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load the shared Supabase config for both projects. next/jest loads .env.local
// for the top-level config, but does not always propagate it into `projects`,
// so we load it here explicitly to guarantee env presence in every test run.
config({ path: resolve(__dirname, '..', '.env.local') });
