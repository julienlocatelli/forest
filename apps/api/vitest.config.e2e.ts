import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { testEnvironment } from './test/database-test-environment.js';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

if (existsSync('.env')) loadEnvFile('.env');
const isolated = testEnvironment(process.env);
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
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
