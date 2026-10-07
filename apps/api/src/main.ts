import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { startupMessage } from './startup-error.js';
async function bootstrap() {
  // Framework exception stacks can contain driver details. Never print them verbatim.
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    logger: {
      log() {},
      warn() {
        console.warn('Application warning.');
      },
      error() {
        console.error('Application operation failed.');
      },
    },
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
try {
  await bootstrap();
} catch (error) {
  console.error(startupMessage(error));
  process.exitCode = 1;
}
