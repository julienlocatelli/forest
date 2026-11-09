import pg from 'pg';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
describe('database authorization', () => {
  it('allows Forest CRUD and denies schema changes and every other role', async () => {
    expect(await runMigration('run')).toBe(0);
    const migration = new pg.Pool(databaseOptions(process.env, 'migration'));
    const app = new pg.Pool(databaseOptions());
    let id: number | undefined;
    try {
      for (const pool of [app, migration]) {
        expect(
          (
            await pool.query(
              'SELECT rolsuper, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user',
            )
          ).rows[0],
        ).toEqual({
          rolsuper: false,
          rolcreaterole: false,
          rolbypassrls: false,
        });
      }
      expect(
        (
          await app.query<{ allowed: boolean }>(
            "SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
      expect(
        (
          await migration.query<{ relrowsecurity: boolean }>(
            'SELECT relrowsecurity FROM pg_class WHERE oid=\'public."user"\'::regclass',
          )
        ).rows[0].relrowsecurity,
      ).toBe(true);
      const runtime = (
        await app.query<{ name: string }>('SELECT current_user AS name')
      ).rows[0].name;
      const tables = [
        'public."user"',
        'public._prisma_migrations',
        'public.auth_identity',
        'public.auth_session',
        'public.auth_refresh_token',
        'public.auth_attempt',
      ];
      for (const table of tables) {
        const grants = await migration.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=$1::regclass AND a.grantee=0",
          [table],
        );
        expect(grants.rows[0].count).toBe(0);
        // Every role that can read or write the table, apart from the runtime role, the
        // owner (the migration role) and administrators: superusers and the members of
        // pg_read_all_data or pg_write_all_data, which the database provider manages.
        const others = await migration.query(
          `SELECT r.rolname FROM pg_roles r, pg_class c
           WHERE c.oid=$1::regclass AND r.rolname NOT LIKE 'pg\\_%'
             AND r.oid<>c.relowner AND r.rolname<>$2 AND NOT r.rolsuper
             AND NOT pg_has_role(r.oid,'pg_read_all_data','USAGE')
             AND NOT pg_has_role(r.oid,'pg_write_all_data','USAGE')
             AND has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE')`,
          [table, runtime],
        );
        expect(others.rows).toEqual([]);
      }
      expect(
        (
          await migration.query<{ count: number }>(
            "SELECT count(*)::int AS count FROM aclexplode((SELECT COALESCE(relacl,acldefault('S',relowner)) FROM pg_class WHERE oid='public.user_id_seq'::regclass)) WHERE grantee=0",
          )
        ).rows[0].count,
      ).toBe(0);
      expect(
        (
          await app.query<{ allowed: boolean }>(
            "SELECT has_table_privilege(current_user,'public._prisma_migrations','SELECT') AS allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
      const row = (
        await app.query<{ id: number }>(
          'INSERT INTO public."user" ("firstName","lastName") VALUES ($1,$2) RETURNING id',
          ['Permission', 'Test'],
        )
      ).rows[0];
      id = row.id;
      await app.query('UPDATE public."user" SET "isActive"=false WHERE id=$1', [
        id,
      ]);
      expect(
        (
          await app.query<{ isActive: boolean }>(
            'SELECT "isActive" FROM public."user" WHERE id=$1',
            [id],
          )
        ).rows[0].isActive,
      ).toBe(false);
      for (const table of [
        'auth_identity',
        'auth_session',
        'auth_refresh_token',
        'auth_attempt',
      ]) {
        expect(
          (
            await migration.query<{ relrowsecurity: boolean }>(
              'SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',
              [`public.${table}`],
            )
          ).rows[0].relrowsecurity,
        ).toBe(true);
        expect(
          (
            await app.query(
              "SELECT has_table_privilege(current_user,$1,'SELECT') AS read, has_table_privilege(current_user,$1,'INSERT') AS write",
              [`public.${table}`],
            )
          ).rows[0],
        ).toEqual({ read: true, write: true });
      }
    } finally {
      try {
        if (id !== undefined)
          await app.query('DELETE FROM public."user" WHERE id=$1', [id]);
      } finally {
        await app.end();
        await migration.end();
      }
    }
  });
});
