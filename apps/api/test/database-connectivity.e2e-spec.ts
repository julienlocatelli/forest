import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vi } from 'vitest';
describe('separate runtime and CLI connectivity', () => {
  beforeAll(async () => {
    expect(await runMigration('run')).toBe(0);
  });
  it('connects with the configured verified certificate and closes resources', async () => {
    const client = new PrismaClient({
      adapter: new PrismaPg(databaseOptions()),
    });
    try {
      await client.$connect();
      await client.$queryRaw`SELECT 1`;
      expect(await runMigration('show')).toBe(0);
    } finally {
      await client.$disconnect();
    }
  });
  it('rejects an invalid CA in both paths without printing credentials', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'forest-invalid-ca-'));
    const ca = join(dir, 'invalid.pem');
    writeFileSync(
      ca,
      '-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----',
    );
    const env = {
      ...process.env,
      DATABASE_SSL_CA_PATH: ca,
      MIGRATION_COMMAND_TIMEOUT_MS: '5000',
    };
    const client = new PrismaClient({
      adapter: new PrismaPg(databaseOptions(env)),
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      await expect(client.$queryRaw`SELECT 1`).rejects.toThrow();
      expect(await runMigration('show', env)).not.toBe(0);
      const logs = spy.mock.calls.flat().join(' ');
      expect(logs).not.toContain(
        new URL(process.env.MIGRATION_DATABASE_URL!).password,
      );
    } finally {
      spy.mockRestore();
      await client.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('fails a refused connection within a bounded interval', async () => {
    const pool = new pg.Pool({
      ...databaseOptions(),
      host: '127.0.0.1',
      port: 1,
      connectionTimeoutMillis: 100,
    });
    const started = Date.now();
    try {
      await expect(pool.query('SELECT 1')).rejects.toThrow();
      expect(Date.now() - started).toBeLessThan(5000);
    } finally {
      await pool.end();
    }
  });
});
