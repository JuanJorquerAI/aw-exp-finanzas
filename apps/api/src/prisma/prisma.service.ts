import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('[prisma] DATABASE_URL no configurado');

const isNeon = /neon\.tech|neondb|neon\.build/i.test(url);

// Runtime selects edge client for Neon (no native binary in Lambda) and
// standard client for local Postgres. Type uses the standard PrismaClient
// so service layer keeps full typing.
function loadClient(): typeof PrismaClient {
  if (isNeon) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaClient: EdgeClient } = require('@prisma/client/edge');
    return EdgeClient as unknown as typeof PrismaClient;
  }
  return PrismaClient;
}

function buildClientArgs(): ConstructorParameters<typeof PrismaClient>[0] {
  if (!isNeon) return {};
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { neon } = require('@neondatabase/serverless');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaNeonHTTP } = require('@prisma/adapter-neon');
  const sql = neon(url as string);
  const adapter = new PrismaNeonHTTP(sql);
  return { adapter } as ConstructorParameters<typeof PrismaClient>[0];
}

const RuntimePrismaClient = loadClient();

@Injectable()
export class PrismaService
  extends RuntimePrismaClient
  implements OnModuleDestroy
{
  constructor() {
    super(buildClientArgs());
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
