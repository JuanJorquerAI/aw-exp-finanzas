import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      process.env.WEB_URL ?? 'http://localhost:3000',
      'http://finanzas.local',
      /^http:\/\/localhost(:\d+)?$/,
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API corriendo en http://localhost:${port}`);
}

bootstrap();
