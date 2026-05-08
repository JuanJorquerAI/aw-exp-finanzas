# Phase 0 — aw-finanzas — Prompt para Claude Code

> **Cómo usar este prompt**: Crea un directorio vacío `aw-finanzas/`, abre Claude Code adentro, y pega TODO este prompt como primer mensaje. Recomendado correr con **Sonnet** (suficiente para scaffold). Tiempo estimado: 60-90 min de ejecución supervisada.

---

## Contexto

Soy **Juan**, founder de AplicacionesWeb (servicios web/SaaS) y Expande PRO (su brazo de ERP). Necesito un sistema de gestión financiera multi-empresa que reemplace mi Google Sheet actual y que en el futuro se integre con mi ERP propio (ExpandERP).

**Stack que ya manejo y prefiero**: NestJS + Prisma + PostgreSQL en backend, Next.js 14 (App Router) + Tailwind + shadcn/ui en frontend. Deploy futuro en AWS Lightsail (mismo patrón que mi otro proyecto Eulufi).

**Mi contexto operativo**: trabajo en mañanas, tengo TDAH y necesito tareas en bloques de 30-60 minutos. Comunicación directa, en español neutro. Prefiero código que YO entienda y mantenga, sin sobre-ingeniería.

---

## Objetivo de Phase 0

Dejar el monorepo funcionando en local con:
1. ✅ Estructura monorepo (apps/api, apps/web, packages/database)
2. ✅ NestJS API booteando con health endpoint
3. ✅ Next.js web booteando con página de inicio
4. ✅ Prisma schema completo aplicado a PostgreSQL local (Docker)
5. ✅ Seed con mis 2 empresas + categorías base + cuentas tipo
6. ✅ Importer del Google Sheet (CSV/manual JSON) cargando datos reales
7. ✅ README con instrucciones de setup paso a paso

**NO en Phase 0**: dashboard final, autenticación, deploy, alertas. Eso viene en Phase 1.

---

## Stack y versiones exactas

```
Node: 20 LTS
Package manager: pnpm (workspaces)
Backend: NestJS 10 + Prisma 5 + PostgreSQL 16
Frontend: Next.js 14 (App Router) + React 18 + Tailwind 3 + shadcn/ui
DB local: PostgreSQL en Docker (docker-compose.yml en root)
Validation: zod (compartido entre api y web vía packages/shared)
TypeScript: strict mode en todos los packages
```

---

## Estructura de directorios objetivo

```
aw-finanzas/
├── apps/
│   ├── api/                 # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── prisma/
│   │   │   │   └── prisma.service.ts
│   │   │   ├── companies/
│   │   │   ├── transactions/
│   │   │   ├── documents/
│   │   │   ├── counterparties/
│   │   │   ├── opportunities/
│   │   │   ├── importers/
│   │   │   │   └── sheet-importer.service.ts
│   │   │   └── common/
│   │   │       ├── filters/
│   │   │       └── pipes/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                 # Next.js frontend
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/
│       │   └── ui/          # shadcn components
│       ├── lib/
│       │   └── utils.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── database/            # Prisma schema y client compartido
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   └── index.ts     # Exporta PrismaClient
│   │   └── package.json
│   └── shared/              # Tipos zod compartidos
│       ├── src/
│       │   ├── schemas/
│       │   └── index.ts
│       └── package.json
├── docker-compose.yml       # Postgres local
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Paso a paso (ejecuta en este orden)

### Paso 1: Inicializar monorepo
- `pnpm init` en root
- Crear `pnpm-workspace.yaml` con `apps/*` y `packages/*`
- `.gitignore` estándar (node_modules, .env, dist, .next, etc.)
- `docker-compose.yml` con servicio `postgres:16` en puerto 5432, volumen persistente, password definido por env var
- `.env.example` con `DATABASE_URL`, `API_PORT=3001`, `WEB_PORT=3000`

### Paso 2: packages/database
- Inicializar package con dependencias `prisma`, `@prisma/client`
- Pegar el `schema.prisma` completo (ver sección "Prisma Schema" abajo)
- `pnpm prisma generate` y `pnpm prisma migrate dev --name init`
- Crear `prisma/seed.ts` con seed completo (ver sección "Seed" abajo)
- Configurar `package.json` script `"db:seed": "tsx prisma/seed.ts"`
- `src/index.ts` que exporta una instancia singleton de PrismaClient

### Paso 3: packages/shared
- Crear schemas zod para las entidades principales (Transaction, Document, Counterparty, Opportunity)
- Estos schemas se importarán desde api y web

### Paso 4: apps/api (NestJS)
- `nest new api` configurado para usar pnpm
- Instalar dependencias: `@aw-finanzas/database`, `@aw-finanzas/shared`, `class-validator`, `class-transformer`
- `PrismaService` que extiende PrismaClient (patrón estándar Nest)
- Habilitar CORS para `http://localhost:3000`
- Habilitar `ValidationPipe` global
- Modules CRUD básicos (solo controllers + services + DTOs, sin lógica compleja aún):
  - `CompaniesModule` — GET /companies, POST /companies
  - `CounterpartiesModule` — CRUD completo
  - `CategoriesModule` — GET /categories (con tree), POST /categories
  - `AccountsModule` — CRUD completo
  - `DocumentsModule` — CRUD completo
  - `TransactionsModule` — CRUD completo + filtros (companyId, dateFrom, dateTo, type, status)
  - `OpportunitiesModule` — CRUD completo
  - `ImportersModule` — POST /importers/sheet con body JSON (ver formato abajo)
- Health endpoint en `/health` que retorna `{ status: "ok", db: "connected" }`

### Paso 5: apps/web (Next.js)
- `npx create-next-app@latest web --typescript --tailwind --app --no-src-dir`
- Instalar shadcn/ui: `npx shadcn@latest init` (estilo: New York, color: Slate)
- Instalar componentes base: `button card input label table tabs toast dialog`
- Página `/` con placeholder simple: título "aw-finanzas", subtítulo con las 2 empresas, link a `/transactions` (que será un placeholder de "Próximamente — Phase 1")
- Helper `lib/api.ts` con fetch wrapper apuntando a `process.env.NEXT_PUBLIC_API_URL`
- Variables de entorno: `NEXT_PUBLIC_API_URL=http://localhost:3001`

### Paso 6: Importer del Google Sheet
Ver sección dedicada abajo. Crítico que esto funcione end-to-end.

### Paso 7: README.md
Documentar:
- Requisitos previos (Node 20, pnpm, Docker)
- Setup en 5 comandos: `pnpm install` → `docker-compose up -d` → `pnpm db:migrate` → `pnpm db:seed` → `pnpm dev`
- Cómo correr el importer con el archivo `data/sheet-mayo-2026.json`
- Estructura del proyecto
- Roadmap (Phase 1, Phase 2, integración ERP)

---

## Prisma Schema

> Pegar TODO el contenido del archivo `01-prisma-schema.md` adjunto, sección "schema.prisma".
> Si el archivo no está disponible, pídele al usuario que lo entregue.

---

## Seed inicial

```typescript
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
```

---

## Importer del Google Sheet — CRÍTICO

Crear `apps/api/src/importers/sheet-importer.service.ts` que reciba un JSON con esta estructura:

```typescript
// data/sheet-mayo-2026.json
{
  "month": "2026-05",
  "payments": [
    { "item": "IVA + PPM", "amount": 188351, "paid": false, "comment": "Valor aproximado", "company": "EXPRO" },
    { "item": "Sueldo Damian", "amount": 750000, "paid": false, "comment": "Developer Expande Pro", "company": "EXPRO" },
    { "item": "Luis Farías", "amount": 80000, "paid": false, "comment": "Contador", "company": "AW,EXPRO" },
    { "item": "Eduardo Ricci", "amount": 150000, "paid": false, "comment": "Abogado", "company": "EXPRO" },
    { "item": "Sueldo Juan", "amount": 3500000, "paid": false, "comment": "", "company": "EXPRO,AW" },
    { "item": "Luis Silva", "amount": 700000, "paid": false, "comment": "Animals Center + Eulufi (150 c/u) Palquim + AW (200 c/u)", "company": "AW" },
    { "item": "Cuota Fogape", "amount": 531500, "paid": false, "comment": "La mitad del fogape", "company": "AW" },
    { "item": "Préstamo BCI Celulares", "amount": 185745, "paid": false, "comment": "La mitad del crédito", "company": "AW" },
    { "item": "Mails de AW", "amount": 30000, "paid": false, "comment": "Mails de Google", "company": "AW" },
    { "item": "Pagos previsionales", "amount": 250000, "paid": false, "comment": "Estimado Bryan + Juan", "company": "AW" },
    { "item": "Visa", "amount": 300000, "paid": false, "comment": "Aproximado", "company": "AW" },
    { "item": "F29", "amount": 1000000, "paid": false, "comment": "Aproximado", "company": "AW" },
    { "item": "PPM", "amount": 224899, "paid": false, "comment": "Aproximado", "company": "AW" },
    { "item": "Bryan Cartagena", "amount": 1000000, "paid": false, "comment": "Developer AW", "company": "AW" }
  ],
  "invoices": [
    { "rut": "76.475.415-8", "number": "3", "type": "AFECTA", "counterparty": "CyR", "service": "fee-cyr", "net": 2200000, "iva": 418000, "total": 2618000, "sent": true, "paidAt": null },
    { "rut": "93.178.000-K", "number": "", "type": "AFECTA", "counterparty": "ICB SA", "service": "", "net": 398417, "iva": 75699, "total": 474116, "sent": false, "paidAt": null },
    { "rut": "76996894-6", "number": "12-13", "type": "AFECTA", "counterparty": "Agencia Fiel", "service": "Fee mensual web", "net": 630000, "iva": 119700, "total": 749700, "sent": true, "paidAt": null },
    { "rut": "76.395.303-3", "number": "1195", "type": "AFECTA", "counterparty": "Maxiclima (Mailhosting)", "service": "hosting-mc", "net": 116658, "iva": 22165, "total": 138823, "sent": true, "paidAt": null },
    { "rut": "76.081.438-5", "number": "1193", "type": "AFECTA", "counterparty": "Coni Anich", "service": "fee-canich", "net": 490767, "iva": 93246, "total": 584013, "sent": true, "paidAt": null },
    { "rut": "77.427.166-K", "number": "1194", "type": "AFECTA", "counterparty": "Tercera dosis", "service": "fee-td", "net": 181500, "iva": 34485, "total": 215985, "sent": true, "paidAt": null },
    { "rut": "76.916.520-7", "number": "1196", "type": "AFECTA", "counterparty": "Nicolas Alvarez", "service": "fee-frugamex", "net": 120680, "iva": 22929, "total": 143610, "sent": true, "paidAt": null },
    { "rut": "96.893.470-8", "number": "1197", "type": "AFECTA", "counterparty": "BATERÍAS TUBULAR S.A.", "service": "fee-tubular", "net": 180000, "iva": 34200, "total": 214200, "sent": true, "paidAt": null },
    { "rut": "77.079.402-1", "number": "1192", "type": "AFECTA", "counterparty": "Comercializadora Francisca Allende EIRL", "service": "SEO/SEM/Soporte ERP", "net": 321814, "iva": 61145, "total": 382959, "sent": true, "paidAt": null },
    { "rut": "76.026.121-1", "number": "1190", "type": "AFECTA", "counterparty": "Distribuidora Jose Lira Silva EIRL", "service": "Fee mensual desarrollo web", "net": 1005670, "iva": 191077, "total": 1196747, "sent": true, "paidAt": null },
    { "rut": "77.757.710-7", "number": "1191", "type": "AFECTA", "counterparty": "Animals Center", "service": "Soporte + RRSS + ventas web + Meta", "net": 419068, "iva": 79623, "total": 498691, "sent": true, "paidAt": null },
    { "rut": "78.273.401-6", "number": "4", "type": "EXENTA", "counterparty": "Inmobiliaria Eulufi", "service": "Desarrollo web y ERP Eulufi - pago final", "net": 500000, "iva": 0, "total": 500000, "sent": true, "paidAt": null },
    { "rut": "", "number": "14", "type": "AFECTA", "counterparty": "Solar", "service": "", "net": 226891, "iva": 43109, "total": 270000, "sent": true, "paidAt": null },
    { "rut": "", "number": "", "type": "EXENTA", "counterparty": "Univazo", "service": "", "net": 550000, "iva": 0, "total": 550000, "sent": false, "paidAt": null }
  ],
  "visa": [
    { "item": "Canva", "amountCLP": 9200, "amountUSD": null },
    { "item": "Google Workspace Maxiclima", "amountCLP": null, "amountUSD": 57.60 },
    { "item": "ChatGPT", "amountCLP": null, "amountUSD": 96.00 },
    { "item": "Claude", "amountCLP": null, "amountUSD": 100.00 },
    { "item": "Notion", "amountCLP": null, "amountUSD": 24.00 }
  ],
  "opportunities": [
    { "name": "AdOnTheGo", "amount": 12000000, "company": "AW" },
    { "name": "Casino Dreams", "amount": 8419277, "company": "AW" },
    { "name": "Bbraun", "amount": 4022679, "company": "AW" },
    { "name": "Rentabilizar pago 2", "amount": 1200000, "company": "AW" }
  ],
  "exchangeRate": { "USD_CLP": 1041 }
}
```

### Lógica del importer:

```typescript
// Pseudocódigo

async importFromSheet(data: SheetImportDto) {
  // 1. PAYMENTS → Transactions (EXPENSE)
  for (const p of data.payments) {
    const companies = p.company.split(',').map(c => c.trim());
    const tx = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        status: p.paid ? 'PAID' : 'PENDING',
        source: 'SHEET_IMPORT',
        amount: p.amount,
        amountCLP: p.amount,
        currency: 'CLP',
        date: lastDayOfMonth(data.month),
        description: p.item,
        comment: p.comment,
        companyId: lookupCompany(companies[0]).id, // Primera como "principal"
        // categoryId: matchByItemName(p.item) // ver matcher abajo
      }
    });

    // Allocations (split entre empresas si aplica)
    const pct = 100 / companies.length;
    for (const code of companies) {
      await prisma.transactionAllocation.create({
        data: {
          transactionId: tx.id,
          companyId: lookupCompany(code).id,
          percentage: pct,
          amountCLP: p.amount * pct / 100,
        }
      });
    }
  }

  // 2. INVOICES → Document + Transaction (INCOME)
  for (const inv of data.invoices) {
    const cp = await upsertCounterparty({ rut: inv.rut, name: inv.counterparty });
    const doc = await prisma.document.create({
      data: {
        companyId: AW_ID, // default AW; usuario corrige luego
        counterpartyId: cp.id,
        type: inv.type,
        number: inv.number || null,
        netAmount: inv.net,
        ivaAmount: inv.iva,
        totalAmount: inv.total,
        currency: 'CLP',
        description: inv.service,
        isSent: inv.sent,
      }
    });

    await prisma.transaction.create({
      data: {
        type: 'INCOME',
        status: inv.paidAt ? 'PAID' : 'PENDING',
        source: 'SHEET_IMPORT',
        amount: inv.total,
        amountCLP: inv.total,
        currency: 'CLP',
        date: firstDayOfMonth(data.month),
        paidAt: inv.paidAt,
        description: `Factura ${inv.number} - ${inv.counterparty}`,
        companyId: AW_ID,
        counterpartyId: cp.id,
        documentId: doc.id,
        // 100% allocation a AW
      }
    });
  }

  // 3. VISA → Transactions (EXPENSE) con currency USD/CLP
  for (const v of data.visa) {
    const isUSD = v.amountUSD !== null;
    await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        status: 'PAID',
        source: 'SHEET_IMPORT',
        amount: isUSD ? v.amountUSD : v.amountCLP,
        currency: isUSD ? 'USD' : 'CLP',
        exchangeRate: isUSD ? data.exchangeRate.USD_CLP : null,
        amountCLP: isUSD ? (v.amountUSD * data.exchangeRate.USD_CLP) : v.amountCLP,
        date: firstDayOfMonth(data.month),
        description: v.item,
        companyId: AW_ID, // Visa default AW
        // accountId: VISA_AW_ID
      }
    });
  }

  // 4. OPPORTUNITIES
  for (const o of data.opportunities) {
    await prisma.opportunity.create({
      data: {
        name: o.name,
        estimatedAmount: o.amount,
        currency: 'CLP',
        stage: 'PROPOSAL_SENT',
        probability: 50,
        companyId: lookupCompany(o.company).id,
      }
    });
  }
}
```

### Matcher de categorías por nombre (helper)

Crear un mapping inicial:
```typescript
const ITEM_TO_CATEGORY: Record<string, string> = {
  'IVA + PPM': 'IVA + PPM',
  'F29': 'F29',
  'PPM': 'IVA + PPM',
  'Pagos previsionales': 'Pagos previsionales',
  'Sueldo Damian': 'Sueldo developers',
  'Sueldo Juan': 'Sueldo socios',
  'Bryan Cartagena': 'Sueldo developers',
  'Luis Silva': 'Sueldo developers',
  'Luis Farías': 'Honorarios externos',
  'Eduardo Ricci': 'Honorarios externos',
  'Cuota Fogape': 'Cuota Fogape',
  'Préstamo BCI Celulares': 'Préstamo BCI',
  'Visa': 'Tarjeta Visa',
  'Mails de AW': 'Mails corporativos',
  'Canva': 'Canva',
  'Google Workspace Maxiclima': 'Google Workspace',
  'ChatGPT': 'ChatGPT',
  'Claude': 'Claude',
  'Notion': 'Notion',
};
```

### Endpoint
- `POST /importers/sheet` recibe el JSON, ejecuta dentro de una transacción Prisma (`$transaction`), retorna summary: `{ payments: 14, invoices: 14, visa: 5, opportunities: 4 }`.
- También crear un script CLI: `pnpm db:import-sheet data/sheet-mayo-2026.json` para correrlo sin pasar por HTTP.

---

## Validación de éxito (checklist final)

Después de correr setup, verificar:

- [ ] `docker ps` muestra postgres corriendo
- [ ] `pnpm dev` levanta api en :3001 y web en :3000 sin errores
- [ ] `curl http://localhost:3001/health` → `{"status":"ok","db":"connected"}`
- [ ] `curl http://localhost:3001/companies` → array con AW y EXPRO
- [ ] `curl http://localhost:3001/categories` → árbol de categorías
- [ ] `pnpm db:import-sheet data/sheet-mayo-2026.json` corre sin errores
- [ ] `curl http://localhost:3001/transactions?type=EXPENSE` → 14 + 5 visa = 19 transactions
- [ ] `curl http://localhost:3001/transactions?type=INCOME` → 14 transactions
- [ ] `curl http://localhost:3001/opportunities` → 4 opportunities
- [ ] Suma de allocations para AW debería incluir el 50% de Luis Farías y de Sueldo Juan
- [ ] http://localhost:3000 muestra placeholder con AW + EXPRO

---

## Reglas para Claude Code

1. **No avances al siguiente paso si el anterior tiene errores**. Pídele a Juan que valide.
2. **Commits frecuentes**: uno por paso completado, mensajes claros.
3. **No instales librerías que no estén explícitamente listadas** sin justificarlo.
4. **TypeScript strict**, sin `any` salvo justificación documentada.
5. **Si encuentras ambigüedad** en este prompt, **pregunta antes de asumir**.
6. **No hagas el dashboard ni autenticación** — eso es Phase 1.
7. **Usa pnpm**, no npm ni yarn.
8. **Logs informativos en español** durante el seed e import.

---

## Después de Phase 0

Phase 1 (siguiente sesión) traerá:
- Dashboard "Resumen del mes" por empresa
- Vistas CxC y CxP con marcado rápido de pagos
- Form de nueva transacción con autocomplete
- Toggle USD/CLP

Phase 2:
- Importer de cartolas bancarias (CSV de Banco Estado, BCI)
- Reglas de categorización automática
- Alertas WhatsApp/email de vencimientos

Phase 3:
- Auth + multi-usuario (cuando entren los 2 devs)
- Deploy AWS Lightsail
- Integración con SII (lectura de facturas emitidas/recibidas)

Phase 4:
- Webhook bidireccional con ExpandERP

---

**¡Adelante!** Avísame cuando termines cada paso para que valide.
