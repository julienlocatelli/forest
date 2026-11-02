import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
describe('separate runtime and CLI connectivity', () => {
  beforeAll(async () => {
    expect(await runMigration('run')).toBe(0);
  });
  it('connects with a certificate verified by the system roots and closes resources', async () => {
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
  it('refuses a server certificate it cannot verify without leaking credentials', async () => {
    // A well-formed CA that signed nothing: the server certificate can no longer be verified.
    const ca = execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'ec',
        '-pkeyopt',
        'ec_paramgen_curve:prime256v1',
        '-nodes',
        '-subj',
        '/CN=forest-untrusted-test-ca',
        '-days',
        '1',
        '-keyout',
        '/dev/null',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const options = databaseOptions();
    const client = new PrismaClient({
      adapter: new PrismaPg({
        ...options,
        ssl: {
          rejectUnauthorized: true,
          ca,
        },
      }),
    });
    try {
      const error = await client.$queryRaw`SELECT 1`.then(
        () => undefined,
        (reason: unknown) => reason,
      );
      expect(String(error)).toMatch(/certificate/i);
      expect(String(error)).not.toContain(String(options.password));
    } finally {
      await client.$disconnect();
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
