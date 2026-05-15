import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/edge';
import { neon } from '@neondatabase/serverless';
import { PrismaNeonHTTP } from '@prisma/adapter-neon';

function buildClientArgs(): ConstructorParameters<typeof PrismaClient>[0] {
  if (!process.env.DATABASE_URL) {
    console.error('[prisma] No DATABASE_URL');
    return {} as never;
  }
  const sql = neon(process.env.DATABASE_URL);
  const adapter = new PrismaNeonHTTP(sql);
  console.error(
    '[prisma] adapter created:',
    typeof adapter,
    Object.keys(adapter),
  );
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
