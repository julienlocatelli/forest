import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { testEnvironment } from './test/database-test-environment.js';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

if (existsSync('.env')) loadEnvFile('.env');
// Always use synthetic auth credentials, never the account from the developer .env.
process.env.DEFAULT_USER_EMAIL = `e2e-${randomUUID()}@example.com`;
process.env.DEFAULT_USER_PASSWORD = 'Synthetic-e2e-password-123';
process.env.AUTH_ALLOWED_ORIGINS = 'http://localhost:3000';
const isolated = testEnvironment(process.env);
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    globalSetup: ['./test/database-setup.ts'],
    env: Object.fromEntries(
      Object.entries(isolated).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ),
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
