import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import {
  Inject,
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  HttpException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { AuthConfig } from './auth.config.js';
import { AuthAudit } from './auth.audit.js';
import { AuthRateLimitError } from './auth.rate-limit.js';
import { AuthService } from './auth.service.js';
import type { User } from '../users/user.js';
import type { TokenPair } from './auth.tokens.js';

export type AuthRequest = Request & {
  authCorrelation?: string;
  authUser?: User;
};
export function authCookies(request: Request): Record<string, unknown> {
  return (request.cookies ?? {}) as Record<string, unknown>;
}
const accessCookie = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};
const refreshCookie = { ...accessCookie, path: '/auth' };
export function writeCookies(response: Response, pair: TokenPair): void {
  response.cookie('forest_access', pair.access, {
    ...accessCookie,
    expires: pair.accessExpiresAt,
  });
  response.cookie('forest_refresh', pair.refresh, {
    ...refreshCookie,
    expires: pair.expiresAt,
  });
}
export function clearCookies(response: Response): void {
  response.clearCookie('forest_access', accessCookie);
  response.clearCookie('forest_refresh', refreshCookie);
}
@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  constructor(@Inject(AuthAudit) private readonly audit: AuthAudit) {}
  catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<AuthRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const code = error instanceof HttpException ? error.getStatus() : 503;
    const message =
      code >= 500
        ? 'Authentication unavailable.'
        : code === 400
          ? 'Invalid login input.'
          : code === 401
            ? 'Authentication failed.'
            : code === 429
              ? 'Too many authentication attempts.'
              : 'Request forbidden.';
    if (code >= 500)
      this.audit.record(
        'operational_error',
        request.authCorrelation ?? randomUUID(),
      );
    if (error instanceof AuthRateLimitError)
      response.setHeader('Retry-After', error.retryAfter);
    response.setHeader('Cache-Control', 'no-store');
    // Preserve an existing session on bad credentials; failed refresh clears stale cookies.
    if (request.path === '/auth/refresh' && code === 401)
      clearCookies(response);
    response.status(code).json({ statusCode: code, message });
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.authUser = await this.auth.me(authCookies(request).forest_access);
    return true;
  }
}
// Registered by AuthModule so both production bootstrap and app.init() tests
// exercise identical cookie, CORS and CSRF controls.
@Injectable()
export class AuthMiddleware {
  private readonly parseCookies = cookieParser();
  constructor(@Inject(AuthConfig) private readonly config: AuthConfig) {}
  use(request: AuthRequest, response: Response, next: () => void): void {
    response.setHeader('Cache-Control', 'no-store');
    request.authCorrelation = randomUUID();
    const origin = request.get('Origin');
    if (origin && !this.config.value.origins.has(origin)) {
      response
        .status(403)
        .json({ statusCode: 403, message: 'Origin forbidden.' });
      return;
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.vary('Origin');
    }
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, X-Forest-Request',
      );
      response.status(204).end();
      return;
    }
    if (request.method === 'POST' && request.get('X-Forest-Request') !== '1') {
      response
        .status(403)
        .json({ statusCode: 403, message: 'Request forbidden.' });
      return;
    }
    this.parseCookies(request, response, next);
  }
}

// Body-parser errors occur before controller filters. Sanitize only /auth, and
// delegate unrelated routes to Nest's standard handler to preserve their contract.
@Catch()
export class AuthBoundaryFilter implements ExceptionFilter {
  constructor(
    @Inject(AuthExceptionFilter) private readonly auth: AuthExceptionFilter,
    @Inject(HttpAdapterHost) private readonly adapter: HttpAdapterHost,
  ) {}
  catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<Request>();
    if (request.path === '/auth' || request.path.startsWith('/auth/')) {
      this.auth.catch(error, host);
    } else {
      new BaseExceptionFilter(this.adapter.httpAdapter).catch(error, host);
    }
  }
}
