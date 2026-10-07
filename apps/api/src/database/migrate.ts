import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import {
  databaseOptions,
  migrationUrl,
  positiveInteger,
  type Environment,
} from './database.config.js';

export function executeCli(
  cli: string,
  args: string[],
  env: Environment,
  timeout: number,
): Promise<number> {
  return executeProcess(process.execPath, [cli, ...args], env, timeout);
}
function executeProcess(
  executable: string,
  args: string[],
  env: Environment,
  timeout: number,
): Promise<number> {
  return new Promise((resolveCode) => {
    const child = spawn(executable, args, {
      env,
      stdio: 'ignore',
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout);
    child.on('error', () => {
      clearTimeout(timer);
      resolveCode(1);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveCode(timedOut ? 124 : (code ?? 1));
    });
  });
}
async function executeDocker(
  args: string[],
  env: Environment,
  url: string,
  timeout: number,
) {
  const connection = new URL(url);
  const certificate = connection.searchParams.get('sslcert');
  const name = `forest-prisma-${randomUUID()}`;
  const mounts = [
    '--mount',
    `type=bind,src=${resolve('../..')},dst=/workspace,readonly`,
  ];
  if (certificate) {
    mounts.push(
      '--mount',
      `type=bind,src=${resolve(certificate)},dst=/forest-ca.pem,readonly`,
    );
    connection.searchParams.set('sslcert', '/forest-ca.pem');
  }
  try {
    return await executeProcess(
      'docker',
      [
        'run',
        '--rm',
        '--name',
        name,
        '--env',
        'FOREST_PRISMA_MIGRATION_URL',
        ...mounts,
        '--workdir',
        '/workspace/apps/api',
        'forest-prisma-cli:7.10.0',
        ...args,
      ],
      { ...env, FOREST_PRISMA_MIGRATION_URL: connection.href },
      timeout,
    );
  } finally {
    // Killing the Docker client alone leaves its container running after a deadline.
    await executeProcess('docker', ['rm', '--force', name], env, 5000);
  }
}
async function assertDestination(
  env: Environment,
  timeout: number,
): Promise<void> {
  const options = databaseOptions(env, 'migration');
  const pool = new pg.Pool({
    ...options,
    connectionTimeoutMillis: Math.min(
      options.connectionTimeoutMillis ?? timeout,
      timeout,
    ),
    query_timeout: Math.min(options.query_timeout ?? timeout, timeout),
    statement_timeout: Math.min(
      typeof options.statement_timeout === 'number'
        ? options.statement_timeout
        : timeout,
      timeout,
    ),
  });
  try {
    const {
      rows: [objects],
    } = await pool.query(
      `SELECT to_regclass('public."user"') AS users, to_regclass('public.migrations') AS legacy, to_regclass('public._prisma_migrations') AS history`,
    );
    if (objects.legacy || (objects.users && !objects.history))
      throw new Error('Destination conflict.');
    if (objects.history) {
      const {
        rows: [history],
      } = await pool.query(
        'SELECT count(*)::int AS count FROM public._prisma_migrations',
      );
      if (objects.users && history.count === 0)
        throw new Error('Destination conflict.');
    }
  } finally {
    await pool.end();
  }
}
export async function runMigration(
  command: string,
  env: Environment = process.env,
): Promise<number> {
  try {
    if (command !== 'run' && command !== 'show')
      throw new Error('Invalid migration command.');
    const mode = env.MIGRATION_CLI_MODE ?? 'native';
    if (mode !== 'native' && mode !== 'docker')
      throw new Error('Invalid CLI mode.');
    const timeout = positiveInteger(
      env,
      'MIGRATION_COMMAND_TIMEOUT_MS',
      120000,
    );
    const url = migrationUrl(env);
    const started = Date.now();
    if (command === 'run') await assertDestination(env, timeout);
    const remaining = timeout - (Date.now() - started);
    if (remaining <= 0) throw new Error('Migration deadline exceeded.');
    const cli = createRequire(import.meta.url).resolve('prisma/build/index.js');
    const args = [
      'migrate',
      command === 'run' ? 'deploy' : 'status',
      '--config',
      'prisma.config.ts',
    ];
    const code =
      mode === 'docker'
        ? await executeDocker(args, env, url, remaining)
        : await executeCli(
            cli,
            args,
            { ...env, FOREST_PRISMA_MIGRATION_URL: url },
            remaining,
          );
    if (code === 0)
      console.log(
        command === 'run'
          ? 'Database migrations applied.'
          : 'No pending migrations.',
      );
    else
      console.error(
        code === 124
          ? 'Migration timed out. Verify remote history before retrying.'
          : 'Migration incomplete or failed. Check configuration, TLS, history and permissions.',
      );
    return code;
  } catch {
    console.error(
      'Database migration failed. Check configuration, TLS, roles and schema conflicts.',
    );
    return 1;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  process.exitCode = await runMigration(process.argv[2] ?? '');
}
