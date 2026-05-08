import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { importFromSheet, SheetImportData } from '../src/importers/sheet-importer';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: pnpm db:import-sheet <ruta-al-json>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`Archivo no encontrado: ${absolutePath}`);
    process.exit(1);
  }

  const data: SheetImportData = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
  const prisma = new PrismaClient();

  try {
    const result = await importFromSheet(data, prisma);
    console.log('Resultado:', result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
