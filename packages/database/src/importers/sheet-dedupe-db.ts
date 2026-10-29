import { Prisma, PrismaClient, TransactionSource } from "@prisma/client";
import {
  DedupeOpportunityRecord,
  DedupePlan,
  DedupeTransactionRecord,
  planSheetDedupe,
} from "./sheet-dedupe";
import { monthRange } from "./sheet-import-keys";

// Lectura y aplicación del plan de limpieza. La lectura no modifica nada;
// applyDedupePlan es lo único que borra y corre en una sola transacción.

type Db = PrismaClient | Prisma.TransactionClient;

export interface DedupeRecords {
  readonly transactions: readonly DedupeTransactionRecord[];
  readonly opportunities: readonly DedupeOpportunityRecord[];
}

export interface DedupeApplyResult {
  readonly transactions: number;
  readonly documents: number;
  readonly opportunities: number;
}

// Una copia cuyo updatedAt supera a createdAt por más de esto fue editada a mano
const TOUCH_THRESHOLD_MS = 1000;

const transactionInclude = {
  company: { select: { shortCode: true } },
  // Por nombre: el seed corrido dos veces dejó categorías repetidas con otro id
  category: { select: { name: true } },
  documents: {
    orderBy: { linkedAt: "asc" },
    include: {
      document: { include: { _count: { select: { transactionLinks: true } } } },
    },
  },
  _count: { select: { payments: true, notes: true } },
} satisfies Prisma.TransactionInclude;

type LoadedTransaction = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

const day = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");

// Misma clave natural que usa el importador: gastos por glosa dentro del mes,
// facturas por el documento que creó el import (tipo + folio + cliente).
function transactionGroupKey(t: LoadedTransaction): string {
  if (t.type === "EXPENSE") return `gasto|${t.description.trim()}`;
  const doc = t.documents[0]?.document;
  if (!doc) return `ingreso|${t.description.trim()}`;
  const folio = doc.number ?? `S/N|${doc.totalAmount.toString()}`;
  return `factura|${doc.type}|${folio}|${doc.counterpartyId ?? ""}`;
}

function toTransactionRecord(t: LoadedTransaction): DedupeTransactionRecord {
  return {
    id: t.id,
    groupKey: transactionGroupKey(t),
    label: t.description,
    status: t.status,
    amount: t.amount.toNumber(),
    companyCode: t.company.shortCode,
    createdAt: t.createdAt,
    touched: t.updatedAt.getTime() - t.createdAt.getTime() > TOUCH_THRESHOLD_MS,
    signature: [
      t.status,
      t.company.shortCode,
      t.category?.name ?? "",
      day(t.dueDate),
      day(t.paidAt),
      t.comment ?? "",
    ].join("|"),
    payments: t._count.payments,
    notes: t._count.notes,
    extraDocuments: Math.max(0, t.documents.length - 1),
    exclusiveDocumentIds: t.documents
      .filter((link) => link.document._count.transactionLinks === 1)
      .map((link) => link.documentId),
  };
}

export async function loadDedupeRecords(
  db: Db,
  month: string,
): Promise<DedupeRecords> {
  const range = monthRange(month);
  const transactions = await db.transaction.findMany({
    where: {
      source: TransactionSource.SHEET_IMPORT,
      date: { gte: range.start, lte: range.end },
    },
    include: transactionInclude,
    orderBy: { createdAt: "asc" },
  });
  // Solo oportunidades del mismo lote de importación del mes (en ventana
  // de creación de las transacciones del sheet) y sin campos manuales agregados.
  const opportunities =
    transactions.length === 0
      ? []
      : await db.opportunity.findMany({
          where: {
            createdAt: {
              gte: new Date(
                Math.min(...transactions.map((t) => t.createdAt.getTime())) -
                  120_000,
              ),
              lte: new Date(
                Math.max(...transactions.map((t) => t.createdAt.getTime())) +
                  120_000,
              ),
            },
            stage: "PROPOSAL_SENT",
            probability: 50,
            description: null,
            notes: null,
            counterpartyId: null,
            expectedCloseDate: null,
            actualCloseDate: null,
          },
          orderBy: { createdAt: "asc" },
        });
  return {
    transactions: transactions.map(toTransactionRecord),
    opportunities: opportunities.map((o) => ({
      id: o.id,
      groupKey: `oportunidad|${o.companyId}|${o.name.trim()}`,
      label: o.name,
      signature: [
        o.stage,
        o.estimatedAmount.toString(),
        o.probability,
        o.counterpartyId ?? "",
        o.description ?? "",
        o.notes ?? "",
        day(o.expectedCloseDate),
      ].join("|"),
      createdAt: o.createdAt,
    })),
  };
}

export async function buildDedupePlan(
  db: Db,
  month: string,
): Promise<DedupePlan> {
  const records = await loadDedupeRecords(db, month);
  return planSheetDedupe(records.transactions, records.opportunities);
}

export async function applyDedupePlan(
  prisma: PrismaClient,
  plan: DedupePlan,
  month: string,
): Promise<DedupeApplyResult> {
  const transactionIds = plan.deleteTransactions.map((t) => t.id);
  const opportunityIds = plan.deleteOpportunities.map((o) => o.id);
  return prisma.$transaction(async (tx) => {
    const transactions = await tx.transaction.deleteMany({
      where: { id: { in: transactionIds } },
    });
    // Solo documentos que quedaron sin ninguna transacción vinculada
    const documents = await tx.document.deleteMany({
      where: {
        id: { in: [...plan.deleteDocumentIds] },
        transactionLinks: { none: {} },
      },
    });
    const opportunities = await tx.opportunity.deleteMany({
      where: { id: { in: opportunityIds } },
    });
    const result: DedupeApplyResult = {
      transactions: transactions.count,
      documents: documents.count,
      opportunities: opportunities.count,
    };
    await tx.auditLog.create({
      data: {
        action: "DEDUPE_SHEET_IMPORT",
        resource: `sheet:${month}`,
        status: "SUCCESS",
        metadata: { ...result, transactionIds, opportunityIds },
      },
    });
    return result;
  });
}
