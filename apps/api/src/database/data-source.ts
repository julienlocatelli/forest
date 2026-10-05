import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database.config.js';
import { User } from '../users/user.entity.js';
import { CreateForestUsers1791158400000 } from './migrations/1791158400000-CreateForestUsers.js';
export function createMigrationDataSource(
  env: Record<string, string | undefined> = process.env,
): DataSource {
  return new DataSource({
    ...databaseOptions(env, 'migration'),
    entities: [User],
    migrations: [CreateForestUsers1791158400000],
  });
}
