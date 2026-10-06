import { defineConfig } from 'prisma/config';
// Network commands are invoked only by the validated migration wrapper.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url:
      process.env.FOREST_PRISMA_MIGRATION_URL ??
      'postgresql://offline:offline@localhost:5432/offline',
  },
});
