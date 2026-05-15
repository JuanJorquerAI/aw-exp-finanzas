import 'reflect-metadata';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const server = express();
let initialized = false;

async function initApp() {
  if (initialized) return;
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
  });
  app.enableCors({
    origin: [
      process.env.WEB_URL ?? 'https://aw-finanzas-web.vercel.app',
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
  await app.init();
  initialized = true;
}

let initError: Error | null = null;

module.exports = async (req: express.Request, res: express.Response) => {
  if (!initialized && !initError) {
    try {
      await initApp();
    } catch (e) {
      initError = e as Error;
    }
  }
  if (initError) {
    res
      .status(503)
      .json({ status: 'error', message: 'DATABASE_URL not configured' });
    return;
  }
  server(req, res);
};
