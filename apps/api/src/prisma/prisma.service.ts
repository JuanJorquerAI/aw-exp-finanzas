import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@aw-finanzas/database';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

function buildClientArgs(): ConstructorParameters<typeof PrismaClient>[0] {
  if (!process.env.DATABASE_URL) return {} as never;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return { adapter: new PrismaNeon(pool) };
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
    if (!process.env.DATABASE_URL) return;
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
