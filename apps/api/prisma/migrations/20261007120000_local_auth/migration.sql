BEGIN;
CREATE TABLE public.auth_identity (
 "userId" INTEGER PRIMARY KEY REFERENCES public."user"(id) ON DELETE CASCADE,
 email VARCHAR(254) NOT NULL UNIQUE,
 "passwordHash" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.auth_session (
 id UUID PRIMARY KEY,
 "userId" INTEGER NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
 "accessHash" CHAR(64) NOT NULL UNIQUE,
 "accessExpiresAt" TIMESTAMPTZ(3) NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "revokedAt" TIMESTAMPTZ(3)
);
CREATE INDEX auth_session_user_idx ON public.auth_session("userId");
CREATE INDEX auth_session_expiry_idx ON public.auth_session("expiresAt");
CREATE TABLE public.auth_refresh_token (
 hash CHAR(64) PRIMARY KEY,
 "sessionId" UUID NOT NULL REFERENCES public.auth_session(id) ON DELETE CASCADE,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "consumedAt" TIMESTAMPTZ(3)
);
CREATE INDEX auth_refresh_session_idx ON public.auth_refresh_token("sessionId");
CREATE TABLE public.auth_attempt (
 category VARCHAR(32) NOT NULL,
 key CHAR(64) NOT NULL,
 "windowStart" TIMESTAMPTZ(3) NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 count INTEGER NOT NULL CHECK (count > 0),
 PRIMARY KEY (category, key, "windowStart")
);
CREATE INDEX auth_attempt_expiry_idx ON public.auth_attempt("expiresAt");
ALTER TABLE public.auth_identity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_identity FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_identity TO forest_app;
CREATE POLICY forest_app_crud ON public.auth_identity FOR ALL TO forest_app USING (true) WITH CHECK (true);
ALTER TABLE public.auth_session ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_session FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_session TO forest_app;
CREATE POLICY forest_app_crud ON public.auth_session FOR ALL TO forest_app USING (true) WITH CHECK (true);
ALTER TABLE public.auth_refresh_token ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_refresh_token FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_refresh_token TO forest_app;
CREATE POLICY forest_app_crud ON public.auth_refresh_token FOR ALL TO forest_app USING (true) WITH CHECK (true);
ALTER TABLE public.auth_attempt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_attempt FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_attempt TO forest_app;
CREATE POLICY forest_app_crud ON public.auth_attempt FOR ALL TO forest_app USING (true) WITH CHECK (true);
COMMIT;
