import { APP_FILTER } from '@nestjs/core';
import {
  Module,
  type NestModule,
  type MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthConfig } from './auth.config.js';
import { PasswordService } from './password.service.js';
import { AuthRateLimit } from './auth.rate-limit.js';
import { AuthAudit } from './auth.audit.js';
import {
  AuthBoundaryFilter,
  AuthMiddleware,
  AuthExceptionFilter,
  SessionGuard,
} from './auth.http.js';
@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthConfig,
    PasswordService,
    AuthRateLimit,
    AuthAudit,
    AuthBoundaryFilter,
    AuthMiddleware,
    AuthExceptionFilter,
    SessionGuard,
    { provide: APP_FILTER, useClass: AuthBoundaryFilter },
  ],
  exports: [SessionGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'auth/{*path}', method: RequestMethod.ALL });
  }
}
