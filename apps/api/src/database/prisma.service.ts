import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { databaseOptions } from './database.config.js';
import { StartupError } from '../startup-error.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: new PrismaPg(databaseOptions()), log: [] });
  }
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      // The pg adapter creates its pool lazily; readiness needs a real round trip.
      await this.$queryRaw`SELECT 1`;
    } catch {
      await this.$disconnect().catch(() => undefined);
      throw new StartupError('DATABASE_CONNECTION');
    }
    const [schema] = await this.$queryRaw<Array<{ ready: boolean }>>`
      SELECT to_regclass('public.auth_identity') IS NOT NULL
        AND to_regclass('public.auth_session') IS NOT NULL
        AND to_regclass('public.auth_refresh_token') IS NOT NULL
        AND to_regclass('public.auth_attempt') IS NOT NULL AS ready
    `;
    if (!schema.ready) {
      await this.$disconnect();
      throw new StartupError('DATABASE_SCHEMA');
    }
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
