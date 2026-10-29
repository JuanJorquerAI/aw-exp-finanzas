import { PrismaClient, Prisma, TransactionSource } from "@prisma/client";
import { applyCategorizationRules } from "../categorization";
import {
  canonicalRut,
  createOccurrenceCounter,
  expenseKey,
  invoiceKey,
  MonthRange,
  monthRange,
  normalizeFolio,
  normalizeRut,
  opportunityKey,
} from "./sheet-import-keys";

export interface SheetImportData {
  month: string;
  payments: Payment[];
  invoices: Invoice[];
  visa: VisaItem[];
  opportunities: OpportunityImport[];
  exchangeRate: { USD_CLP: number };
}

interface Payment {
  item: string;
  amount: number;
  paid: boolean;
  comment: string;
  company: string;
}

interface Invoice {
  rut: string;
  number: string;
  type: "AFECTA" | "EXENTA";
  counterparty: string;
  service: string;
  net: number;
  iva: number;
  total: number;
  sent: boolean;
  paidAt: string | null;
}

interface VisaItem {
  item: string;
  amountCLP: number | null;
  amountUSD: number | null;
}

interface OpportunityImport {
  name: string;
  amount: number;
  company: string;
}

// `type` y no `interface`: el resultado se guarda tal cual como JSON en audit_logs.
export type SheetImportCounts = {
  payments: number;
  invoices: number;
  visa: number;
  opportunities: number;
};

// Los conteos de primer nivel son registros creados; `skipped` son líneas
// del sheet que ya estaban en la base (misma clave natural) y no se repitieron.
export type SheetImportResult = SheetImportCounts & {
  skipped: SheetImportCounts;
};

interface IdRow {
  id: string;
}

interface ImportContext {
  readonly tx: Prisma.TransactionClient;
  readonly companies: Readonly<Record<string, IdRow>>;
  readonly categories: Readonly<Record<string, IdRow>>;
  readonly range: MonthRange;
  readonly occurrence: (key: string) => number;
}

interface StepResult {
  readonly created: number;
  readonly skipped: number;
}

const ITEM_TO_CATEGORY: Record<string, string> = {
  "IVA + PPM": "IVA + PPM",
  F29: "F29",
  PPM: "IVA + PPM",
  "Pagos previsionales": "Pagos previsionales",
  "Sueldo Damian": "Sueldo developers",
  "Sueldo Juan": "Sueldo socios",
  "Bryan Cartagena": "Sueldo developers",
  "Luis Silva": "Sueldo developers",
  "Luis Farías": "Honorarios externos",
  "Eduardo Ricci": "Honorarios externos",
  "Cuota Fogape": "Cuota Fogape",
  "Préstamo BCI Celulares": "Préstamo BCI",
  Visa: "Tarjeta Visa",
  "Mails de AW": "Mails corporativos",
  Canva: "Canva",
  "Google Workspace Maxiclima": "Google Workspace",
  ChatGPT: "ChatGPT",
  Claude: "Claude",
  Notion: "Notion",
};

async function resolveCategoryId(
  ctx: ImportContext,
  item: string,
): Promise<string | null> {
  const staticName = ITEM_TO_CATEGORY[item];
  if (staticName && ctx.categories[staticName]) {
    return ctx.categories[staticName].id;
  }
  return applyCategorizationRules(item, ctx.tx);
}

export async function importFromSheet(
  data: SheetImportData,
  prisma: PrismaClient,
): Promise<SheetImportResult> {
  const range = monthRange(data.month);
  const companies = await prisma.company.findMany();
  const categories = await prisma.category.findMany();
  const awCompany = companies.find((c) => c.shortCode === "AW");
  if (!awCompany)
    throw new Error("Empresa AW no encontrada — ejecutar seed primero");

  const result = await prisma.$transaction(async (tx) => {
    const ctx: ImportContext = {
      tx,
      companies: Object.fromEntries(companies.map((c) => [c.shortCode, c])),
      categories: Object.fromEntries(categories.map((c) => [c.name, c])),
      range,
      occurrence: createOccurrenceCounter(),
    };
    const payments = await importPayments(ctx, data.payments);
    const invoices = await importInvoices(ctx, data.invoices, awCompany.id);
    const visa = await importVisa(
      ctx,
      data.visa,
      data.exchangeRate,
      awCompany.id,
    );
    const opportunities = await importOpportunities(ctx, data.opportunities);
    return { payments, invoices, visa, opportunities };
  });

  const created: SheetImportCounts = {
    payments: result.payments.created,
    invoices: result.invoices.created,
    visa: result.visa.created,
    opportunities: result.opportunities.created,
  };
  const skipped: SheetImportCounts = {
    payments: result.payments.skipped,
    invoices: result.invoices.skipped,
    visa: result.visa.skipped,
    opportunities: result.opportunities.skipped,
  };

  console.log(
    `✅ Importación completada: ${created.payments} pagos, ${created.invoices} facturas, ${created.visa} visa, ${created.opportunities} oportunidades`,
  );
  const totalSkipped = Object.values(skipped).reduce((a, b) => a + b, 0);
  if (totalSkipped > 0) {
    console.log(
      `↩️  Ya existían (no se duplicaron): ${skipped.payments} pagos, ${skipped.invoices} facturas, ${skipped.visa} visa, ${skipped.opportunities} oportunidades`,
    );
  }

  return { ...created, skipped };
}

// ¿Esta línea del sheet ya está en la base? Compara la n-ésima aparición de la
// clave en el sheet con cuántos registros equivalentes existen.
async function alreadyImported(
  ctx: ImportContext,
  key: string,
  countExisting: () => Promise<number>,
): Promise<boolean> {
  const occurrence = ctx.occurrence(key);
  return occurrence <= (await countExisting());
}

function countExpenses(ctx: ImportContext, item: string): Promise<number> {
  return ctx.tx.transaction.count({
    where: {
      source: TransactionSource.SHEET_IMPORT,
      type: "EXPENSE",
      description: item,
      date: { gte: ctx.range.start, lte: ctx.range.end },
    },
  });
}

async function importPayments(
  ctx: ImportContext,
  payments: readonly Payment[],
): Promise<StepResult> {
  let created = 0;
  let skipped = 0;
  for (const p of payments) {
    const codes = p.company.split(",").map((c) => c.trim());
    const primary = ctx.companies[codes[0]];
    if (!primary) {
      console.warn(`⚠️  Empresa no encontrada: ${codes[0]}`);
      continue;
    }
    if (
      await alreadyImported(ctx, expenseKey(p.item), () =>
        countExpenses(ctx, p.item),
      )
    ) {
      skipped++;
      continue;
    }

    const categoryId = await resolveCategoryId(ctx, p.item);
    const transaction = await ctx.tx.transaction.create({
      data: {
        type: "EXPENSE",
        status: p.paid ? "PAID" : "PENDING",
        source: TransactionSource.SHEET_IMPORT,
        amount: p.amount,
        amountCLP: p.amount,
        currency: "CLP",
        date: ctx.range.end,
        description: p.item,
        comment: p.comment || null,
        companyId: primary.id,
        categoryId,
      },
    });

    const pct = 100 / codes.length;
    for (const code of codes) {
      const co = ctx.companies[code];
      if (!co) continue;
      await ctx.tx.transactionAllocation.create({
        data: {
          transactionId: transaction.id,
          companyId: co.id,
          percentage: pct,
          amountCLP: (p.amount * pct) / 100,
        },
      });
    }
    created++;
  }
  return { created, skipped };
}

function countInvoices(
  ctx: ImportContext,
  inv: Invoice,
  counterpartyIds: readonly string[],
  companyId: string,
): Promise<number> {
  const folio = normalizeFolio(inv.number);
  if (folio) {
    return ctx.tx.document.count({
      where: {
        companyId,
        type: inv.type,
        number: folio,
        counterpartyId: { in: [...counterpartyIds] },
      },
    });
  }
  return ctx.tx.document.count({
    where: {
      companyId,
      type: inv.type,
      OR: [
        { number: null },
        { number: { in: ["S/N", "s/n", "SN", "sn"] } },
      ],
      counterpartyId: { in: [...counterpartyIds] },
      totalAmount: inv.total,
      transactionLinks: {
        some: {
          transaction: {
            source: TransactionSource.SHEET_IMPORT,
            date: { gte: ctx.range.start, lte: ctx.range.end },
          },
        },
      },
    },
  });
}

async function importInvoices(
  ctx: ImportContext,
  invoices: readonly Invoice[],
  awCompanyId: string,
): Promise<StepResult> {
  let created = 0;
  let skipped = 0;
  for (const inv of invoices) {
    const cp = await resolveCounterparty(ctx.tx, inv.rut, inv.counterparty);
    if (
      await alreadyImported(ctx, invoiceKey(inv), () =>
        countInvoices(ctx, inv, cp.equivalentIds, awCompanyId),
      )
    ) {
      skipped++;
      continue;
    }

    const folio = normalizeFolio(inv.number);
    const doc = await ctx.tx.document.create({
      data: {
        companyId: awCompanyId,
        counterpartyId: cp.primary.id,
        type: inv.type,
        number: folio,
        netAmount: inv.net,
        ivaAmount: inv.iva,
        totalAmount: inv.total,
        currency: "CLP",
        description: inv.service || null,
        isSent: inv.sent,
      },
    });

    const incTx = await ctx.tx.transaction.create({
      data: {
        type: "INCOME",
        status: inv.paidAt ? "PAID" : "PENDING",
        source: TransactionSource.SHEET_IMPORT,
        amount: inv.total,
        amountCLP: inv.total,
        currency: "CLP",
        date: ctx.range.start,
        paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
        description: `Factura ${folio ?? "S/N"} - ${inv.counterparty}`,
        companyId: awCompanyId,
        counterpartyId: cp.primary.id,
      },
    });

    await ctx.tx.transactionDocument.create({
      data: { transactionId: incTx.id, documentId: doc.id },
    });
    await ctx.tx.transactionAllocation.create({
      data: {
        transactionId: incTx.id,
        companyId: awCompanyId,
        percentage: 100,
        amountCLP: inv.total,
      },
    });
    created++;
  }
  return { created, skipped };
}

async function importVisa(
  ctx: ImportContext,
  visa: readonly VisaItem[],
  exchangeRate: SheetImportData["exchangeRate"],
  awCompanyId: string,
): Promise<StepResult> {
  let created = 0;
  let skipped = 0;
  for (const v of visa) {
    if (
      await alreadyImported(ctx, expenseKey(v.item), () =>
        countExpenses(ctx, v.item),
      )
    ) {
      skipped++;
      continue;
    }

    const isUSD = v.amountUSD !== null;
    const amount = isUSD ? v.amountUSD! : v.amountCLP!;
    const amountCLP = isUSD
      ? v.amountUSD! * exchangeRate.USD_CLP
      : v.amountCLP!;
    const categoryId = await resolveCategoryId(ctx, v.item);

    const visaTx = await ctx.tx.transaction.create({
      data: {
        type: "EXPENSE",
        status: "PAID",
        source: TransactionSource.SHEET_IMPORT,
        amount,
        currency: isUSD ? "USD" : "CLP",
        exchangeRate: isUSD ? exchangeRate.USD_CLP : null,
        amountCLP,
        date: ctx.range.start,
        description: v.item,
        companyId: awCompanyId,
        categoryId,
      },
    });
    await ctx.tx.transactionAllocation.create({
      data: {
        transactionId: visaTx.id,
        companyId: awCompanyId,
        percentage: 100,
        amountCLP,
      },
    });
    created++;
  }
  return { created, skipped };
}

async function importOpportunities(
  ctx: ImportContext,
  opportunities: readonly OpportunityImport[],
): Promise<StepResult> {
  let created = 0;
  let skipped = 0;
  for (const o of opportunities) {
    const co = ctx.companies[o.company];
    if (!co) {
      console.warn(`⚠️  Empresa no encontrada para oportunidad: ${o.company}`);
      continue;
    }
    if (
      await alreadyImported(ctx, opportunityKey(o.name, o.company), () =>
        ctx.tx.opportunity.count({ where: { name: o.name, companyId: co.id } }),
      )
    ) {
      skipped++;
      continue;
    }

    await ctx.tx.opportunity.create({
      data: {
        name: o.name,
        estimatedAmount: o.amount,
        currency: "CLP",
        stage: "PROPOSAL_SENT",
        probability: 50,
        companyId: co.id,
      },
    });
    created++;
  }
  return { created, skipped };
}

export interface CounterpartyResolution {
  readonly primary: Prisma.CounterpartyGetPayload<{}>;
  readonly equivalentIds: readonly string[];
}

export async function resolveCounterparty(
  tx: Prisma.TransactionClient,
  rut: string | null | undefined,
  name: string,
): Promise<CounterpartyResolution> {
  const cleanRut = normalizeRut(rut);
  const targetCanonical = canonicalRut(rut);
  const cleanName = name.trim();

  if (targetCanonical) {
    // 1. Coincidencia directa por variantes habituales (rápida por índice)
    const variants = [rut?.trim(), cleanRut, targetCanonical].filter(
      (v): v is string => Boolean(v),
    );
    const directMatches = await tx.counterparty.findMany({
      where: { rut: { in: variants } },
      orderBy: { createdAt: "asc" },
    });

    // 2. Coincidencias en memoria por canonicalRut para cubrir formatos con espacios o no contemplados
    const allWithRut = await tx.counterparty.findMany({
      where: { rut: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    const memoryMatches = allWithRut.filter(
      (cp) => canonicalRut(cp.rut) === targetCanonical,
    );

    const map = new Map<string, Prisma.CounterpartyGetPayload<{}>>();
    for (const cp of [...directMatches, ...memoryMatches]) {
      map.set(cp.id, cp);
    }
    const matches = [...map.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    if (matches.length > 0) {
      return {
        primary: matches[0],
        equivalentIds: matches.map((m) => m.id),
      };
    }

    // 3. Si no existe por RUT ni variantes, crear nueva contraparte
    const created = await tx.counterparty.create({
      data: {
        type: "CUSTOMER",
        name: cleanName,
        rut: targetCanonical,
      },
    });
    return {
      primary: created,
      equivalentIds: [created.id],
    };
  }

  // Sin RUT: buscar por nombre
  const existing = await tx.counterparty.findMany({
    where: { name: cleanName },
    orderBy: { createdAt: "asc" },
  });
  if (existing.length > 0) {
    return {
      primary: existing[0],
      equivalentIds: existing.map((e) => e.id),
    };
  }

  const created = await tx.counterparty.create({
    data: { type: "CUSTOMER", name: cleanName },
  });
  return {
    primary: created,
    equivalentIds: [created.id],
  };
}
