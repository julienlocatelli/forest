import { Injectable } from '@nestjs/common';
import { StartupError } from '../startup-error.js';

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[\x21-\x7e]+$/.test(email)) return null;
  const parts = email.split('@');
  if (
    parts.length !== 2 ||
    parts[0].length > 64 ||
    !parts[0] ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(parts[0]) ||
    parts[0].startsWith('.') ||
    parts[0].endsWith('.') ||
    parts[0].includes('..')
  )
    return null;
  const labels = parts[1].split('.');
  if (
    labels.length < 2 ||
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  )
    return null;
  return email;
}
export function validPassword(value: unknown, minimum = 1): value is string {
  return (
    typeof value === 'string' &&
    Array.from(value).length >= minimum &&
    Array.from(value).length <= 128
  );
}
export function authConfiguration(env: NodeJS.ProcessEnv) {
  const email = normalizeEmail(env.DEFAULT_USER_EMAIL);
  if (!email || !validPassword(env.DEFAULT_USER_PASSWORD, 12))
    throw new StartupError('AUTH_CONFIG');
  const origins = (env.AUTH_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim());
  if (
    !origins.length ||
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          origin !== url.origin ||
          !!url.username ||
          !!url.password ||
          (url.protocol !== 'https:' &&
            !(url.protocol === 'http:' && url.hostname === 'localhost'))
        );
      } catch {
        return true;
      }
    })
  )
    throw new StartupError('AUTH_ORIGINS');
  return {
    email,
    password: env.DEFAULT_USER_PASSWORD,
    origins: new Set(origins),
  };
}
@Injectable()
export class AuthConfig {
  readonly value = authConfiguration(process.env);
}
