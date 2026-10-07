BEGIN;
-- CreateTable
CREATE TABLE public."user" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR NOT NULL,
    "lastName" VARCHAR NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."user" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.user_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO forest_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."user" TO forest_app;
GRANT USAGE, SELECT ON SEQUENCE public.user_id_seq TO forest_app;
CREATE POLICY forest_app_crud ON public."user" FOR ALL TO forest_app USING (true) WITH CHECK (true);
REVOKE ALL ON public._prisma_migrations FROM PUBLIC, anon, authenticated, forest_app;
COMMIT;
