import { describe, expect, it } from 'vitest';
import { StartupError, startupMessage } from './startup-error.js';

describe('safe startup diagnostics', () => {
  it('gives an actionable migration command for missing tables', () => {
    expect(startupMessage(new StartupError('DATABASE_SCHEMA'))).toContain(
      'migration:run',
    );
  });
  it('never relays raw driver errors or mutable error messages', () => {
    expect(
      startupMessage(new Error('postgresql://private:secret@host/db')),
    ).not.toContain('secret');
    const error = new StartupError('DATABASE_SCHEMA');
    error.message = 'private-secret';
    expect(startupMessage(error)).toContain('migration:run');
    expect(startupMessage(error)).not.toContain('private-secret');
  });
});
