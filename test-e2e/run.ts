import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { databaseOptions } from '../apps/api/src/database/database.config.ts';
import { testEnvironment } from '../apps/api/test/database-test-environment.ts';

const api = resolve(import.meta.dirname, '../apps/api');
const cucumber = resolve(import.meta.dirname, 'node_modules/.bin/cucumber-js');
const port = process.env.E2E_API_PORT ?? '3101';
const apiUrl = `http://localhost:${port}`;
// A fresh synthetic account per run, so login rate limits never carry over between runs.
const user = {
  email: `e2e-${randomUUID()}@example.com`,
  password: 'Synthetic-e2e-password-123',
};

async function deleteUser(env: NodeJS.ProcessEnv) {
  const pool = new pg.Pool(databaseOptions(env));
  try {
    await pool.query(
      'DELETE FROM public."user" WHERE id IN (SELECT "userId" FROM public.auth_identity WHERE email=$1)',
      [user.email],
    );
  } finally {
    await pool.end();
  }
}

function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  return new Promise<number>((done) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit' });
    child.on('error', () => done(1));
    child.on('close', (code) => done(code ?? 1));
  });
}

async function waitFor(url: string, exited: () => boolean, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (exited()) throw new Error('The API stopped before answering.');
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((wait) => setTimeout(wait, 500));
    }
  }
  throw new Error(`The API did not answer on ${url} within ${timeout} ms.`);
}

async function main(): Promise<number> {
  // The API resolves ${PWD} in DATABASE_SSL_CA_PATH from its own directory.
  process.chdir(api);
  // Read apps/api/.env without expanding ${PWD}: the API resolves it from its own directory.
  const envFile = resolve(api, '.env');
  if (existsSync(envFile))
    for (const [key, value] of Object.entries(parseEnv(readFileSync(envFile, 'utf8'))))
      process.env[key] ??= value;
  // Throws unless the TEST_* variables target an isolated, non-production project.
  const isolated = testEnvironment(process.env);
  const apiEnv = {
    ...isolated,
    PORT: port,
    DEFAULT_USER_EMAIL: user.email,
    DEFAULT_USER_PASSWORD: user.password,
    AUTH_ALLOWED_ORIGINS: 'http://localhost:3000',
  };

  if ((await run('bun', ['run', 'build'], api, apiEnv)) !== 0) return 1;
  if ((await run('node', ['dist/database/migrate.js', 'run'], api, apiEnv)) !== 0) return 1;

  const server = spawn('node', ['dist/main.js'], { cwd: api, env: apiEnv, stdio: 'inherit' });
  let exited = false;
  server.on('close', () => (exited = true));
  try {
    await waitFor(apiUrl, () => exited);
    // Scenarios get the API address and the test account only, never database settings.
    // Playwright supports Node only; Node 24 runs the TypeScript steps natively.
    // Extra arguments go to Cucumber, e.g. `bun run test:e2e --order random:42`.
    return await run('node', [cucumber, '--config', 'cucumber.mjs', ...process.argv.slice(2)], import.meta.dirname, {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      E2E_API_URL: apiUrl,
      E2E_USER_EMAIL: user.email,
      E2E_USER_PASSWORD: user.password,
    });
  } finally {
    if (!exited) {
      const stopped = new Promise((done) => server.on('close', done));
      server.kill('SIGTERM');
      await stopped;
    }
    await deleteUser(apiEnv);
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'test:e2e failed.');
  process.exitCode = 1;
}
