import { Test } from '@nestjs/testing';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from './auth.module.js';
import { AuthConfig } from './auth.config.js';
import { PrismaService } from '../database/prisma.service.js';
import { AuthService, unauthorized } from './auth.service.js';
import { AuthRateLimit, AuthRateLimitError } from './auth.rate-limit.js';
import { tokenPair } from './auth.tokens.js';
import { AuthAudit } from './auth.audit.js';
describe('HTTP authentication security controls', () => {
  let app: INestApplication;
  const limits = { check: vi.fn(), refresh: vi.fn() };
  const auth = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  };
  const audit = { record: vi.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AuthModule] })
      .overrideProvider(AuthConfig)
      .useValue({ value: { origins: new Set(['http://localhost:3000']) } })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(AuthService)
      .useValue(auth)
      .overrideProvider(AuthRateLimit)
      .useValue(limits)
      .overrideProvider(AuthAudit)
      .useValue(audit)
      .compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('rejects untrusted origins and missing custom header before login', async () => {
    auth.login.mockClear();
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(403);
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'https://evil.example')
      .set('X-Forest-Request', '1')
      .send({})
      .expect(403);
    expect(auth.login).not.toHaveBeenCalled();
    const preflight = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:3000')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(preflight.headers['access-control-allow-credentials']).toBe('true');
  });
  it('validates input and emits protected cookies without exposing tokens', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forest-Request', '1')
      .send({ email: 'invalid', password: 'x' })
      .expect(400);
    const malformed = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forest-Request', '1')
      .send('private-invalid-json')
      .expect(400);
    expect(malformed.text).not.toContain('private-invalid-json');
    expect(malformed.headers['cache-control']).toBe('no-store');
    const pair = tokenPair();
    auth.login.mockResolvedValueOnce(pair);
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forest-Request', '1')
      .send({ email: ' User@Example.com ', password: 'sample' })
      .expect(200);
    expect(result.body).toEqual({ authenticated: true });
    expect(result.headers['cache-control']).toBe('no-store');
    const cookies = result.headers['set-cookie'] as unknown as string[];
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies)
      expect(cookie).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    expect(cookies[0]).toContain('Path=/;');
    expect(cookies[1]).toContain('Path=/auth;');
    expect(auth.login.mock.calls.at(-1)?.slice(0, 2)).toEqual([
      'user@example.com',
      'sample',
    ]);
  });
  it('returns safe operational errors, retry intervals and generic refusals', async () => {
    auth.login.mockRejectedValueOnce(new Error('driver-secret'));
    const input = { email: 'user@example.com', password: 'sample' };
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forest-Request', '1')
      .send(input)
      .expect(503);
    expect(result.text).not.toContain('driver-secret');
    expect(audit.record).toHaveBeenCalledWith(
      'operational_error',
      expect.any(String),
    );
    limits.check.mockRejectedValueOnce(new AuthRateLimitError(42));
    const limited = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Forest-Request', '1')
      .send(input)
      .expect(429);
    expect(limited.headers['retry-after']).toBe('42');
    auth.refresh.mockRejectedValueOnce(unauthorized());
    const refused = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Forest-Request', '1')
      .expect(401);
    expect(refused.body).toEqual({
      statusCode: 401,
      message: 'Authentication failed.',
    });
    expect(refused.headers['set-cookie']).toHaveLength(2);
  });
  it('preserves public user routes by limiting auth middleware to /auth', async () => {
    await request(app.getHttpServer()).post('/users').send({}).expect(404);
  });
});
