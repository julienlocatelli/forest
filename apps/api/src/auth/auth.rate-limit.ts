import { Inject, Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { digest } from './auth.tokens.js';
export class AuthRateLimitError extends HttpException {
  constructor(readonly retryAfter: number) {
    super('Too many authentication attempts.', 429);
  }
}
@Injectable()
export class AuthRateLimit {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async check(
    category: string,
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<void> {
    const now = Date.now();
    const start = new Date(Math.floor(now / windowMs) * windowMs);
    const end = new Date(start.getTime() + windowMs);
    const rows = await this.prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO public.auth_attempt (category, key, "windowStart", "expiresAt", count)
      VALUES (${category}, ${digest(key)}, ${start}, ${end}, 1)
      ON CONFLICT (category, key, "windowStart") DO UPDATE
      SET count = LEAST(auth_attempt.count + 1, ${limit + 1})
      RETURNING count`;
    if (rows[0].count > limit)
      throw new AuthRateLimitError(
        Math.max(1, Math.ceil((end.getTime() - now) / 1000)),
      );
  }
  async refresh(ip: string): Promise<void> {
    await this.check('refresh_ip', ip, 60, 60000);
  }
}
