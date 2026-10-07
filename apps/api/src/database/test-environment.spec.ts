import { describe, expect, it } from 'vitest';
import {
  projectReference,
  testEnvironment,
} from '../../test/database-test-environment.js';
const ref = 'abcdefghijklmnopqrst';
const env = {
  TEST_DATABASE_URL: `postgres://forest_app:secret@db.${ref}.supabase.co/postgres`,
  TEST_MIGRATION_DATABASE_URL: `postgres://forest_migration.${ref}:secret@aws-0.pooler.supabase.com/postgres`,
  TEST_DATABASE_CONFIRM_ISOLATED: 'true',
  PRODUCTION_DATABASE_PROJECT_REF: 'none',
};
describe('test destination isolation', () => {
  it('recognizes one project across endpoints and roles', () => {
    expect(projectReference(env.TEST_DATABASE_URL, 'test')).toBe(ref);
    expect(testEnvironment(env).DATABASE_URL).toBe(env.TEST_DATABASE_URL);
  });
  it('rejects production and mismatching projects', () => {
    expect(() =>
      testEnvironment({ ...env, PRODUCTION_DATABASE_PROJECT_REF: ref }),
    ).toThrow('Production');
    expect(() =>
      testEnvironment({
        ...env,
        TEST_MIGRATION_DATABASE_URL: env.TEST_MIGRATION_DATABASE_URL.replace(
          ref,
          'different',
        ),
      }),
    ).toThrow('same project');
  });
  it('requires an explicit declaration and rejects the app target', () => {
    expect(() =>
      testEnvironment({ ...env, TEST_DATABASE_CONFIRM_ISOLATED: '' }),
    ).toThrow('ISOLATED');
    expect(() =>
      testEnvironment({ ...env, DATABASE_URL: env.TEST_DATABASE_URL }),
    ).toThrow('differ');
  });
});
