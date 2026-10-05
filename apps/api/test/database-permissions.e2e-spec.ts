import { DataSource } from 'typeorm';
import { databaseOptions } from '../src/database/database.config.js';
import { User } from '../src/users/user.entity.js';
import { createMigrationDataSource } from '../src/database/data-source.js';
describe('database authorization', () => {
  it('allows runtime CRUD but denies schema changes and public roles', async () => {
    const migration = createMigrationDataSource();
    const app = new DataSource({ ...databaseOptions(), entities: [User] });
    let id: number | undefined;
    try {
      await migration.initialize();
      await migration.runMigrations();
      await app.initialize();
      const roles = await app.query(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user`,
      );
      expect(roles[0]).toEqual({ rolsuper: false, rolbypassrls: false });
      for (const role of ['anon', 'authenticated']) {
        const [permissions] = await migration.query(
          `SELECT has_table_privilege($1, 'public."user"', 'SELECT') AS read, has_table_privilege($1, 'public."user"', 'INSERT') AS write, has_sequence_privilege($1, 'public.user_id_seq', 'USAGE') AS sequence`,
          [role],
        );
        expect(permissions).toEqual({
          read: false,
          write: false,
          sequence: false,
        });
      }
      const [schema] = await app.query(
        `SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS create`,
      );
      expect(schema.create).toBe(false);
      const [user] = await app.query(
        `INSERT INTO public."user" ("firstName", "lastName") VALUES ('Permission', 'Test') RETURNING id`,
      );
      id = user.id;
      await app.query(`UPDATE public."user" SET "isActive"=false WHERE id=$1`, [
        id,
      ]);
      expect(
        (
          await app.query(`SELECT "isActive" FROM public."user" WHERE id=$1`, [
            id,
          ])
        )[0].isActive,
      ).toBe(false);
      for (const schema of ['auth', 'storage']) {
        const permissions = await app.query(
          `SELECT has_table_privilege(current_user, c.oid, 'SELECT') AS allowed FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='r'`,
          [schema],
        );
        expect(
          permissions.every((row: { allowed: boolean }) => !row.allowed),
        ).toBe(true);
      }
    } finally {
      try {
        if (id !== undefined && app.isInitialized)
          await app.query(`DELETE FROM public."user" WHERE id=$1`, [id]);
      } finally {
        if (app.isInitialized) await app.destroy();
        if (migration.isInitialized) await migration.destroy();
      }
    }
  });
});
