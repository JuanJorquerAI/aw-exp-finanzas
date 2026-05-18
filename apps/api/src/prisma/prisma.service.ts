import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/edge';
import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

function buildClientArgs(): ConstructorParameters<typeof PrismaClient>[0] {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('[prisma] DATABASE_URL no configurado');
  const sql = neon(url);
  const adapter = new PrismaNeonHTTP(sql);
  return { adapter };
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
