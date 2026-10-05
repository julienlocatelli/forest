import { createMigrationDataSource } from '../src/database/data-source.js';
describe('versioned migration', () => {
  it('applies at most once and has the expected schema', async () => {
    const source = createMigrationDataSource();
    try {
      await source.initialize();
      await source.runMigrations();
      expect(await source.runMigrations()).toEqual([]);
      expect(await source.showMigrations()).toBe(false);
      const columns = await source.query(
        `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='user'`,
      );
      expect(columns).toEqual(
        expect.arrayContaining(
          ['id', 'firstName', 'lastName', 'isActive'].map((column_name) => ({
            column_name,
            is_nullable: 'NO',
          })),
        ),
      );
    } finally {
      if (source.isInitialized) await source.destroy();
    }
  });
});

describe('untracked destination conflict', () => {
  it('refuses an untracked user table without altering its data', async () => {
    const { projectReference } = await import('./database-test-environment.js');
    const raw = process.env.TEST_CONFLICT_MIGRATION_DATABASE_URL;
    const conflict = projectReference(
      raw,
      'TEST_CONFLICT_MIGRATION_DATABASE_URL',
    );
    const targets = [
      'TEST_DATABASE_URL',
      'DATABASE_URL',
      'MIGRATION_DATABASE_URL',
    ];
    if (
      conflict === process.env.PRODUCTION_DATABASE_PROJECT_REF ||
      targets.some(
        (key) =>
          process.env[key] &&
          projectReference(process.env[key], key) === conflict,
      )
    )
      throw new Error('Conflict test requires a separate disposable project.');
    const source = createMigrationDataSource({
      ...process.env,
      MIGRATION_DATABASE_URL: raw,
    });
    let ownsFixture = false;
    try {
      await source.initialize();
      const [existing] = await source.query(
        `SELECT to_regclass('public."user"') AS users, to_regclass('public.migrations') AS history`,
      );
      if (existing.users || existing.history)
        throw new Error(
          'Conflict project must be unprepared; existing objects are preserved.',
        );
      await source.query(
        `CREATE TABLE public."user" (id integer PRIMARY KEY, marker text NOT NULL)`,
      );
      ownsFixture = true;
      await source.query(
        `INSERT INTO public."user" VALUES (1, 'owned-conflict-fixture')`,
      );
      await expect(
        source.runMigrations({ transaction: 'all' }),
      ).rejects.toThrow();
      expect(await source.query(`SELECT * FROM public."user"`)).toEqual([
        { id: 1, marker: 'owned-conflict-fixture' },
      ]);
    } finally {
      try {
        if (ownsFixture) {
          await source.query(`DROP TABLE public."user"`);
          await source.query(`DROP TABLE IF EXISTS public.migrations`);
        }
      } finally {
        if (source.isInitialized) await source.destroy();
      }
    }
  });
});
