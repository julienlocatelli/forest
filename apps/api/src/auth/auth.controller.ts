import {
  Inject,
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service.js';
import { normalizeEmail, validPassword } from './auth.config.js';
import { AuthRateLimit } from './auth.rate-limit.js';
import {
  AuthExceptionFilter,
  type AuthRequest,
  authCookies,
  writeCookies,
  clearCookies,
  SessionGuard,
} from './auth.http.js';

@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthRateLimit) private readonly limits: AuthRateLimit,
  ) {}
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() input: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Charge the IP even for malformed input, before inspecting any credentials.
    await this.limits.check('login_ip', request.ip ?? 'unknown', 20, 300000);
    const body = input as Record<string, unknown> | null;
    const email = normalizeEmail(body?.email);
    if (
      !request.is('application/json') ||
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !email ||
      !validPassword(body.password) ||
      Object.keys(body).some((key) => key !== 'email' && key !== 'password')
    )
      throw new BadRequestException('Invalid login input.');
    await this.limits.check('login_email', email, 5, 300000);
    writeCookies(
      response,
      await this.auth.login(email, body.password, request.authCorrelation!),
    );
    return { authenticated: true };
  }
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.limits.refresh(request.ip ?? 'unknown');
    writeCookies(
      response,
      await this.auth.refresh(
        authCookies(request).forest_refresh,
        request.authCorrelation!,
      ),
    );
    return { authenticated: true };
  }
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = authCookies(request);
    await this.auth.logout(cookies.forest_access, cookies.forest_refresh);
    clearCookies(response);
  }
  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() request: AuthRequest) {
    return request.authUser;
  }
}
