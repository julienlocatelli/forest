import {
  Injectable,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { databaseOptions } from './database.config.js';

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
      throw new Error(
        'Database connection failed. Check credentials, TLS and connectivity.',
      );
    }
  }
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
