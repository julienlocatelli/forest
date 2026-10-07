import { createHash, randomBytes } from 'node:crypto';
export const ACCESS_MS = 15 * 60 * 1000;
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function validToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}
export function tokenPair(expiresAt = new Date(Date.now() + SESSION_MS)) {
  return {
    access: randomBytes(32).toString('base64url'),
    refresh: randomBytes(32).toString('base64url'),
    accessExpiresAt: new Date(
      Math.min(Date.now() + ACCESS_MS, expiresAt.getTime()),
    ),
    expiresAt,
  };
}
export type TokenPair = ReturnType<typeof tokenPair>;
