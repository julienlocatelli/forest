import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateForestUsers1791158400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    // Do not silently adopt or overwrite an existing untracked table.
    await runner.query(`CREATE TABLE public."user" (
      id SERIAL PRIMARY KEY,
      "firstName" character varying NOT NULL,
      "lastName" character varying NOT NULL,
      "isActive" boolean NOT NULL DEFAULT true
    )`);
    await runner.query(`ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY`);
    await runner.query(
      `REVOKE ALL ON public."user" FROM PUBLIC, anon, authenticated`,
    );
    await runner.query(
      `REVOKE ALL ON SEQUENCE public.user_id_seq FROM PUBLIC, anon, authenticated`,
    );
    await runner.query(`GRANT USAGE ON SCHEMA public TO forest_app`);
    await runner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON public."user" TO forest_app`,
    );
    await runner.query(
      `GRANT USAGE, SELECT ON SEQUENCE public.user_id_seq TO forest_app`,
    );
    await runner.query(
      `CREATE POLICY forest_app_crud ON public."user" FOR ALL TO forest_app USING (true) WITH CHECK (true)`,
    );
  }
  down(): Promise<void> {
    // Destructive rollback could erase data written after migration.
    return Promise.reject(
      new Error(
        'Automatic rollback is disabled; use an explicitly reviewed recovery procedure.',
      ),
    );
  }
}
