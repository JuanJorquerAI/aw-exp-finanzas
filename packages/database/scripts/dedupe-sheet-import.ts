import { PrismaClient } from "@prisma/client";
import {
  DedupePlan,
  DedupeTransactionRecord,
} from "../src/importers/sheet-dedupe";
import {
  applyDedupePlan,
  buildDedupePlan,
} from "../src/importers/sheet-dedupe-db";

// Limpia duplicados de importaciones antiguas del sheet.
// Por defecto es MODO PRUEBA: solo muestra qué borraría.
// Uso: pnpm db:dedupe-sheet --month 2026-05 [--apply]

interface CliArgs {
  readonly month: string;
  readonly apply: boolean;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const monthIndex = argv.indexOf("--month");
  const month = monthIndex >= 0 ? argv[monthIndex + 1] : undefined;
  if (!month) {
    console.error("Uso: pnpm db:dedupe-sheet --month AAAA-MM [--apply]");
    process.exit(1);
  }
  return { month, apply: argv.includes("--apply") };
}

// Muestra a qué base apunta, sin usuario ni contraseña
function describeDatabase(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw)
    return "(DATABASE_URL no definida en el entorno; Prisma usará .env)";
  try {
    const url = new URL(raw);
    return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
  } catch {
    return "(DATABASE_URL con formato no reconocido)";
  }
}

const clp = (n: number): string => `$${Math.round(n).toLocaleString("es-CL")}`;

function describeTx(t: DedupeTransactionRecord): string {
  const extras = [
    t.touched ? "editada" : "intacta",
    t.payments ? `${t.payments} abono(s)` : "",
    t.notes ? `${t.notes} nota(s)` : "",
  ].filter(Boolean);
  return `${t.label} | ${t.companyCode} | ${t.status} | ${clp(t.amount)} | creada ${t.createdAt.toISOString().slice(0, 16)} | ${extras.join(", ")} | id ${t.id}`;
}

function printPlan(plan: DedupePlan): void {
  const keptByGroup = new Map(
    plan.keepTransactions.map((t) => [t.groupKey, t]),
  );
  console.log(`\nTransacciones a BORRAR (${plan.deleteTransactions.length}):`);
  for (const t of plan.deleteTransactions) {
    console.log(`  ✗ ${describeTx(t)}`);
    const kept = keptByGroup.get(t.groupKey);
    if (kept) console.log(`      se conserva → ${describeTx(kept)}`);
  }
  console.log(
    `\nDocumentos huérfanos a BORRAR: ${plan.deleteDocumentIds.length}`,
  );
  console.log(`\nOportunidades a BORRAR (${plan.deleteOpportunities.length}):`);
  for (const o of plan.deleteOpportunities) {
    console.log(
      `  ✗ ${o.label} | creada ${o.createdAt.toISOString().slice(0, 16)} | id ${o.id}`,
    );
  }
  console.log(
    `\nConflictos que NO se tocan, revisar a mano (${plan.conflicts.length}):`,
  );
  for (const c of plan.conflicts) {
    console.log(`  ⚠️  ${c.label}: ${c.reason} (ids ${c.ids.join(", ")})`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    console.log(`Base: ${describeDatabase()} | mes ${args.month}`);
    console.log(
      args.apply
        ? "MODO APLICAR: se borrará lo listado."
        : "MODO PRUEBA: no se borra nada.",
    );
    const plan = await buildDedupePlan(prisma, args.month);
    printPlan(plan);
    if (!args.apply) {
      console.log(
        "\nPara ejecutar de verdad: agregar --apply (respaldar la base antes).",
      );
      return;
    }
    const result = await applyDedupePlan(prisma, plan, args.month);
    console.log(
      `\n✅ Borrado: ${result.transactions} transacciones, ${result.documents} documentos, ${result.opportunities} oportunidades`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
