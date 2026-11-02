import { connectionUrl } from '../src/database/database.config.js';
// A Neon endpoint ID names one compute; its pooled host only adds `-pooler`.
function neonEndpoint(url: URL): string | undefined {
  return /^(ep-[a-z0-9-]+?)(?:-pooler)?\.[a-z0-9.-]+\.neon\.tech$/.exec(
    url.hostname,
  )?.[1];
}
function supabaseProject(url: URL): string | undefined {
  const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname);
  const pooled = /\.([a-z0-9]+)$/.exec(decodeURIComponent(url.username));
  if (direct) return direct[1];
  if (url.hostname.endsWith('.pooler.supabase.com') && pooled) return pooled[1];
  return undefined;
}
// The Neon endpoint ID or the Supabase project ref the URL targets.
export function projectReference(raw: string | undefined, key: string): string {
  const url = connectionUrl(raw, key);
  const project = neonEndpoint(url) ?? supabaseProject(url);
  if (!project)
    throw new Error(
      `${key} must identify a Neon endpoint or a Supabase project.`,
    );
  return project;
}
// The runtime goes through the pooler; the migration CLI needs a direct connection.
function testEndpoint(
  raw: string | undefined,
  key: string,
  pooled: boolean,
): string {
  const url = connectionUrl(raw, key);
  const endpoint = neonEndpoint(url);
  if (!endpoint) throw new Error(`${key} must identify a Neon endpoint.`);
  if (url.hostname.startsWith(`${endpoint}-pooler.`) !== pooled)
    throw new Error(
      pooled
        ? `${key} must use the pooled Neon host (-pooler).`
        : `${key} must use the direct Neon host, without -pooler.`,
    );
  return endpoint;
}
export function testEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (env.TEST_DATABASE_CONFIRM_ISOLATED !== 'true')
    throw new Error('TEST_DATABASE_CONFIRM_ISOLATED=true is required.');
  const runtime = testEndpoint(
    env.TEST_DATABASE_URL,
    'TEST_DATABASE_URL',
    true,
  );
  const migration = testEndpoint(
    env.TEST_MIGRATION_DATABASE_URL,
    'TEST_MIGRATION_DATABASE_URL',
    false,
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
  return {
    ...env,
    DATABASE_URL: env.TEST_DATABASE_URL,
    MIGRATION_DATABASE_URL: env.TEST_MIGRATION_DATABASE_URL,
    // Never the application's CA: an empty value verifies against the system roots.
    DATABASE_SSL_CA_PATH: env.TEST_DATABASE_SSL_CA_PATH ?? '',
  };
}
