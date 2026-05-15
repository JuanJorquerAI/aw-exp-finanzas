import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@aw-finanzas/database';
import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

function buildClientArgs(): ConstructorParameters<typeof PrismaClient>[0] {
  if (!process.env.DATABASE_URL) return {} as never;
  const sql = neon(process.env.DATABASE_URL);
  return { adapter: new PrismaNeonHTTP(sql) };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super(buildClientArgs());
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
