import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { vi } from 'vitest';
import { digest } from '../src/auth/auth.tokens.js';
const { AppModule } = await import(
  new URL('../dist/app.module.js', import.meta.url).href
);
const { PrismaService } = await import(
  new URL('../dist/database/prisma.service.js', import.meta.url).href
);
const { AuthService } = await import(
  new URL('../dist/auth/auth.service.js', import.meta.url).href
);
const { AuthRateLimit } = await import(
  new URL('../dist/auth/auth.rate-limit.js', import.meta.url).href
);
const { AuthConfig } = await import(
  new URL('../dist/auth/auth.config.js', import.meta.url).href
);

describe('local authentication persistence and transactions', () => {
  const email = `auth-${randomUUID()}@example.com`;
  const password = 'Synthetic-auth-password-123';
  const config = {
    value: { email, password, origins: new Set(['http://localhost:3000']) },
  };
  const ownedRateKeys = new Set<string>([
    email,
    '::ffff:127.0.0.1',
    '127.0.0.1',
    '::1',
  ]);
  let app: INestApplication;
  let prisma: InstanceType<typeof PrismaService>;
  let id: number;
  async function open(selected = config) {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthConfig)
      .useValue(selected)
      .compile();
    const instance = module.createNestApplication({ logger: false });
    try {
      await instance.init();
      return instance;
    } catch (error) {
      await instance.close();
      throw error;
    }
  }
  function cookies(result: { headers: Record<string, unknown> }): string[] {
    return (result.headers['set-cookie'] as string[]).map(
      (s) => s.split(';')[0],
    );
  }
  function post(route: string, selected: string[] = []) {
    return request(app.getHttpServer())
      .post(route)
      .set('X-Forest-Request', '1')
      .set('Cookie', selected);
  }
  async function login() {
    return cookies(
      await post('/auth/login').send({ email, password }).expect(200),
    );
  }
  beforeAll(async () => {
    app = await open();
    prisma = app.get(PrismaService);
    id = (await prisma.authIdentity.findUniqueOrThrow({ where: { email } }))
      .userId;
  });
  beforeEach(async () => {
    await prisma.authAttempt.deleteMany({
      where: { key: { in: Array.from(ownedRateKeys, digest) } },
    });
  });
  afterAll(async () => {
    if (!app) return;
    try {
      await prisma.authAttempt.deleteMany({
        where: { key: { in: Array.from(ownedRateKeys, digest) } },
      });
      await prisma.user.deleteMany({ where: { identity: { email } } });
    } finally {
      await app.close();
    }
  });
  it('creates once and preserves the account across changed configuration and concurrent startup', async () => {
    const identity = await prisma.authIdentity.findUniqueOrThrow({
      where: { email },
    });
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    const other = await open({
      value: { ...config.value, password: 'Changed-synthetic-password' },
    });
    try {
      expect(await prisma.authIdentity.count({ where: { email } })).toBe(1);
      expect(
        (await prisma.authIdentity.findUniqueOrThrow({ where: { email } }))
          .passwordHash,
      ).toBe(identity.passwordHash);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id } })).isActive,
      ).toBe(false);
    } finally {
      await other.close();
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
    const concurrentEmail = `concurrent-${randomUUID()}@example.com`;
    const concurrentConfig = {
      value: { ...config.value, email: concurrentEmail },
    };
    const instances = await Promise.all([
      open(concurrentConfig),
      open(concurrentConfig),
    ]);
    try {
      expect(
        await prisma.authIdentity.count({ where: { email: concurrentEmail } }),
      ).toBe(1);
      expect(
        await prisma.user.count({
          where: { identity: { email: concurrentEmail } },
        }),
      ).toBe(1);
    } finally {
      await Promise.all(instances.map((instance) => instance.close()));
      await prisma.user.deleteMany({
        where: { identity: { email: concurrentEmail } },
      });
    }
  });
  it('rolls back a profile when its nested identity cannot be created', async () => {
    const firstName = `rollback-${randomUUID()}`;
    await expect(
      prisma.user.create({
        data: {
          firstName,
          lastName: '',
          identity: { create: { email, passwordHash: 'unused' } },
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(await prisma.user.count({ where: { firstName } })).toBe(0);
  });
  it('returns identical generic refusals and logs only allow-listed facts', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      const unknown = `unknown-${randomUUID()}@example.com`;
      ownedRateKeys.add(unknown);
      const a = await post('/auth/login')
        .send({ email: unknown, password })
        .expect(401);
      const b = await post('/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
      expect(a.body).toEqual(b.body);
      expect(a.headers['set-cookie']).toBeUndefined();
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      const c = await post('/auth/login').send({ email, password }).expect(401);
      expect(c.body).toEqual(a.body);
      expect(spy.mock.calls.flat().join(' ')).not.toContain(password);
      expect(spy.mock.calls.flat().join(' ')).not.toContain(email);
      expect(
        spy.mock.calls.map(([entry]) => JSON.parse(String(entry)).outcome),
      ).toEqual(['unknown_identity', 'wrong_password', 'inactive_user']);
    } finally {
      spy.mockRestore();
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
  });
  it('persists sessions across restart, rotates tokens and revokes replay', async () => {
    const initial = await login();
    const access = initial[0].split('=')[1],
      refresh = initial[1].split('=')[1];
    const stored = await prisma.authSession.findUniqueOrThrow({
      where: { accessHash: digest(access) },
    });
    expect(stored.accessHash).not.toBe(access);
    expect(
      await prisma.authRefreshToken.findUnique({
        where: { hash: digest(refresh) },
      }),
    ).not.toBeNull();
    await app.close();
    app = await open();
    prisma = app.get(PrismaService);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', initial)
      .expect(200);
    expect(me.body).toEqual({
      id,
      firstName: '',
      lastName: '',
      isActive: true,
    });
    const renewed = cookies(await post('/auth/refresh', initial).expect(200));
    expect(renewed).not.toEqual(initial);
    expect(
      (await prisma.authSession.findUniqueOrThrow({ where: { id: stored.id } }))
        .expiresAt,
    ).toEqual(stored.expiresAt);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', initial)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', renewed)
      .expect(200);
    await post('/auth/refresh', initial).expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', renewed)
      .expect(401);
  });
  it('serializes concurrent refreshes and leaves no usable session after replay', async () => {
    const initial = await login();
    const results = await Promise.all([
      post('/auth/refresh', initial),
      post('/auth/refresh', initial),
    ]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([
      200, 401,
    ]);
    const winner = results.find((r) => r.status === 200)!;
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies(winner))
      .expect(401);
  });
  it('enforces expiry, account state, and idempotent logout', async () => {
    let selected = await login();
    const session = await prisma.authSession.findUniqueOrThrow({
      where: { accessHash: digest(selected[0].split('=')[1]) },
    });
    await prisma.authSession.update({
      where: { id: session.id },
      data: { accessExpiresAt: new Date(0) },
    });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', selected)
      .expect(401);
    selected = cookies(await post('/auth/refresh', selected).expect(200));
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', selected)
      .expect(401);
    await post('/auth/refresh', selected).expect(401);
    await prisma.user.update({ where: { id }, data: { isActive: true } });
    selected = await login();
    const loggedOut = await post('/auth/logout', selected).expect(204);
    expect(loggedOut.headers['set-cookie']).toHaveLength(2);
    await post('/auth/logout', selected).expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', selected)
      .expect(401);
    await post('/auth/refresh', selected).expect(401);
    selected = await login();
    await prisma.authSession.updateMany({
      where: { accessHash: digest(selected[0].split('=')[1]) },
      data: { expiresAt: new Date(0) },
    });
    await post('/auth/refresh', selected).expect(401);
    await app.get(AuthService).cleanup();
    expect(
      await prisma.authSession.count({
        where: { accessHash: digest(selected[0].split('=')[1]) },
      }),
    ).toBe(0);
  });
  it('shares atomic limits across processes and does not trust forwarded IP headers', async () => {
    const key = `limit-${randomUUID()}`;
    ownedRateKeys.add(key);
    const other = await open();
    try {
      const outcomes = await Promise.allSettled(
        Array.from({ length: 8 }, (_, i) =>
          (i % 2 ? other : app)
            .get(AuthRateLimit)
            .check('test_limit', key, 5, 300000),
        ),
      );
      expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(5);
      expect(outcomes.filter((r) => r.status === 'rejected')).toHaveLength(3);
      for (let i = 0; i < 5; i++)
        await post('/auth/login')
          .send({ email, password: 'wrong' })
          .expect(401);
      const limited = await post('/auth/login')
        .set('X-Forwarded-For', '203.0.113.1')
        .send({ email, password })
        .expect(429);
      expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    } finally {
      await other.close();
    }
  });
  it('invalidates sessions when the public users route removes their user', async () => {
    const selected = await login();
    await request(app.getHttpServer()).delete(`/users/${id}`).expect(200);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', selected)
      .expect(401);
    await post('/auth/refresh', selected).expect(401);
    expect(await prisma.authIdentity.count({ where: { email } })).toBe(0);
  });
});
