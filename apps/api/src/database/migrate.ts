import { createMigrationDataSource } from './data-source.js';
async function migrate() {
  const command = process.argv[2];
  if (!['run', 'show'].includes(command))
    throw new Error('Invalid migration command.');
  const source = createMigrationDataSource();
  try {
    await source.initialize();
    if (command === 'run') {
      const applied = await source.runMigrations({ transaction: 'all' });
      console.log(`Applied ${applied.length} migration(s).`);
    } else {
      console.log(
        (await source.showMigrations())
          ? 'Pending migrations exist.'
          : 'No pending migrations.',
      );
    }
  } finally {
    if (source.isInitialized) await source.destroy();
  }
}
try {
  await migrate();
} catch {
  console.error(
    'Database migration failed. Check credentials, TLS, roles and schema conflicts.',
  );
  process.exitCode = 1;
}
