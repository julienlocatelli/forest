import pg from 'pg';
import { databaseOptions } from '../src/database/database.config.js';
import { runMigration } from '../src/database/migrate.js';
describe('database authorization', () => {
  it('allows Forest CRUD and denies schema, public and provider access', async () => {
    expect(await runMigration('run')).toBe(0);
    const migration = new pg.Pool(databaseOptions(process.env, 'migration'));
    const app = new pg.Pool(databaseOptions());
    let id: number | undefined;
    try {
      expect(
        (
          await app.query(
            'SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user',
          )
        ).rows[0],
      ).toEqual({ rolsuper: false, rolbypassrls: false });
      expect(
        (
          await app.query(
            "SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
      expect(
        (
          await migration.query(
            'SELECT relrowsecurity FROM pg_class WHERE oid=\'public."user"\'::regclass',
          )
        ).rows[0].relrowsecurity,
      ).toBe(true);
      for (const table of [
        'public."user"',
        'public._prisma_migrations',
        'public.auth_identity',
        'public.auth_session',
        'public.auth_refresh_token',
        'public.auth_attempt',
      ]) {
        const grants = await migration.query(
          "SELECT count(*)::int AS count FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=$1::regclass AND a.grantee=0",
          [table],
        );
        expect(grants.rows[0].count).toBe(0);
      }
      for (const role of ['anon', 'authenticated']) {
        for (const table of [
          'public."user"',
          'public._prisma_migrations',
          'public.auth_identity',
          'public.auth_session',
          'public.auth_refresh_token',
          'public.auth_attempt',
        ]) {
          expect(
            (
              await migration.query(
                "SELECT has_table_privilege($1,$2,'SELECT') AS read, has_table_privilege($1,$2,'INSERT') AS write",
                [role, table],
              )
            ).rows[0],
          ).toEqual({ read: false, write: false });
        }
        expect(
          (
            await migration.query(
              "SELECT has_sequence_privilege($1,'public.user_id_seq','USAGE') AS allowed",
              [role],
            )
          ).rows[0].allowed,
        ).toBe(false);
      }
      expect(
        (
          await app.query(
            "SELECT has_table_privilege(current_user,'public._prisma_migrations','SELECT') AS allowed",
          )
        ).rows[0].allowed,
      ).toBe(false);
      const row = (
        await app.query(
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
          await app.query('SELECT "isActive" FROM public."user" WHERE id=$1', [
            id,
          ])
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
            await migration.query(
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
      for (const schema of ['auth', 'storage']) {
        const result = await app.query(
          "SELECT has_table_privilege(current_user,c.oid,'SELECT') AS allowed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='r'",
          [schema],
        );
        expect(result.rows.every((r: { allowed: boolean }) => !r.allowed)).toBe(
          true,
        );
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
