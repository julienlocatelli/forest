const messages = {
  AUTH_CONFIG: 'Invalid default user configuration.',
  AUTH_ORIGINS: 'Invalid authentication origins configuration.',
  DATABASE_CONNECTION:
    'Database connection failed. Check credentials, TLS and connectivity.',
  DATABASE_SCHEMA:
    'Authentication tables missing. Run bun run build then bun run migration:run from apps/api before restarting.',
  AUTH_PROVISION:
    'Authentication startup failed. Check configuration, migrations and connectivity.',
} as const;

export class StartupError extends Error {
  constructor(readonly code: keyof typeof messages) {
    super(messages[code]);
  }
}

export function startupMessage(error: unknown): string {
  return error instanceof StartupError
    ? `Application startup failed [${error.code}]. ${messages[error.code]}`
    : 'Application startup failed. Check database and authentication configuration, migrations and connectivity.';
}
