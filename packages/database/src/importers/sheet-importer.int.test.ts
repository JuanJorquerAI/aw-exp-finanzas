import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { importFromSheet, SheetImportData } from "./sheet-importer";
import { applyDedupePlan, buildDedupePlan } from "./sheet-dedupe-db";

// Corre contra una base desechable: pnpm db:test-up && pnpm test:db
// Se niega a correr si TEST_DATABASE_URL no apunta a una base *_test.

const PACKAGE_ROOT = path.resolve(__dirname, "../..");
const MAY_SHEET = path.resolve(PACKAGE_ROOT, "../../data/sheet-mayo-2026.json");

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta TEST_DATABASE_URL (base desechable: pnpm db:test-up)",
    );
  }
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(
      `TEST_DATABASE_URL debe ser una base *_test (recibí "${name}")`,
    );
  }
  return url;
}

function loadMay(): SheetImportData {
  return JSON.parse(fs.readFileSync(MAY_SHEET, "utf-8")) as SheetImportData;
}

let prisma: PrismaClient;

async function counts(): Promise<Record<string, number>> {
  return {
    transactions: await prisma.transaction.count(),
    documents: await prisma.document.count(),
    allocations: await prisma.transactionAllocation.count(),
    links: await prisma.transactionDocument.count(),
    opportunities: await prisma.opportunity.count(),
    counterparties: await prisma.counterparty.count(),
  };
}

async function duplicatedInvoiceGroups(): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM (
      SELECT type, number, "counterpartyId" FROM documents
      GROUP BY 1, 2, 3 HAVING count(*) > 1
    ) d`;
  return Number(rows[0].n);
}

// Copia una transacción importada como lo hacía el importador antiguo al
// correr dos veces: transacción + documento + vínculo + asignación nuevos.
async function cloneImported(id: string): Promise<string> {
  const t = await prisma.transaction.findUniqueOrThrow({
    where: { id },
    include: { allocations: true, documents: { include: { document: true } } },
  });
  const copy = await prisma.transaction.create({
    data: {
      type: t.type,
      status: t.status,
      source: t.source,
      amount: t.amount,
      amountCLP: t.amountCLP,
      currency: t.currency,
      date: t.date,
      description: t.description,
      comment: t.comment,
      companyId: t.companyId,
      counterpartyId: t.counterpartyId,
      categoryId: t.categoryId,
      allocations: {
        create: t.allocations.map((a) => ({
          companyId: a.companyId,
          percentage: a.percentage,
          amountCLP: a.amountCLP,
        })),
      },
    },
  });
  for (const { document: d } of t.documents) {
    const doc = await prisma.document.create({
      data: {
        companyId: d.companyId,
        counterpartyId: d.counterpartyId,
        type: d.type,
        number: d.number,
        netAmount: d.netAmount,
        ivaAmount: d.ivaAmount,
        totalAmount: d.totalAmount,
        currency: d.currency,
        description: d.description,
        isSent: d.isSent,
      },
    });
    await prisma.transactionDocument.create({
      data: { transactionId: copy.id, documentId: doc.id },
    });
  }
  return copy.id;
}

// Envejece copias y las deja intactas (updatedAt = createdAt)
async function age(ids: string[], minutesAgo: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE transactions
    SET "createdAt" = now() - make_interval(mins => ${minutesAgo}::int),
        "updatedAt" = now() - make_interval(mins => ${minutesAgo}::int)
    WHERE id IN (${Prisma.join(ids)})`;
}

beforeAll(() => {
  const url = testDatabaseUrl();
  execSync("pnpm exec prisma migrate deploy", {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  prisma = new PrismaClient({ datasources: { db: { url } } });
});

afterAll(async () => {
  await prisma?.$disconnect();
});

beforeEach(async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  await prisma.company.createMany({
    data: [
      { name: "AplicacionesWeb", shortCode: "AW" },
      { name: "Expande PRO", shortCode: "EXPRO" },
    ],
  });
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("importFromSheet idempotente", () => {
  it("importar mayo dos veces no duplica facturas ni gastos", async () => {
    const may = loadMay();
    const first = await importFromSheet(may, prisma);
    const afterFirst = await counts();

    const second = await importFromSheet(may, prisma);

    expect(await counts()).toEqual(afterFirst);
    expect(first.invoices).toBe(may.invoices.length);
    expect(second).toEqual({
      payments: 0,
      invoices: 0,
      visa: 0,
      opportunities: 0,
      skipped: {
        payments: first.payments,
        invoices: first.invoices,
        visa: first.visa,
        opportunities: first.opportunities,
      },
    });
    expect(afterFirst.documents).toBe(may.invoices.length);
    expect(await duplicatedInvoiceGroups()).toBe(0);
  });

  it("dos líneas iguales en un mismo sheet crean dos gastos, una sola vez", async () => {
    const line = {
      item: "Hosting",
      amount: 1000,
      paid: false,
      comment: "",
      company: "AW",
    };
    const sheet: SheetImportData = {
      month: "2026-07",
      payments: [line, line],
      invoices: [],
      visa: [],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };
    await importFromSheet(sheet, prisma);
    await importFromSheet(sheet, prisma);
    expect(
      await prisma.transaction.count({ where: { description: "Hosting" } }),
    ).toBe(2);
  });

  it("sin categoría fija usa las reglas de categorización como respaldo", async () => {
    const hosting = await prisma.category.create({
      data: { name: "Hosting", type: "EXPENSE" },
    });
    await prisma.categorizationRule.create({
      data: { pattern: "hostinger", categoryId: hosting.id },
    });
    const sheet: SheetImportData = {
      month: "2026-07",
      payments: [
        {
          item: "Hostinger VPS",
          amount: 1000,
          paid: true,
          comment: "",
          company: "AW",
        },
      ],
      invoices: [],
      visa: [{ item: "HOSTINGER mail", amountCLP: 500, amountUSD: null }],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };
    await importFromSheet(sheet, prisma);
    const second = await importFromSheet(sheet, prisma);

    const rows = await prisma.transaction.findMany({
      where: { type: "EXPENSE" },
    });
    expect(rows.map((t) => t.categoryId)).toEqual([hosting.id, hosting.id]);
    expect(second.skipped).toMatchObject({ payments: 1, visa: 1 });
  });

  it("documento manual o de otra empresa con mismo folio no frena la factura del sheet", async () => {
    const expro = await prisma.company.findUniqueOrThrow({
      where: { shortCode: "EXPRO" },
    });
    const cp = await prisma.counterparty.create({
      data: { name: "Cliente Compartido", rut: "76996894-6", type: "CUSTOMER" },
    });
    // Documento creado en EXPRO a mano (sin transaction link de SHEET_IMPORT)
    await prisma.document.create({
      data: {
        companyId: expro.id,
        counterpartyId: cp.id,
        type: "AFECTA",
        number: "500",
        netAmount: 100000,
        totalAmount: 100000,
        currency: "CLP",
      },
    });

    const sheet: SheetImportData = {
      month: "2026-07",
      payments: [],
      invoices: [
        {
          rut: "76.996.894-6",
          counterparty: "Cliente Compartido",
          type: "AFECTA",
          number: "500",
          service: "Servicio AW",
          net: 100000,
          iva: 19000,
          total: 119000,
          sent: true,
          paidAt: null,
        },
      ],
      visa: [],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };

    const res = await importFromSheet(sheet, prisma);
    expect(res.invoices).toBe(1);
    expect(res.skipped.invoices).toBe(0);
  });
});

describe("limpieza de duplicados antiguos", () => {
  it("reimportar no agrega una tercera copia y la limpieza deja una por factura", async () => {
    const may = loadMay();
    await importFromSheet(may, prisma);
    const clean = await counts();
    const lira = await prisma.transaction.findFirstOrThrow({
      where: { type: "INCOME", description: { contains: "1190" } },
    });
    const expense = await prisma.transaction.findFirstOrThrow({
      where: { type: "EXPENSE" },
    });
    const liraCopy = await cloneImported(lira.id);
    const expenseCopy = await cloneImported(expense.id);
    await age([lira.id, expense.id], 120);
    await age([liraCopy, expenseCopy], 60);
    await prisma.transaction.update({
      where: { id: lira.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    const withDuplicates = await counts();

    await importFromSheet(may, prisma);
    expect(await counts()).toEqual(withDuplicates);

    const plan = await buildDedupePlan(prisma, "2026-05");
    expect(plan.conflicts).toEqual([]);
    expect(plan.deleteTransactions.map((t) => t.id).sort()).toEqual(
      [liraCopy, expenseCopy].sort(),
    );

    await applyDedupePlan(prisma, plan, "2026-05");
    expect(await counts()).toEqual(clean);
    expect(await duplicatedInvoiceGroups()).toBe(0);
    const survivor = await prisma.transaction.findUniqueOrThrow({
      where: { id: lira.id },
    });
    expect(survivor.status).toBe("PAID");

    const again = await buildDedupePlan(prisma, "2026-05");
    expect(again.deleteTransactions).toEqual([]);
  });

  it("limpieza respeta líneas iguales legítimas usando sheetData", async () => {
    const line = {
      item: "ChatGPT Sub",
      amount: 20000,
      paid: true,
      comment: "",
      company: "AW",
    };
    const sheet: SheetImportData = {
      month: "2026-06",
      payments: [line, line],
      invoices: [],
      visa: [],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };
    await importFromSheet(sheet, prisma);
    const existing = await prisma.transaction.findMany({
      where: { description: "ChatGPT Sub" },
    });
    expect(existing).toHaveLength(2);
    const copy1 = await cloneImported(existing[0].id);
    const copy2 = await cloneImported(existing[1].id);
    await age([existing[0].id, existing[1].id], 120);
    await age([copy1, copy2], 60);

    const plan = await buildDedupePlan(prisma, "2026-06", { sheetData: sheet });
    expect(plan.conflicts).toEqual([]);
    expect(plan.keepTransactions).toHaveLength(2);
    expect(plan.deleteTransactions).toHaveLength(2);
    expect(plan.deleteTransactions.map((t) => t.id).sort()).toEqual(
      [copy1, copy2].sort(),
    );

    await applyDedupePlan(prisma, plan, "2026-06");
    expect(
      await prisma.transaction.count({ where: { description: "ChatGPT Sub" } }),
    ).toBe(2);
  });
});
