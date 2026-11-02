import { describe, expect, it } from 'vitest';
import { databaseOptions, migrationUrl } from './database.config.js';
const valid = {
  DATABASE_URL:
    'postgresql://forest_app:private@ep-test-a1b2c3d4.eu-central-1.aws.neon.tech/neondb',
};
describe('database configuration', () => {
  it('requires runtime credentials independently from migration credentials', () => {
    expect(() =>
      databaseOptions({ MIGRATION_DATABASE_URL: valid.DATABASE_URL }),
    ).toThrow('DATABASE_URL');
    expect(() => databaseOptions(valid, 'migration')).toThrow(
      'MIGRATION_DATABASE_URL',
    );
  });
  it.each([
    'https://user:private@host/db',
    'postgres://host/db',
    'postgres://user:private@host/',
    `${valid.DATABASE_URL}?sslmode=require`,
  ])('rejects malformed or conflicting URL without echoing secrets', (url) => {
    try {
      databaseOptions({ DATABASE_URL: url });
      throw new Error('accepted');
    } catch (error) {
      expect((error as Error).message).not.toContain('private');
      expect((error as Error).message).toContain('DATABASE_URL');
    }
  });
  it.each(['0', '-1', 'NaN', '1.5', 'Infinity'])(
    'rejects invalid pool size %s',
    (size) => {
      expect(() =>
        databaseOptions({ ...valid, DATABASE_POOL_SIZE: size }),
      ).toThrow('DATABASE_POOL_SIZE');
    },
  );
  it('bounds the runtime pool and verifies TLS', () => {
    const options = databaseOptions(valid);
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(options.user).toBe('forest_app');
    expect(options.database).toBe('neondb');
    expect(options.max).toBe(5);
    expect(options.connectionTimeoutMillis).toBe(10000);
    expect(options.query_timeout).toBe(15000);
    expect(options.statement_timeout).toBe(15000);
  });
  it('uses separate strict TLS settings for the migration CLI', () => {
    const url = new URL(
      migrationUrl({ MIGRATION_DATABASE_URL: valid.DATABASE_URL }),
    );
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('sslaccept')).toBe('strict');
    expect(() => migrationUrl(valid)).toThrow('MIGRATION_DATABASE_URL');
  });
});
