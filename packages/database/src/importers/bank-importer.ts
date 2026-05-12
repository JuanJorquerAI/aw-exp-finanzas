import { PrismaClient, Prisma, TransactionSource } from '@prisma/client';
import { BankImportRow } from './bank-parser';
import { applyCategorizationRules } from '../categorization';

/** Normaliza RUT chileno: quita puntos, guiones y espacios; uppercase DV. */
function normalizeRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

export interface BankImportOptions {
  accountId: string;
  companyId: string;
  /** ID del BankStatement registrado antes de llamar a este importer. */
  bankStatementId?: string;
}

export interface BankImportResult {
  imported: number;
  skipped: number;
  pending: number;
}

export async function importFromBank(
  rows: BankImportRow[],
  options: BankImportOptions,
  prisma: PrismaClient,
): Promise<BankImportResult> {
  let imported = 0;
  let skipped = 0;
  let pending = 0;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const row of rows) {
      const exists = await tx.transaction.findFirst({
        where: { externalId: row.externalId },
        select: { id: true },
      });
      if (exists) {
        skipped++;
        continue;
      }

      let counterpartyId: string | null = null;
      if (row.counterRut || row.counterName) {
        const cp = await upsertBankCounterparty(
          tx,
          row.counterRut,
          row.counterName ?? row.description,
          row.counterBank,
        );
        counterpartyId = cp.id;
      }

      const hasMeta = !!counterpartyId;
      const status = hasMeta ? 'PAID' : 'PENDING';
      if (!hasMeta) pending++;

      const matchText = [row.description, row.counterName].filter(Boolean).join(' ');
      const categoryId = await applyCategorizationRules(matchText, tx);

      const newTx = await tx.transaction.create({
        data: {
          type: row.direction === 'CREDIT' ? 'INCOME' : 'EXPENSE',
          status,
          source: TransactionSource.BANK_CSV,
          amount: row.amount,
          amountCLP: row.amount,
          currency: 'CLP',
          date: row.date,
          description: row.description,
          comment: row.comment ?? null,
          externalId: row.externalId,
          companyId: options.companyId,
          accountId: options.accountId,
          counterpartyId,
          categoryId,
          bankStatementId: options.bankStatementId ?? null,
        },
      });

      await tx.transactionAllocation.create({
        data: {
          transactionId: newTx.id,
          companyId: options.companyId,
          percentage: 100,
          amountCLP: row.amount,
        },
      });

      imported++;
    }
  });

  console.log(
    `✅ Import banco completado: ${imported} importadas, ${skipped} duplicadas, ${pending} pendientes revisión`,
  );

  return { imported, skipped, pending };
}

async function upsertBankCounterparty(
  tx: Prisma.TransactionClient,
  rut: string | undefined,
  name: string,
  bankName?: string,
) {
  const notes = bankName ? `Banco: ${bankName}` : null;

  if (rut) {
    const normalizedRut = normalizeRut(rut);
    return tx.counterparty.upsert({
      where: { rut: normalizedRut },
      update: { name },
      create: { type: 'OTHER', name, rut: normalizedRut, notes },
    });
  }

  const existing = await tx.counterparty.findFirst({ where: { name } });
  if (existing) return existing;

  return tx.counterparty.create({ data: { type: 'OTHER', name, notes } });
}
