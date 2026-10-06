import { connectionUrl } from '../src/database/database.config.js';
export function projectReference(raw: string | undefined, key: string): string {
  const url = connectionUrl(raw, key);
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
  const pooled = /\.([a-z0-9]+)$/.exec(decodeURIComponent(url.username));
  if (direct) return direct[1];
  if (url.hostname.endsWith('.pooler.supabase.com') && pooled) return pooled[1];
  throw new Error(`${key} must identify a Supabase project.`);
}
export function testEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (env.TEST_DATABASE_CONFIRM_ISOLATED !== 'true')
    throw new Error('TEST_DATABASE_CONFIRM_ISOLATED=true is required.');
  const runtime = projectReference(env.TEST_DATABASE_URL, 'TEST_DATABASE_URL');
  const migration = projectReference(
    env.TEST_MIGRATION_DATABASE_URL,
    'TEST_MIGRATION_DATABASE_URL',
  );
  if (runtime !== migration)
    throw new Error('Test connections must target the same project.');
  if (env.PRODUCTION_DATABASE_PROJECT_REF === runtime)
    throw new Error('Production cannot be used for tests.');
  if (!env.PRODUCTION_DATABASE_PROJECT_REF)
    throw new Error(
      'PRODUCTION_DATABASE_PROJECT_REF must identify production or be none when no production project exists.',
    );
  for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL']) {
    if (env[key] && projectReference(env[key], key) === runtime)
      throw new Error(
        'Test project must differ from the configured application project.',
      );
  }
  if (env.TEST_CONFLICT_MIGRATION_DATABASE_URL) {
    const conflict = projectReference(
      env.TEST_CONFLICT_MIGRATION_DATABASE_URL,
      'TEST_CONFLICT_MIGRATION_DATABASE_URL',
    );
    if (
      conflict === env.PRODUCTION_DATABASE_PROJECT_REF ||
      ['DATABASE_URL', 'MIGRATION_DATABASE_URL'].some(
        (key) => env[key] && projectReference(env[key], key) === conflict,
      )
    ) {
      throw new Error(
        'Conflict test must use a disposable project distinct from the application.',
      );
    }
  }
  return {
    ...env,
    DATABASE_URL: env.TEST_DATABASE_URL,
    MIGRATION_DATABASE_URL: env.TEST_MIGRATION_DATABASE_URL,
  };
}
