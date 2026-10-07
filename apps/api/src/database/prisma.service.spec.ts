import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('Prisma lifecycle', () => {
  it('rejects a database without required tables before provisioning and closes its connection', async () => {
    const previous = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://forest:private@127.0.0.1:1/forest';
    const client = new PrismaService();
    try {
      vi.spyOn(client, '$connect').mockResolvedValue(undefined);
      vi.spyOn(client, '$queryRaw')
        .mockResolvedValueOnce([{ '?column?': 1 }])
        .mockResolvedValueOnce([{ ready: false }]);
      const close = vi
        .spyOn(client, '$disconnect')
        .mockResolvedValue(undefined);
      await expect(client.onModuleInit()).rejects.toMatchObject({
        code: 'DATABASE_SCHEMA',
      });
      expect(close).toHaveBeenCalledOnce();
    } finally {
      vi.restoreAllMocks();
      await client.onModuleDestroy();
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
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
