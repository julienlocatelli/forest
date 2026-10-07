import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { AuthConfig } from './auth.config.js';
import { PasswordService } from './password.service.js';
import { AuthAudit } from './auth.audit.js';
import { StartupError } from '../startup-error.js';
import {
  digest,
  tokenPair,
  validToken,
  type TokenPair,
} from './auth.tokens.js';

export function unauthorized(): UnauthorizedException {
  return new UnauthorizedException('Authentication failed.');
}
@Injectable()
export class AuthService implements OnApplicationBootstrap, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private cleaning = false;
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthConfig) private readonly config: AuthConfig,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(AuthAudit) private readonly audit: AuthAudit,
  ) {}
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.passwords.initialize();
      await this.provision();
      await this.cleanup();
      this.timer = setInterval(() => {
        void this.cleanup().catch(() =>
          this.audit.record('operational_error', randomUUID()),
        );
      }, 3600000);
      this.timer.unref();
    } catch {
      throw new StartupError('AUTH_PROVISION');
    }
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
  async provision(): Promise<void> {
    const { email, password } = this.config.value;
    if (await this.prisma.authIdentity.findUnique({ where: { email } })) return;
    const passwordHash = await this.passwords.hash(password);
    try {
      // A nested create is atomic; a competing unique email rolls back its profile too.
      await this.prisma.user.create({
        data: {
          firstName: '',
          lastName: '',
          isActive: true,
          identity: { create: { email, passwordHash } },
        },
      });
    } catch (error) {
      if (
        (error as { code?: string }).code !== 'P2002' ||
        !(await this.prisma.authIdentity.findUnique({ where: { email } }))
      )
        throw error;
    }
  }
  async cleanup(): Promise<void> {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      const now = new Date();
      await this.prisma.authSession.deleteMany({
        where: { expiresAt: { lte: now } },
      });
      await this.prisma.authAttempt.deleteMany({
        where: { expiresAt: { lte: now } },
      });
    } finally {
      this.cleaning = false;
    }
  }
  async login(
    email: string,
    password: string,
    correlation: string,
  ): Promise<TokenPair> {
    const identity = await this.prisma.authIdentity.findUnique({
      where: { email },
      include: { user: true },
    });
    const matches = await this.passwords.verify(
      password,
      identity?.passwordHash,
    );
    if (!identity || !matches || !identity.user.isActive) {
      this.audit.record(
        !identity
          ? 'unknown_identity'
          : !matches
            ? 'wrong_password'
            : 'inactive_user',
        correlation,
        identity?.userId,
      );
      throw unauthorized();
    }
    const pair = tokenPair();
    await this.prisma.authSession.create({
      data: {
        id: randomUUID(),
        userId: identity.userId,
        accessHash: digest(pair.access),
        accessExpiresAt: pair.accessExpiresAt,
        expiresAt: pair.expiresAt,
        refreshTokens: { create: { hash: digest(pair.refresh) } },
      },
    });
    this.audit.record('success', correlation, identity.userId);
    return pair;
  }
  async refresh(raw: unknown, correlation: string): Promise<TokenPair> {
    if (!validToken(raw)) throw unauthorized();
    const hash = digest(raw);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const token = await tx.authRefreshToken.findUnique({ where: { hash } });
        if (!token) return { outcome: 'invalid' as const };
        // Refresh and logout share the same row lock. Re-read after the lock: the token
        // may have been consumed while this transaction was waiting.
        await tx.$queryRaw`SELECT id FROM public.auth_session WHERE id = ${token.sessionId}::uuid FOR UPDATE`;
        const current = await tx.authRefreshToken.findUnique({
          where: { hash },
        });
        const session = await tx.authSession.findUnique({
          where: { id: token.sessionId },
          include: { user: true },
        });
        if (!current || !session) return { outcome: 'invalid' as const };
        if (current.consumedAt) {
          await tx.authSession.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
          });
          return { outcome: 'replay' as const, userId: session.userId };
        }
        const now = new Date();
        if (
          session.revokedAt ||
          session.expiresAt <= now ||
          !session.user.isActive
        )
          return { outcome: 'invalid' as const };
        const pair = tokenPair(session.expiresAt);
        await tx.authRefreshToken.update({
          where: { hash },
          data: { consumedAt: now },
        });
        await tx.authRefreshToken.create({
          data: { hash: digest(pair.refresh), sessionId: session.id },
        });
        await tx.authSession.update({
          where: { id: session.id },
          data: {
            accessHash: digest(pair.access),
            accessExpiresAt: pair.accessExpiresAt,
          },
        });
        return { outcome: 'success' as const, pair };
      },
      { maxWait: 5000, timeout: 10000 },
    );
    // Throw outside the transaction so replay revocation is committed.
    if (result.outcome !== 'success') {
      if (result.outcome === 'replay')
        this.audit.record('replay', correlation, result.userId);
      throw unauthorized();
    }
    return result.pair;
  }
  async logout(access: unknown, refresh: unknown): Promise<void> {
    const clauses = [];
    if (validToken(access)) clauses.push({ accessHash: digest(access) });
    if (validToken(refresh))
      clauses.push({ refreshTokens: { some: { hash: digest(refresh) } } });
    if (!clauses.length) return;
    // UPDATE takes the same row lock as refresh; whichever runs last observes revocation.
    await this.prisma.authSession.updateMany({
      where: { OR: clauses },
      data: { revokedAt: new Date() },
    });
  }
  async me(raw: unknown) {
    if (!validToken(raw)) throw unauthorized();
    const now = new Date();
    const session = await this.prisma.authSession.findUnique({
      where: { accessHash: digest(raw) },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, isActive: true },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.accessExpiresAt <= now ||
      session.expiresAt <= now ||
      !session.user.isActive
    )
      throw unauthorized();
    return session.user;
  }
}
