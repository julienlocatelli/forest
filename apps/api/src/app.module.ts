import { DataSource } from 'typeorm';
import { databaseOptions } from './database/database.config.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { User } from './users/user.entity.js';
import { UsersModule } from './users/user.module.js';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...databaseOptions(),
        entities: [User],
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      dataSourceFactory: async (options) => {
        if (!options) throw new Error('Database configuration is missing.');
        const source = new DataSource(options);
        try {
          return await source.initialize();
        } catch {
          throw new Error(
            'Database connection failed. Check credentials, TLS and connectivity.',
          );
        }
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
