import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@aw-finanzas/database';

function buildClientArgs(): ConstructorParameters<typeof PrismaClient>[0] {
  if (!process.env.DATABASE_URL) return {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool, neonConfig } = require('@neondatabase/serverless');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require('@prisma/adapter-neon');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    neonConfig.webSocketConstructor = require('ws');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return { adapter: new PrismaNeon(pool) };
  } catch {
    return {};
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super(buildClientArgs());
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (e) {
      console.error('DB connection failed:', e);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
