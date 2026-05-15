import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch {
    return new PrismaClient();
  }
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { PrismaClient };
export * from '@prisma/client';
export { importFromSheet } from './importers/sheet-importer';
export type { SheetImportData } from './importers/sheet-importer';
export { importFromBank } from './importers/bank-importer';
export type { BankImportOptions, BankImportResult } from './importers/bank-importer';
export { createBankParser } from './importers/bank-parser';
export type { BankImportRow, BankParser, BankFileType } from './importers/bank-parser';
export { applyCategorizationRules } from './categorization';
