import assert from 'node:assert/strict';
import pg from 'pg';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
import { testEnvironment } from './database-test-environment.js';

// Vitest completes globalSetup before starting any test suite.
export default async function setup() {
  const isolated = testEnvironment(process.env);
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
