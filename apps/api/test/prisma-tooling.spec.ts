import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');
describe('offline Prisma tooling', () => {
  it.each(['validate', 'generate'])(
    '%s does not need migration credentials',
    (command) => {
      const env = { ...process.env };
      delete env.MIGRATION_DATABASE_URL;
      delete env.FOREST_PRISMA_MIGRATION_URL;
      delete env.DATABASE_URL;
      const result = spawnSync(process.execPath, [cli, command], {
        env,
        timeout: 10000,
        stdio: 'pipe',
      });
      expect(result.status).toBe(0);
    },
  );
});
