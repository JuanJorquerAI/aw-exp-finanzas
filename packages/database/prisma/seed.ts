// packages/database/prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ============= COMPANIES =============
  const aw = await prisma.company.upsert({
    where: { shortCode: 'AW' },
    update: {},
    create: {
      name: 'AplicacionesWeb',
      shortCode: 'AW',
      // RUT real lo completa Juan después
    },
  });

  const expro = await prisma.company.upsert({
    where: { shortCode: 'EXPRO' },
    update: {},
    create: {
      name: 'Expande PRO',
      shortCode: 'EXPRO',
    },
  });

  // ============= ACCOUNTS (placeholders) =============
  await prisma.account.createMany({
    data: [
      { companyId: aw.id, name: 'Banco Estado CC', type: 'BANK_CHECKING', currency: 'CLP' },
      { companyId: aw.id, name: 'Visa', type: 'CREDIT_CARD', currency: 'CLP' },
      { companyId: aw.id, name: 'Caja', type: 'CASH', currency: 'CLP' },
      { companyId: expro.id, name: 'Banco Estado CC', type: 'BANK_CHECKING', currency: 'CLP' },
      { companyId: expro.id, name: 'Caja', type: 'CASH', currency: 'CLP' },
    ],
  });

  // ============= CATEGORIES (jerárquicas) =============
  // INGRESOS
  const incServicios = await prisma.category.create({
    data: { name: 'Servicios recurrentes', type: 'INCOME', icon: '🔄' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Fee mensual web', type: 'INCOME', parentId: incServicios.id },
      { name: 'Hosting / Mailhosting', type: 'INCOME', parentId: incServicios.id },
      { name: 'SEO / SEM', type: 'INCOME', parentId: incServicios.id },
      { name: 'Soporte ERP', type: 'INCOME', parentId: incServicios.id },
    ],
  });

  const incProyectos = await prisma.category.create({
    data: { name: 'Proyectos one-time', type: 'INCOME', icon: '🚀' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Desarrollo web', type: 'INCOME', parentId: incProyectos.id },
      { name: 'Implementación ERP', type: 'INCOME', parentId: incProyectos.id },
      { name: 'Consultoría', type: 'INCOME', parentId: incProyectos.id },
    ],
  });

  const incComisiones = await prisma.category.create({
    data: { name: 'Comisiones', type: 'INCOME', icon: '💰' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Ventas web (% sobre ventas)', type: 'INCOME', parentId: incComisiones.id },
    ],
  });

  // EGRESOS
  const expSueldos = await prisma.category.create({
    data: { name: 'Sueldos y honorarios', type: 'EXPENSE', icon: '👥' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Sueldo socios', type: 'EXPENSE', parentId: expSueldos.id },
      { name: 'Sueldo developers', type: 'EXPENSE', parentId: expSueldos.id },
      { name: 'Honorarios externos', type: 'EXPENSE', parentId: expSueldos.id },
    ],
  });

  const expTributarios = await prisma.category.create({
    data: { name: 'Tributarios', type: 'EXPENSE', icon: '🏛️' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'IVA + PPM', type: 'EXPENSE', parentId: expTributarios.id },
      { name: 'F29', type: 'EXPENSE', parentId: expTributarios.id },
      { name: 'Pagos previsionales', type: 'EXPENSE', parentId: expTributarios.id },
    ],
  });

  const expFinancieros = await prisma.category.create({
    data: { name: 'Financieros', type: 'EXPENSE', icon: '🏦' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Cuota Fogape', type: 'EXPENSE', parentId: expFinancieros.id },
      { name: 'Préstamo BCI', type: 'EXPENSE', parentId: expFinancieros.id },
      { name: 'Comisiones bancarias', type: 'EXPENSE', parentId: expFinancieros.id },
      { name: 'Tarjeta Visa', type: 'EXPENSE', parentId: expFinancieros.id },
    ],
  });

  const expSoftware = await prisma.category.create({
    data: { name: 'Software / SaaS', type: 'EXPENSE', icon: '💻' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Canva', type: 'EXPENSE', parentId: expSoftware.id },
      { name: 'Google Workspace', type: 'EXPENSE', parentId: expSoftware.id },
      { name: 'ChatGPT', type: 'EXPENSE', parentId: expSoftware.id },
      { name: 'Claude', type: 'EXPENSE', parentId: expSoftware.id },
      { name: 'Notion', type: 'EXPENSE', parentId: expSoftware.id },
      { name: 'Otros SaaS', type: 'EXPENSE', parentId: expSoftware.id },
    ],
  });

  const expOps = await prisma.category.create({
    data: { name: 'Operacionales', type: 'EXPENSE', icon: '⚙️' },
  });
  await prisma.category.createMany({
    data: [
      { name: 'Hosting propio', type: 'EXPENSE', parentId: expOps.id },
      { name: 'Mails corporativos', type: 'EXPENSE', parentId: expOps.id },
      { name: 'Otros', type: 'EXPENSE', parentId: expOps.id },
    ],
  });

  console.log('✅ Seed completed');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
