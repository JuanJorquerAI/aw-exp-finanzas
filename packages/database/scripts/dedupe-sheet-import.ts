import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  DedupePlan,
  DedupeTransactionRecord,
} from "../src/importers/sheet-dedupe";
import {
  applyDedupePlan,
  buildDedupePlan,
} from "../src/importers/sheet-dedupe-db";
import { SheetImportData } from "../src/importers/sheet-importer";

// Limpia duplicados de importaciones antiguas del sheet.
// Por defecto es MODO PRUEBA: solo muestra qué borraría.
// Uso: pnpm db:dedupe-sheet --month 2026-05 [--apply] [--json <ruta>]

interface CliArgs {
  readonly month: string;
  readonly apply: boolean;
  readonly jsonPath?: string;
}

function parseArgs(argv: readonly string[]): CliArgs {
  const monthIndex = argv.indexOf("--month");
  const month = monthIndex >= 0 ? argv[monthIndex + 1] : undefined;
  if (!month) {
    console.error(
      "Uso: pnpm db:dedupe-sheet --month AAAA-MM [--apply] [--json <ruta>]",
    );
    process.exit(1);
  }
  const jsonIndex = argv.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? argv[jsonIndex + 1] : undefined;
  return { month, apply: argv.includes("--apply"), jsonPath };
}

function findSheetJson(month: string, explicitPath?: string): string | null {
  if (explicitPath) {
    const resolved = path.resolve(process.cwd(), explicitPath);
    return fs.existsSync(resolved) ? resolved : null;
  }
  const searchDirs = [
    path.resolve(process.cwd(), "data"),
    path.resolve(__dirname, "../../../data"),
    path.resolve(__dirname, "../../data"),
  ];

  const monthNames: Record<string, string> = {
    "01": "enero",
    "02": "febrero",
    "03": "marzo",
    "04": "abril",
    "05": "mayo",
    "06": "junio",
    "07": "julio",
    "08": "agosto",
    "09": "septiembre",
    "10": "octubre",
    "11": "noviembre",
    "12": "diciembre",
  };
  const [yearStr, monthNum] = month.split("-");
  const monthWord = monthNames[monthNum] ?? "";

  const candidateNames = [
    `sheet-${month}.json`,
    `sheet-${monthWord}-${yearStr}.json`,
    `sheet-${yearStr}-${monthWord}.json`,
    `sheet-${monthWord}.json`,
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of candidateNames) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) {
        return full;
      }
    }
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const full = path.join(dir, file);
        try {
          const content = JSON.parse(fs.readFileSync(full, "utf-8"));
          if (content && content.month === month) {
            return full;
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
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

    const jsonPath = findSheetJson(args.month, args.jsonPath);
    let sheetData: SheetImportData | undefined;

    if (jsonPath) {
      try {
        const raw = JSON.parse(
          fs.readFileSync(jsonPath, "utf-8"),
        ) as SheetImportData;
        if (raw.month === args.month) {
          sheetData = raw;
          console.log(`Usando datos del sheet: ${jsonPath} (mes ${raw.month})`);
        } else if (args.apply) {
          console.error(
            `Error: El mes del JSON ("${raw.month}") no coincide con --month "${args.month}".`,
          );
          process.exit(1);
        } else {
          console.warn(
            `Advertencia: El mes del JSON ("${raw.month}") no coincide con --month "${args.month}". Se ignora.`,
          );
        }
      } catch (e) {
        if (args.apply) {
          console.error(`Error al leer el JSON ${jsonPath}:`, e);
          process.exit(1);
        }
      }
    }

    if (args.apply && !sheetData) {
      console.error(
        `Error: --apply exige un archivo JSON válido cuyo mes coincida con "${args.month}". Proporciona --json <ruta>.`,
      );
      process.exit(1);
    }

    if (!sheetData) {
      console.log(
        `Sin JSON del sheet para mes ${args.month} (se asume máximo 1 aparición por línea).`,
      );
    }

    const plan = await buildDedupePlan(prisma, args.month, {
      sheetData,
      jsonPath: jsonPath ?? undefined,
    });
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
