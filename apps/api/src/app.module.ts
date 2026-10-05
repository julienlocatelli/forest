import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { User } from './users/user.entity.js';
import { UsersModule } from './users/user.module.js';

const dbUsername = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

if (!dbUsername || !dbPassword || !dbName) {
  throw new Error('Database credentials are not set in environment variables.');
}

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: dbUsername,
      password: dbPassword,
      database: dbName,
      entities: [User],
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'dev',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
