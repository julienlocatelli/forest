import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import type { PoolConfig } from 'pg';

export type Environment = Record<string, string | undefined>;
function certificatePath(value: string, env: Environment): string {
  return value.replace(/\$\{([^}]+)\}/g, (_match, variable: string) => {
    if (variable === 'HOME') return env.HOME || homedir();
    if (variable === 'PWD') return process.cwd();
    throw new Error('Unsupported certificate path variable.');
  });
}
export function connectionUrl(value: string | undefined, key: string): URL {
  try {
    if (!value) throw new Error();
    const url = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      !url.password ||
      url.pathname.length < 2 ||
      url.hash
    )
      throw new Error();
    // URL parameters must not override verified TLS or driver options.
    if (url.search) throw new Error();
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
    decodeURIComponent(url.pathname);
    return url;
  } catch {
    throw new Error(
      `${key} must be a complete PostgreSQL URL without query parameters.`,
    );
  }
}
export function positiveInteger(
  env: Environment,
  key: string,
  fallback: number,
): number {
  if (env[key] === undefined) return fallback;
  const value = env[key]!;
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  )
    throw new Error(`${key} must be a positive integer.`);
  return Number(value);
}
export function databaseOptions(
  env: Environment = process.env,
  purpose: 'runtime' | 'migration' = 'runtime',
): PoolConfig {
  const key = purpose === 'runtime' ? 'DATABASE_URL' : 'MIGRATION_DATABASE_URL';
  const url = connectionUrl(env[key], key);
  let ca: string | undefined;
  if (env.DATABASE_SSL_CA_PATH) {
    try {
      ca = readFileSync(certificatePath(env.DATABASE_SSL_CA_PATH, env), 'utf8');
      if (!ca.includes('-----BEGIN CERTIFICATE-----')) throw new Error();
    } catch {
      throw new Error(
        'DATABASE_SSL_CA_PATH must reference a readable PEM certificate.',
      );
    }
  }
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max:
      purpose === 'runtime' ? positiveInteger(env, 'DATABASE_POOL_SIZE', 5) : 1,
    connectionTimeoutMillis: positiveInteger(
      env,
      'DATABASE_CONNECT_TIMEOUT_MS',
      10000,
    ),
    query_timeout: positiveInteger(env, 'DATABASE_QUERY_TIMEOUT_MS', 15000),
    statement_timeout: positiveInteger(env, 'DATABASE_QUERY_TIMEOUT_MS', 15000),
  };
}
export function migrationUrl(env: Environment = process.env): string {
  const url = connectionUrl(
    env.MIGRATION_DATABASE_URL,
    'MIGRATION_DATABASE_URL',
  );
  databaseOptions(env, 'migration'); // Validate CA and limits before constructing CLI settings.
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict');
  if (env.DATABASE_SSL_CA_PATH) {
    url.searchParams.set(
      'sslcert',
      certificatePath(env.DATABASE_SSL_CA_PATH, env),
    );
  }
  return url.href;
}
