import '@testing-library/jest-dom';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load the shared Supabase config for both projects. next/jest loads .env.local
// for the top-level config, but does not always propagate it into `projects`,
// so we load it here explicitly to guarantee env presence in every test run.
config({ path: resolve(__dirname, '..', '.env.local') });
