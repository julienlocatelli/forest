import { describe, expect, it } from 'vitest';
import {
  projectReference,
  testEnvironment,
} from '../../test/database-test-environment.js';
const endpoint = 'ep-purple-term-a1b2c3d4';
const host = 'c-2.eu-central-1.aws.neon.tech';
const supabase = 'abcdefghijklmnopqrst';
const env = {
  TEST_DATABASE_URL: `postgresql://forest_app:secret@${endpoint}-pooler.${host}/neondb`,
  TEST_MIGRATION_DATABASE_URL: `postgresql://forest_migration:secret@${endpoint}.${host}/neondb`,
  TEST_DATABASE_CONFIRM_ISOLATED: 'true',
  PRODUCTION_DATABASE_PROJECT_REF: 'none',
};
describe('test destination isolation', () => {
  it('recognizes one Neon endpoint across pooled and direct hosts', () => {
    expect(projectReference(env.TEST_DATABASE_URL, 'test')).toBe(endpoint);
    expect(projectReference(env.TEST_MIGRATION_DATABASE_URL, 'test')).toBe(
      endpoint,
    );
    const isolated = testEnvironment(env);
    expect(isolated.DATABASE_URL).toBe(env.TEST_DATABASE_URL);
    expect(isolated.MIGRATION_DATABASE_URL).toBe(
      env.TEST_MIGRATION_DATABASE_URL,
    );
  });
  it('still recognizes Supabase projects for the application', () => {
    expect(
      projectReference(
        `postgres://forest_app:secret@db.${supabase}.supabase.co/postgres`,
        'app',
      ),
    ).toBe(supabase);
    expect(
      projectReference(
        `postgres://forest_app.${supabase}:secret@aws-0.pooler.supabase.com/postgres`,
        'app',
      ),
    ).toBe(supabase);
    expect(
      testEnvironment({
        ...env,
        DATABASE_URL: `postgres://forest_app.${supabase}:secret@aws-0.pooler.supabase.com/postgres`,
        PRODUCTION_DATABASE_PROJECT_REF: supabase,
      }).DATABASE_URL,
    ).toBe(env.TEST_DATABASE_URL);
  });
  it('requires a Neon test database and names the variable', () => {
    const run = () =>
      testEnvironment({
        ...env,
        TEST_DATABASE_URL: `postgres://forest_app.${supabase}:secret@aws-0.pooler.supabase.com/postgres`,
      });
    expect(run).toThrow('TEST_DATABASE_URL must identify a Neon endpoint.');
    expect(run).not.toThrow('secret');
  });
  it('requires a pooled runtime URL and a direct migration URL', () => {
    expect(() =>
      testEnvironment({
        ...env,
        TEST_DATABASE_URL: env.TEST_MIGRATION_DATABASE_URL,
      }),
    ).toThrow('TEST_DATABASE_URL must use the pooled Neon host (-pooler).');
    expect(() =>
      testEnvironment({
        ...env,
        TEST_MIGRATION_DATABASE_URL: env.TEST_DATABASE_URL,
      }),
    ).toThrow(
      'TEST_MIGRATION_DATABASE_URL must use the direct Neon host, without -pooler.',
    );
  });
  it('rejects an unknown application host', () => {
    expect(() =>
      testEnvironment({
        ...env,
        DATABASE_URL: 'postgres://forest_app:secret@localhost/forest',
      }),
    ).toThrow('DATABASE_URL must identify a Neon endpoint or a Supabase project.');
  });
  it('rejects production and mismatching endpoints', () => {
    expect(() =>
      testEnvironment({ ...env, PRODUCTION_DATABASE_PROJECT_REF: endpoint }),
    ).toThrow('Production');
    expect(() =>
      testEnvironment({
        ...env,
        TEST_MIGRATION_DATABASE_URL: env.TEST_MIGRATION_DATABASE_URL.replace(
          endpoint,
          'ep-other-name-e5f6g7h8',
        ),
      }),
    ).toThrow('same project');
  });
  it('requires an explicit declaration and rejects the app target', () => {
    expect(() =>
      testEnvironment({ ...env, TEST_DATABASE_CONFIRM_ISOLATED: '' }),
    ).toThrow('ISOLATED');
    expect(() =>
      testEnvironment({ ...env, PRODUCTION_DATABASE_PROJECT_REF: '' }),
    ).toThrow('PRODUCTION_DATABASE_PROJECT_REF');
    expect(() =>
      testEnvironment({
        ...env,
        MIGRATION_DATABASE_URL: env.TEST_MIGRATION_DATABASE_URL,
      }),
    ).toThrow('differ');
  });
  it('verifies test TLS with the test CA only, system roots by default', () => {
    const appCa = { ...env, DATABASE_SSL_CA_PATH: '/certs/app.crt' };
    expect(testEnvironment(appCa).DATABASE_SSL_CA_PATH).toBe('');
    expect(
      testEnvironment({ ...appCa, TEST_DATABASE_SSL_CA_PATH: '/certs/test.crt' })
        .DATABASE_SSL_CA_PATH,
    ).toBe('/certs/test.crt');
  });
});
