import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
