import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
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
    } = await pool.query<{ users: string | null; history: string | null }>(
      `SELECT to_regclass('public."user"') AS users, to_regclass('public._prisma_migrations') AS history`,
    );
    if (objects.users && !objects.history)
      throw new Error('Destination conflict.');
    if (objects.history) {
      const {
        rows: [history],
      } = await pool.query<{ count: number }>(
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
    const code = await executeCli(
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
