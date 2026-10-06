import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { executeCli, runMigration } from './migrate.js';
describe('migration process boundary', () => {
  it('fails closed on invalid commands and missing migration configuration', async () => {
    expect(await runMigration('reset', {})).toBe(1);
    expect(
      await runMigration('run', {
        DATABASE_URL: 'postgresql://runtime:private@host/db',
      }),
    ).toBe(1);
    expect(
      await runMigration('show', { MIGRATION_COMMAND_TIMEOUT_MS: '0' }),
    ).toBe(1);
  });
  it('returns failure without relaying secret CLI output', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'forest-cli-'));
    try {
      const path = join(dir, 'cli.cjs');
      writeFileSync(path, 'console.error("private-secret");process.exit(7)');
      expect(await executeCli(path, [], {}, 1000)).toBe(7);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('terminates a stuck child with a bounded result', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'forest-cli-'));
    try {
      const path = join(dir, 'cli.cjs');
      writeFileSync(path, 'setInterval(()=>{},1000)');
      expect(await executeCli(path, [], {}, 50)).toBe(124);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
