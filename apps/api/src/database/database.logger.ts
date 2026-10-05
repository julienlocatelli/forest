import type { Logger } from 'typeorm';
// Driver messages, SQL and parameters may contain secrets or personal data.
export const databaseLogger: Logger = {
  logQuery() {},
  logQueryError() {
    console.error('Database query failed.');
  },
  logQuerySlow() {
    console.warn('Database query exceeded its latency threshold.');
  },
  logSchemaBuild() {},
  logMigration() {},
  log(level) {
    if (level === 'warn') console.warn('Database warning.');
  },
};
