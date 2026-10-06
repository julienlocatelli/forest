import { describe, expect, it } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('Prisma lifecycle', () => {
  it('rejects missing runtime credentials without requiring migration credentials', () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      expect(() => new PrismaService()).toThrow('DATABASE_URL');
    } finally {
      if (previous !== undefined) process.env.DATABASE_URL = previous;
    }
  });
  it('reports a refused runtime connection without leaking its URL', async () => {
    const previous = { ...process.env };
    process.env.DATABASE_URL = 'postgresql://forest:private@127.0.0.1:1/forest';
    process.env.DATABASE_CONNECT_TIMEOUT_MS = '100';
    delete process.env.DATABASE_SSL_CA_PATH;
    delete process.env.MIGRATION_DATABASE_URL;
    const client = new PrismaService();
    try {
      await expect(client.onModuleInit()).rejects.toThrow(
        'Database connection failed. Check credentials, TLS and connectivity.',
      );
    } finally {
      await client.onModuleDestroy();
      for (const key of [
        'DATABASE_URL',
        'DATABASE_CONNECT_TIMEOUT_MS',
        'DATABASE_SSL_CA_PATH',
        'MIGRATION_DATABASE_URL',
      ]) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
});
