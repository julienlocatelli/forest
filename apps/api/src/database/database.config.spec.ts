import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { databaseOptions } from './database.config.js';
const valid = {
  DATABASE_URL:
    'postgresql://forest_app:private@db.test.supabase.co:5432/postgres',
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
  it('fails closed on unreadable CA', () => {
    expect(() =>
      databaseOptions({
        ...valid,
        DATABASE_SSL_CA_PATH: '/does-not-exist/private',
      }),
    ).toThrow('DATABASE_SSL_CA_PATH');
  });
  it.each(['HOME', 'PWD'])('reads a CA with ${%s} in its path', (variable) => {
    const directory = mkdtempSync(join(tmpdir(), 'forest-ca-'));
    const file = join(directory, 'ca.crt');
    const pem =
      '-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----';
    try {
      writeFileSync(file, pem);
      const path =
        variable === 'HOME'
          ? '${HOME}/ca.crt'
          : '${PWD}/' + relative(process.cwd(), file);
      const options = databaseOptions({
        ...valid,
        HOME: directory,
        DATABASE_SSL_CA_PATH: path,
      });
      expect(options.ssl).toEqual({ rejectUnauthorized: true, ca: pem });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('rejects unsupported path variables without exposing the value', () => {
    expect(() =>
      databaseOptions({
        ...valid,
        DATABASE_SSL_CA_PATH: '${UNKNOWN}/secret.crt',
      }),
    ).toThrow(
      'DATABASE_SSL_CA_PATH must reference a readable PEM certificate.',
    );
  });
  it('disables implicit DDL and verifies TLS', () => {
    const options = databaseOptions(valid);
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.installExtensions).toBe(false);
    expect(options.ssl).toEqual({ rejectUnauthorized: true });
    expect(options.poolSize).toBe(5);
    expect(options.connectTimeoutMS).toBe(10000);
  });
});
