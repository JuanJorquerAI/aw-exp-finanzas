import 'reflect-metadata';
import * as express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../apps/api/src/app.module';
import type { Request, Response } from 'express';

const server = express();
let initialized = false;

async function bootstrap() {
  if (initialized) return;
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.init();
  initialized = true;
}

export default async function handler(req: Request, res: Response) {
  await bootstrap();
  server(req, res);
}
