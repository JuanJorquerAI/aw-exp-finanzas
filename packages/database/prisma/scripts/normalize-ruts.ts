import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '').replace(/\s/g, '').toUpperCase();
}

async function main() {
  const counterparties = await prisma.counterparty.findMany({
    where: { rut: { not: null } },
    select: { id: true, rut: true },
  });

  console.log(`Normalizando ${counterparties.length} contrapartes...`);

  let updated = 0;
  let skipped = 0;
  const conflicts: string[] = [];

  for (const cp of counterparties) {
    const normalized = normalizeRut(cp.rut!);
    if (normalized === cp.rut) { skipped++; continue; }

    const conflict = await prisma.counterparty.findFirst({
      where: { rut: normalized, id: { not: cp.id } },
    });

    if (conflict) {
      conflicts.push(`  CONFLICTO: id=${cp.id} rut="${cp.rut}" -> "${normalized}" ya existe en id=${conflict.id}`);
      continue;
    }

    await prisma.counterparty.update({ where: { id: cp.id }, data: { rut: normalized } });
    updated++;
  }

  console.log(`✓ Actualizados: ${updated}`);
  console.log(`  Sin cambios: ${skipped}`);
  if (conflicts.length > 0) {
    console.log(`⚠ Conflictos (resolver manualmente):`);
    conflicts.forEach(c => console.log(c));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
