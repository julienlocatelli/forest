import { describe, expect, it } from 'vitest';
import {
  authConfiguration,
  normalizeEmail,
  validPassword,
} from './auth.config.js';
describe('authentication boundary policies', () => {
  it('normalizes emails without changing provider-specific aliases', () => {
    expect(normalizeEmail(' Alice+Tag@Example.COM ')).toBe(
      'alice+tag@example.com',
    );
    for (const email of [
      'a..b@example.com',
      'a@-example.com',
      'a@example',
      'é@example.com',
      null,
      'a'.repeat(65) + '@example.com',
    ])
      expect(normalizeEmail(email)).toBeNull();
  });
  it('validates mandatory bootstrap configuration without exposing secrets', () => {
    const valid = {
      DEFAULT_USER_EMAIL: 'account@example.com',
      DEFAULT_USER_PASSWORD: 'Synthetic-password-123',
      AUTH_ALLOWED_ORIGINS: 'http://localhost:3000,https://app.example.com',
    };
    expect(authConfiguration(valid).origins.size).toBe(2);
    expect(() =>
      authConfiguration({ ...valid, DEFAULT_USER_PASSWORD: 'short' }),
    ).toThrow('Invalid default user configuration.');
    for (const origin of [
      '',
      '*',
      'http://example.com',
      'https://app.example.com/path',
      'https://user:secret@app.example.com',
    ])
      expect(() =>
        authConfiguration({ ...valid, AUTH_ALLOWED_ORIGINS: origin }),
      ).toThrow('Invalid authentication origins');
    expect(validPassword(' '.repeat(12), 12)).toBe(true);
    expect(validPassword('x'.repeat(129))).toBe(false);
  });
});
