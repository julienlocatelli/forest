import pg from 'pg';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
describe('Prisma migration', () => {
  it('checks history and resumes after a bounded CLI timeout', async () => {
    expect(await runMigration('run')).toBe(0);
    const pool = new pg.Pool(databaseOptions(process.env, 'migration'));
    try {
      const before = (
        await pool.query(
          'SELECT migration_name, finished_at FROM public._prisma_migrations ORDER BY migration_name',
        )
      ).rows;
      expect(
        await runMigration('show', {
          ...process.env,
          MIGRATION_COMMAND_TIMEOUT_MS: '1',
        }),
      ).toBe(124);
      expect(
        (
          await pool.query(
            'SELECT migration_name, finished_at FROM public._prisma_migrations ORDER BY migration_name',
          )
        ).rows,
      ).toEqual(before);
      expect(await runMigration('show')).toBe(0);
      expect(await runMigration('run')).toBe(0);
    } finally {
      await pool.end();
    }
  });
  it('initializes once and preserves rows on repetition', async () => {
    expect(await runMigration('run')).toBe(0);
    const pool = new pg.Pool(databaseOptions());
    let id: number | undefined;
    try {
      id = (
        await pool.query(
          'INSERT INTO public."user" ("firstName","lastName") VALUES ($1,$2) RETURNING id',
          ['Repeat', 'Test'],
        )
      ).rows[0].id;
      expect(await runMigration('run')).toBe(0);
      expect(await runMigration('show')).toBe(0);
      expect(
        (
          await pool.query(
            'SELECT "firstName" FROM public."user" WHERE id=$1',
            [id],
          )
        ).rows[0].firstName,
      ).toBe('Repeat');
      const columns = (
        await pool.query(
          "SELECT column_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='user'",
        )
      ).rows;
      expect(columns).toEqual(
        expect.arrayContaining(
          ['id', 'firstName', 'lastName', 'isActive'].map((column_name) => ({
            column_name,
            is_nullable: 'NO',
          })),
        ),
      );
    } finally {
      try {
        if (id !== undefined)
          await pool.query('DELETE FROM public."user" WHERE id=$1', [id]);
      } finally {
        await pool.end();
      }
    }
  });
});
