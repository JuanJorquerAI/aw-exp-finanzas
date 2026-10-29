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

  it("documento manual de EXPRO con mismo folio no frena la factura AW del sheet", async () => {
    const expro = await prisma.company.findUniqueOrThrow({
      where: { shortCode: "EXPRO" },
    });
    const cp = await prisma.counterparty.create({
      data: { name: "Cliente Compartido", rut: "76996894-6", type: "CUSTOMER" },
    });
    // Documento creado en EXPRO a mano
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

  it("factura AW ingresada a mano con mismo folio no se duplica al importar el sheet", async () => {
    const aw = await prisma.company.findUniqueOrThrow({
      where: { shortCode: "AW" },
    });
    const cp = await prisma.counterparty.create({
      data: { name: "Cliente AW Manual", rut: "76111222-3", type: "CUSTOMER" },
    });
    // Documento creado en AW a mano (sin transaction link de SHEET_IMPORT)
    const doc = await prisma.document.create({
      data: {
        companyId: aw.id,
        counterpartyId: cp.id,
        type: "AFECTA",
        number: "888",
        netAmount: 50000,
        totalAmount: 59500,
        currency: "CLP",
      },
    });
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        status: "PENDING",
        source: "MANUAL",
        amount: 59500,
        amountCLP: 59500,
        currency: "CLP",
        date: new Date("2026-07-01T04:00:00.000Z"),
        description: "Factura 888 manual",
        companyId: aw.id,
        counterpartyId: cp.id,
        documents: { create: { documentId: doc.id } },
      },
    });

    const sheet: SheetImportData = {
      month: "2026-07",
      payments: [],
      invoices: [
        {
          rut: "76.111.222-3",
          counterparty: "Cliente AW Manual",
          type: "AFECTA",
          number: "888",
          service: "Servicio Existente",
          net: 50000,
          iva: 9500,
          total: 59500,
          sent: true,
          paidAt: null,
        },
      ],
      visa: [],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };

    const res = await importFromSheet(sheet, prisma);
    expect(res.invoices).toBe(0);
    expect(res.skipped.invoices).toBe(1);
    expect(
      await prisma.document.count({ where: { number: "888", companyId: aw.id } }),
    ).toBe(1);
  });

  it("reimportar con RUT previo guardado con puntos o sin guion no duplica contraparte ni facturas", async () => {
    const aw = await prisma.company.findUniqueOrThrow({
      where: { shortCode: "AW" },
    });
    // Contraparte guardada con formato antiguo (con puntos)
    const cpPuntos = await prisma.counterparty.create({
      data: {
        name: "Lira Distribuidora",
        rut: "76.026.121-1",
        type: "CUSTOMER",
      },
    });
    const doc1 = await prisma.document.create({
      data: {
        companyId: aw.id,
        counterpartyId: cpPuntos.id,
        type: "AFECTA",
        number: "1190",
        netAmount: 1000000,
        totalAmount: 1190000,
        currency: "CLP",
      },
    });
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        status: "PENDING",
        source: "SHEET_IMPORT",
        amount: 1190000,
        amountCLP: 1190000,
        currency: "CLP",
        date: new Date("2026-05-01T04:00:00.000Z"),
        description: "Factura 1190 - Lira Distribuidora",
        companyId: aw.id,
        counterpartyId: cpPuntos.id,
        documents: { create: { documentId: doc1.id } },
      },
    });

    // Contraparte guardada sin guion (ej. por bank-importer o script previo)
    const cpSinGuion = await prisma.counterparty.create({
      data: {
        name: "Agencia Fiel",
        rut: "769968946",
        type: "CUSTOMER",
      },
    });
    const doc2 = await prisma.document.create({
      data: {
        companyId: aw.id,
        counterpartyId: cpSinGuion.id,
        type: "AFECTA",
        number: "1191",
        netAmount: 500000,
        totalAmount: 595000,
        currency: "CLP",
      },
    });
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        status: "PENDING",
        source: "SHEET_IMPORT",
        amount: 595000,
        amountCLP: 595000,
        currency: "CLP",
        date: new Date("2026-05-01T04:00:00.000Z"),
        description: "Factura 1191 - Agencia Fiel",
        companyId: aw.id,
        counterpartyId: cpSinGuion.id,
        documents: { create: { documentId: doc2.id } },
      },
    });

    const initialCpCount = await prisma.counterparty.count();

    // Reimportar con RUTs en formatos variantes
    const sheet: SheetImportData = {
      month: "2026-05",
      payments: [],
      invoices: [
        {
          rut: "76026121-1", // sin puntos
          counterparty: "Lira Distribuidora",
          type: "AFECTA",
          number: "1190",
          service: "Web",
          net: 1000000,
          iva: 190000,
          total: 1190000,
          sent: true,
          paidAt: null,
        },
        {
          rut: "76.996.894-6", // con puntos y guion
          counterparty: "Agencia Fiel",
          type: "AFECTA",
          number: "1191",
          service: "Marketing",
          net: 500000,
          iva: 95000,
          total: 595000,
          sent: true,
          paidAt: null,
        },
      ],
      visa: [],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };

    const res = await importFromSheet(sheet, prisma);
    expect(res.invoices).toBe(0);
    expect(res.skipped.invoices).toBe(2);
    // No se crearon nuevas contrapartes
    expect(await prisma.counterparty.count()).toBe(initialCpCount);
    // No se duplicaron los documentos
    expect(await prisma.document.count({ where: { number: "1190" } })).toBe(1);
    expect(await prisma.document.count({ where: { number: "1191" } })).toBe(1);
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

  it("par de contrapartes banco + sheet con distinto formato de RUT no duplica facturas y dedupe S/N respeta expectedCounts", async () => {
    const aw = await prisma.company.findUniqueOrThrow({
      where: { shortCode: "AW" },
    });

    // 1. Par de contrapartes con el mismo RUT:
    // cpSheet (antigua, con puntos) y cpBank (creada después por banco, sin guion)
    const cpSheet = await prisma.counterparty.create({
      data: {
        name: "Empresa Dual Sheet",
        rut: "76.543.210-K",
        type: "CUSTOMER",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    });
    const cpBank = await prisma.counterparty.create({
      data: {
        name: "Empresa Dual Banco",
        rut: "76543210K",
        type: "CUSTOMER",
        createdAt: new Date("2025-06-01T00:00:00.000Z"),
      },
    });

    const cpCountBefore = await prisma.counterparty.count();

    // Factura existente asociada a cpBank (la del banco sin guión)
    const docExistente = await prisma.document.create({
      data: {
        companyId: aw.id,
        counterpartyId: cpBank.id,
        type: "AFECTA",
        number: "2001",
        netAmount: 200000,
        totalAmount: 238000,
        currency: "CLP",
      },
    });
    await prisma.transaction.create({
      data: {
        type: "INCOME",
        status: "PENDING",
        source: "SHEET_IMPORT",
        amount: 238000,
        amountCLP: 238000,
        currency: "CLP",
        date: new Date("2026-08-01T04:00:00.000Z"),
        description: "Factura 2001 - Empresa Dual",
        companyId: aw.id,
        counterpartyId: cpBank.id,
        documents: { create: { documentId: docExistente.id } },
      },
    });

    // Sheet contiene la factura existente (2001) y además dos facturas S/N legítimas iguales
    const snInvoice = {
      rut: "76543210-K", // formato normalizado con guión
      counterparty: "Empresa Dual",
      type: "EXENTA" as const,
      number: "S/N",
      service: "Cuota Mantencion",
      net: 100000,
      iva: 0,
      total: 100000,
      sent: true,
      paidAt: null,
    };

    const sheet: SheetImportData = {
      month: "2026-08",
      payments: [],
      invoices: [
        {
          rut: "76543210-K",
          counterparty: "Empresa Dual",
          type: "AFECTA",
          number: "2001",
          service: "Servicio Existente",
          net: 200000,
          iva: 38000,
          total: 238000,
          sent: true,
          paidAt: null,
        },
        snInvoice,
        snInvoice,
      ],
      visa: [],
      opportunities: [],
      exchangeRate: { USD_CLP: 950 },
    };

    // Reimportar:
    // - Factura 2001 debe ser skipped (a pesar de estar vinculada a cpBank en la BD).
    // - Las dos facturas S/N deben ser importadas y asociadas a la contraparte más antigua (cpSheet).
    // - No debe crearse ninguna tercera contraparte en la BD.
    const res = await importFromSheet(sheet, prisma);
    expect(res.invoices).toBe(2);
    expect(res.skipped.invoices).toBe(1);
    expect(await prisma.counterparty.count()).toBe(cpCountBefore);

    const snDocs = await prisma.document.findMany({
      where: {
        companyId: aw.id,
        counterpartyId: cpSheet.id,
        number: null,
      },
    });
    expect(snDocs).toHaveLength(2);

    // Ahora simulamos que un importador antiguo duplicó esas dos facturas S/N
    const snTx = await prisma.transaction.findMany({
      where: {
        companyId: aw.id,
        type: "INCOME",
        counterpartyId: cpSheet.id,
      },
    });
    expect(snTx).toHaveLength(2);

    const copy1 = await cloneImported(snTx[0].id);
    const copy2 = await cloneImported(snTx[1].id);
    await age([snTx[0].id, snTx[1].id], 120);
    await age([copy1, copy2], 60);

    // Dedupe con sheetData:
    // Las claves deben coincidir por canonicalRut y reconocer que se esperaban 2 copias legítimas.
    // Solo deben borrarse copy1 y copy2, nunca las originales.
    const plan = await buildDedupePlan(prisma, "2026-08", { sheetData: sheet });
    expect(plan.conflicts).toEqual([]);
    expect(
      plan.keepTransactions.filter((t) => t.groupKey.includes("S/N")),
    ).toHaveLength(2);
    expect(plan.deleteTransactions).toHaveLength(2);
    expect(plan.deleteTransactions.map((t) => t.id).sort()).toEqual(
      [copy1, copy2].sort(),
    );

    await applyDedupePlan(prisma, plan, "2026-08");

    // Comprobar que sobrevivieron exactamente las 2 facturas S/N y sus 2 documentos
    const remainingTx = await prisma.transaction.findMany({
      where: {
        companyId: aw.id,
        type: "INCOME",
        counterpartyId: cpSheet.id,
      },
    });
    expect(remainingTx).toHaveLength(2);
    const remainingDocs = await prisma.document.findMany({
      where: {
        companyId: aw.id,
        counterpartyId: cpSheet.id,
        number: null,
      },
    });
    expect(remainingDocs).toHaveLength(2);
  });
});
