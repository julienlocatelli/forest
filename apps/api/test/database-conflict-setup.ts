import assert from 'node:assert/strict';
import pg from 'pg';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
import { testEnvironment } from './database-test-environment.js';

// Vitest completes globalSetup before starting any test suite.
export default async function setup() {
  const isolated = testEnvironment(process.env);
  const env = {
    ...isolated,
    MIGRATION_DATABASE_URL:
      isolated.TEST_CONFLICT_MIGRATION_DATABASE_URL ??
      isolated.MIGRATION_DATABASE_URL,
  };
  const pool = new pg.Pool(databaseOptions(env, 'migration'));
  let ownsFixture = false;
  try {
    const existing = await pool.query(
      "SELECT to_regclass('public.migrations') AS legacy",
    );
    assert.equal(
      existing.rows[0].legacy,
      null,
      'Existing legacy history is preserved; conflict setup aborted.',
    );
    // CREATE fails safely if another process creates the table after inspection.
    await pool.query(
      'CREATE TABLE public.migrations (id integer PRIMARY KEY, marker text NOT NULL)',
    );
    ownsFixture = true;
    await pool.query('ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY');
    await pool.query(
      'REVOKE ALL ON public.migrations FROM PUBLIC, anon, authenticated',
    );
    await pool.query('INSERT INTO public.migrations VALUES (1, $1)', [
      'owned-conflict-fixture',
    ]);
    assert.equal(
      await runMigration('run', env),
      1,
      'Migration must refuse legacy history.',
    );
    assert.deepEqual(
      (await pool.query('SELECT * FROM public.migrations')).rows,
      [{ id: 1, marker: 'owned-conflict-fixture' }],
    );
    console.log(
      'Conflict validation passed; existing legacy history was refused.',
    );
  } finally {
    try {
      if (ownsFixture) await pool.query('DROP TABLE public.migrations');
    } finally {
      await pool.end();
    }
  }
  assert.equal(
    await runMigration('run', isolated),
    0,
    'Migrations must finish before app bootstrap.',
  );
  return async () => {
    const runtime = new pg.Pool(databaseOptions(isolated));
    try {
      await runtime.query(
        'DELETE FROM public."user" WHERE id IN (SELECT "userId" FROM public.auth_identity WHERE email=$1)',
        [isolated.DEFAULT_USER_EMAIL],
      );
    } finally {
      await runtime.end();
    }
  };
}
