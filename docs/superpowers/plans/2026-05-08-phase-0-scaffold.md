# Phase 0 — aw-finanzas Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levantar el monorepo aw-finanzas en local con API NestJS, web Next.js, Prisma + PostgreSQL, seed, e importer del Google Sheet.

**Architecture:** Monorepo pnpm workspaces con `packages/database` (Prisma, importer core), `packages/shared` (zod schemas), `apps/api` (NestJS), `apps/web` (Next.js). `Transaction` es la entidad central; gastos compartidos entre empresas se modelan con `TransactionAllocation`. El importer core vive en `packages/database` para poder ejecutarse tanto desde HTTP como desde CLI.

**Tech Stack:** Node 20, pnpm workspaces, NestJS 10, Prisma 5, PostgreSQL 16 (Docker), Next.js 14 App Router, Tailwind 3, shadcn/ui (New York/Slate), zod, date-fns, class-validator, tsx

---

## File Structure

```
aw-exp-finanzas/                        ← monorepo root (este directorio)
├── package.json                        CREATE — root scripts (dev, build, db:*)
├── pnpm-workspace.yaml                 CREATE
├── tsconfig.base.json                  CREATE — strict TS compartido
├── docker-compose.yml                  CREATE — postgres:16
├── .env.example                        CREATE
├── .gitignore                          CREATE
├── data/
│   └── sheet-mayo-2026.json            CREATE — datos de importación
├── packages/
│   ├── database/
│   │   ├── package.json                CREATE
│   │   ├── tsconfig.json               CREATE
│   │   ├── jest.config.js              CREATE
│   │   ├── prisma/
│   │   │   ├── schema.prisma           CREATE — copiado de docs/01-prisma-schema.md
│   │   │   └── seed.ts                 CREATE — copiado de docs/02-prompt-claude-code.md
│   │   ├── src/
│   │   │   ├── index.ts                CREATE — re-exporta PrismaClient singleton
│   │   │   └── importers/
│   │   │       ├── sheet-importer.ts   CREATE — lógica core del importer
│   │   │       └── sheet-importer.test.ts  CREATE — tests unitarios del importer
│   │   └── scripts/
│   │       └── import-sheet.ts         CREATE — CLI wrapper
│   └── shared/
│       ├── package.json                CREATE
│       ├── tsconfig.json               CREATE
│       ├── jest.config.js              CREATE
│       └── src/
│           ├── index.ts                CREATE
│           ├── schemas/
│           │   ├── transaction.ts      CREATE
│           │   ├── document.ts         CREATE
│           │   ├── counterparty.ts     CREATE
│           │   └── opportunity.ts      CREATE
│           └── __tests__/
│               └── schemas.test.ts     CREATE
└── apps/
    ├── api/                            CREATE via `nest new`
    │   ├── package.json                MODIFY — agregar workspace deps + scripts
    │   ├── tsconfig.json               MODIFY — paths para workspace packages
    │   ├── jest.config.js              MODIFY — moduleNameMapper
    │   └── src/
    │       ├── main.ts                 MODIFY — CORS + ValidationPipe
    │       ├── app.module.ts           MODIFY — importar todos los módulos
    │       ├── prisma/
    │       │   ├── prisma.service.ts   CREATE
    │       │   └── prisma.module.ts    CREATE
    │       ├── health/
    │       │   ├── health.controller.ts    CREATE
    │       │   └── health.module.ts        CREATE
    │       ├── companies/              CREATE (module/controller/service/dto/spec)
    │       ├── accounts/               CREATE
    │       ├── counterparties/         CREATE
    │       ├── categories/             CREATE
    │       ├── documents/              CREATE
    │       ├── transactions/           CREATE (incluye FilterDto)
    │       ├── opportunities/          CREATE
    │       └── importers/              CREATE (llama a packages/database importer)
    └── web/                            CREATE via `create-next-app`
        ├── app/
        │   ├── page.tsx                MODIFY — placeholder con AW + EXPRO
        │   └── transactions/page.tsx   CREATE — placeholder "Próximamente Phase 1"
        └── lib/
            └── api.ts                  CREATE — fetch wrapper

```

---

## Task 1: Monorepo infrastructure

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Escribir el test** — verificar que docker arranca (no hay test de código, la validación es manual)

- [ ] **Step 2: Crear `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Crear `package.json` root**

```json
{
  "name": "aw-finanzas",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "concurrently \"pnpm --filter api dev\" \"pnpm --filter web dev\"",
    "build": "pnpm --filter @aw-finanzas/database build && pnpm --filter @aw-finanzas/shared build && pnpm --filter api build && pnpm --filter web build",
    "db:migrate": "pnpm --filter @aw-finanzas/database migrate",
    "db:seed": "pnpm --filter @aw-finanzas/database seed",
    "db:generate": "pnpm --filter @aw-finanzas/database generate",
    "db:import-sheet": "tsx packages/database/scripts/import-sheet.ts"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 4: Crear `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Crear `docker-compose.yml`**

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: aw_finanzas
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 6: Crear `.env.example`**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aw_finanzas
API_PORT=3001
WEB_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
POSTGRES_PASSWORD=postgres
WEB_URL=http://localhost:3000
```

- [ ] **Step 7: Crear `.env` copiando `.env.example`**

```bash
cp .env.example .env
```

- [ ] **Step 8: Crear `.gitignore`**

```
node_modules
.env
dist
.next
*.js.map
coverage
.turbo
```

- [ ] **Step 9: Levantar Docker y verificar**

```bash
docker-compose up -d
docker ps
```

Expected: contenedor `aw-exp-finanzas-postgres-1` (o similar) en estado `Up`.

- [ ] **Step 10: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml tsconfig.base.json docker-compose.yml .env.example .gitignore
git commit -m "chore: inicializar monorepo aw-finanzas"
```

---

## Task 2: packages/database — Prisma schema, seed, client

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/jest.config.js`
- Create: `packages/database/prisma/schema.prisma`
- Create: `packages/database/prisma/seed.ts`
- Create: `packages/database/src/index.ts`

- [ ] **Step 1: Crear `packages/database/package.json`**

```json
{
  "name": "@aw-finanzas/database",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev",
    "seed": "tsx prisma/seed.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "date-fns": "^3.3.1"
  },
  "devDependencies": {
    "prisma": "^5.10.0",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "@types/jest": "^29.5.12"
  }
}
```

- [ ] **Step 2: Crear `packages/database/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Crear `packages/database/jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
};
```

- [ ] **Step 4: Crear `packages/database/prisma/schema.prisma`**

Copiar el schema completo desde `docs/01-prisma-schema.md`, sección `## schema.prisma`. El schema incluye los modelos: `Company`, `Account`, `Counterparty`, `Category`, `Document`, `Transaction`, `TransactionAllocation`, `Opportunity`, `CategorizationRule`, `ExchangeRate` y todos sus enums.

El bloque de datasource debe quedar:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 5: Instalar dependencias de database**

```bash
pnpm --filter @aw-finanzas/database install
```

- [ ] **Step 6: Generar Prisma client**

```bash
pnpm --filter @aw-finanzas/database generate
```

Expected: `✔ Generated Prisma Client` sin errores.

- [ ] **Step 7: Ejecutar migración inicial**

```bash
pnpm --filter @aw-finanzas/database migrate -- --name init
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 8: Crear `packages/database/src/index.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { PrismaClient };
export * from '@prisma/client';
```

- [ ] **Step 9: Crear `packages/database/prisma/seed.ts`**

Copiar el seed completo desde `docs/02-prompt-claude-code.md`, sección `## Seed inicial`. El seed crea las 2 empresas (AW, EXPRO), sus cuentas, y todas las categorías jerárquicas (ingresos y egresos).

- [ ] **Step 10: Ejecutar el seed**

```bash
pnpm --filter @aw-finanzas/database seed
```

Expected: `✅ Seed completed`

- [ ] **Step 11: Verificar datos en DB**

```bash
pnpm --filter @aw-finanzas/database generate && \
  node -e "const {PrismaClient}=require('./packages/database/node_modules/@prisma/client');const p=new PrismaClient();p.company.findMany().then(r=>{console.log('Empresas:',r.length);p.\$disconnect()})"
```

Expected: `Empresas: 2`

- [ ] **Step 12: Commit**

```bash
git add packages/database
git commit -m "feat: agregar packages/database con schema Prisma, migración y seed"
```

---

## Task 3: packages/shared — zod schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/jest.config.js`
- Create: `packages/shared/src/schemas/transaction.ts`
- Create: `packages/shared/src/schemas/document.ts`
- Create: `packages/shared/src/schemas/counterparty.ts`
- Create: `packages/shared/src/schemas/opportunity.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/__tests__/schemas.test.ts`

- [ ] **Step 1: Escribir test que falla**

Crear `packages/shared/src/__tests__/schemas.test.ts`:

```typescript
import { CreateTransactionSchema, CreateCounterpartySchema } from '../index';

describe('CreateTransactionSchema', () => {
  it('acepta transacción válida', () => {
    const result = CreateTransactionSchema.safeParse({
      companyId: 'cjld2cjxh0000qzrmn831i7rn',
      type: 'EXPENSE',
      amount: 100000,
      amountCLP: 100000,
      date: '2026-05-01',
      description: 'IVA + PPM',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza montos negativos', () => {
    const result = CreateTransactionSchema.safeParse({
      companyId: 'cjld2cjxh0000qzrmn831i7rn',
      type: 'EXPENSE',
      amount: -100,
      amountCLP: -100,
      date: '2026-05-01',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza type inválido', () => {
    const result = CreateTransactionSchema.safeParse({
      companyId: 'cjld2cjxh0000qzrmn831i7rn',
      type: 'INVALID',
      amount: 100,
      amountCLP: 100,
      date: '2026-05-01',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateCounterpartySchema', () => {
  it('rechaza email inválido', () => {
    const result = CreateCounterpartySchema.safeParse({
      type: 'CUSTOMER',
      name: 'Test',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
pnpm --filter @aw-finanzas/shared test
```

Expected: FAIL — módulos no existen aún.

- [ ] **Step 3: Crear `packages/shared/package.json`**

```json
{
  "name": "@aw-finanzas/shared",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "@types/jest": "^29.5.12"
  }
}
```

- [ ] **Step 4: Crear `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Crear `packages/shared/jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
};
```

- [ ] **Step 6: Crear `packages/shared/src/schemas/transaction.ts`**

```typescript
import { z } from 'zod';

export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);
export const TransactionStatusSchema = z.enum(['PENDING', 'PAID', 'RECONCILED', 'CANCELLED']);
export const CurrencySchema = z.enum(['CLP', 'USD', 'UF', 'EUR']);

export const CreateTransactionSchema = z.object({
  companyId: z.string().min(1),
  accountId: z.string().min(1).optional(),
  counterpartyId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  currency: CurrencySchema.default('CLP'),
  exchangeRate: z.number().positive().optional(),
  amountCLP: z.number().positive(),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  description: z.string().min(1).max(500),
  comment: z.string().optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
```

- [ ] **Step 7: Crear `packages/shared/src/schemas/document.ts`**

```typescript
import { z } from 'zod';
import { CurrencySchema } from './transaction';

export const DocumentTypeSchema = z.enum([
  'AFECTA', 'EXENTA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'HONORARIOS',
]);

export const CreateDocumentSchema = z.object({
  companyId: z.string().min(1),
  counterpartyId: z.string().min(1).optional(),
  type: DocumentTypeSchema,
  number: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  netAmount: z.number().min(0),
  ivaAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  currency: CurrencySchema.default('CLP'),
  description: z.string().optional(),
  detail: z.string().optional(),
  isSent: z.boolean().default(false),
});

export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
```

- [ ] **Step 8: Crear `packages/shared/src/schemas/counterparty.ts`**

```typescript
import { z } from 'zod';

export const CounterpartyTypeSchema = z.enum([
  'CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'GOVERNMENT', 'BANK', 'OTHER',
]);

export const CreateCounterpartySchema = z.object({
  type: CounterpartyTypeSchema,
  name: z.string().min(1).max(255),
  rut: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCounterpartyDto = z.infer<typeof CreateCounterpartySchema>;
```

- [ ] **Step 9: Crear `packages/shared/src/schemas/opportunity.ts`**

```typescript
import { z } from 'zod';
import { CurrencySchema } from './transaction';

export const OpportunityStageSchema = z.enum([
  'PROSPECTING', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD',
]);

export const CreateOpportunitySchema = z.object({
  companyId: z.string().min(1),
  counterpartyId: z.string().min(1).optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  stage: OpportunityStageSchema.default('PROSPECTING'),
  estimatedAmount: z.number().min(0),
  currency: CurrencySchema.default('CLP'),
  probability: z.number().int().min(0).max(100).default(50),
  expectedCloseDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreateOpportunityDto = z.infer<typeof CreateOpportunitySchema>;
```

- [ ] **Step 10: Crear `packages/shared/src/index.ts`**

```typescript
export * from './schemas/transaction';
export * from './schemas/document';
export * from './schemas/counterparty';
export * from './schemas/opportunity';
```

- [ ] **Step 11: Instalar e ejecutar tests**

```bash
pnpm --filter @aw-finanzas/shared install
pnpm --filter @aw-finanzas/shared test
```

Expected: 4 tests passing.

- [ ] **Step 12: Commit**

```bash
git add packages/shared
git commit -m "feat: agregar packages/shared con schemas zod"
```

---

## Task 4: apps/api — Bootstrap NestJS + PrismaService + Health

**Files:**
- Create: `apps/api/` (via `nest new`)
- Modify: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `apps/api/jest.config.js`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Test: `apps/api/test/health.e2e-spec.ts`

- [ ] **Step 1: Escribir e2e test que falla**

Crear `apps/api/test/health.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health retorna status ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', db: 'connected' });
  });
});
```

- [ ] **Step 2: Crear apps/api con nest CLI**

```bash
cd apps && npx @nestjs/cli new api --package-manager pnpm --skip-git --strict
cd ..
```

Expected: directorio `apps/api/` creado con estructura NestJS estándar.

- [ ] **Step 3: Modificar `apps/api/package.json` — agregar workspace deps**

Agregar en `dependencies`:
```json
{
  "@aw-finanzas/database": "workspace:*",
  "@aw-finanzas/shared": "workspace:*",
  "class-validator": "^0.14.1",
  "class-transformer": "^0.5.1"
}
```

Agregar en `devDependencies`:
```json
{
  "supertest": "^6.3.4",
  "@types/supertest": "^6.0.2"
}
```

Modificar `scripts`:
```json
{
  "start:dev": "nest start --watch",
  "dev": "nest start --watch"
}
```

- [ ] **Step 4: Modificar `apps/api/tsconfig.json` — agregar paths**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@aw-finanzas/database": ["../../packages/database/src/index.ts"],
      "@aw-finanzas/database/*": ["../../packages/database/src/*"],
      "@aw-finanzas/shared": ["../../packages/shared/src/index.ts"],
      "@aw-finanzas/shared/*": ["../../packages/shared/src/*"]
    }
  }
}
```

- [ ] **Step 5: Modificar `apps/api/jest.config.js` — agregar moduleNameMapper**

```js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '@aw-finanzas/database': '<rootDir>/../../packages/database/src/index.ts',
    '@aw-finanzas/shared': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
```

Para e2e, actualizar `apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "@aw-finanzas/database": "<rootDir>/../packages/database/src/index.ts",
    "@aw-finanzas/shared": "<rootDir>/../packages/shared/src/index.ts"
  }
}
```

- [ ] **Step 6: Instalar dependencias**

```bash
pnpm --filter api install
```

- [ ] **Step 7: Crear `apps/api/src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@aw-finanzas/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 8: Crear `apps/api/src/prisma/prisma.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 9: Crear `apps/api/src/health/health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'connected' };
  }
}
```

- [ ] **Step 10: Crear `apps/api/src/health/health.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 11: Reemplazar `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`API corriendo en http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 12: Reemplazar `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, HealthModule],
})
export class AppModule {}
```

- [ ] **Step 13: Ejecutar e2e test**

```bash
pnpm --filter api test:e2e
```

Expected: 1 test passing — `GET /health retorna status ok`.

- [ ] **Step 14: Verificar dev server**

```bash
pnpm --filter api dev &
sleep 5
curl http://localhost:3001/health
```

Expected: `{"status":"ok","db":"connected"}`

- [ ] **Step 15: Commit**

```bash
git add apps/api
git commit -m "feat: bootstrap NestJS API con PrismaService y health endpoint"
```

---

## Task 5: apps/api — CompaniesModule + AccountsModule

**Files:**
- Create: `apps/api/src/companies/{companies.module,companies.controller,companies.service,companies.service.spec,dto/create-company.dto}.ts`
- Create: `apps/api/src/accounts/{accounts.module,accounts.controller,accounts.service,accounts.service.spec,dto/create-account.dto}.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir test que falla — CompaniesService**

Crear `apps/api/src/companies/companies.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CompaniesService', () => {
  let service: CompaniesService;

  const mockPrisma = {
    company: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CompaniesService>(CompaniesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('retorna solo empresas activas', async () => {
      const data = [{ id: '1', name: 'AplicacionesWeb', shortCode: 'AW', isActive: true }];
      mockPrisma.company.findMany.mockResolvedValue(data);

      const result = await service.findAll();

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(result).toEqual(data);
    });
  });

  describe('findOne', () => {
    it('lanza NotFoundException si no existe', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('retorna la empresa si existe', async () => {
      const company = { id: '1', name: 'AplicacionesWeb', shortCode: 'AW' };
      mockPrisma.company.findUnique.mockResolvedValue(company);
      const result = await service.findOne('1');
      expect(result).toEqual(company);
    });
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
pnpm --filter api test companies.service
```

Expected: FAIL — `Cannot find module './companies.service'`

- [ ] **Step 3: Crear `apps/api/src/companies/dto/create-company.dto.ts`**

```typescript
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(20)
  shortCode: string;

  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
```

- [ ] **Step 4: Crear `apps/api/src/companies/companies.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({ where: { isActive: true } });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException(`Empresa ${id} no encontrada`);
    return company;
  }

  create(dto: CreateCompanyDto) {
    return this.prisma.company.create({ data: dto });
  }
}
```

- [ ] **Step 5: Ejecutar test — debe pasar**

```bash
pnpm --filter api test companies.service
```

Expected: 3 tests passing.

- [ ] **Step 6: Crear `apps/api/src/companies/companies.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }
}
```

- [ ] **Step 7: Crear `apps/api/src/companies/companies.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
```

- [ ] **Step 8: Escribir test para AccountsService**

Crear `apps/api/src/accounts/accounts.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AccountsService', () => {
  let service: AccountsService;

  const mockPrisma = {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AccountsService>(AccountsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByCompany filtra por companyId', async () => {
    const data = [{ id: '1', companyId: 'c1', name: 'Banco Estado', isActive: true }];
    mockPrisma.account.findMany.mockResolvedValue(data);

    const result = await service.findByCompany('c1');

    expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
      where: { companyId: 'c1', isActive: true },
    });
    expect(result).toEqual(data);
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    mockPrisma.account.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 9: Crear `apps/api/src/accounts/dto/create-account.dto.ts`**

```typescript
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AccountType, Currency } from '@aw-finanzas/database';

export class CreateAccountDto {
  @IsString()
  companyId: string;

  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;
}
```

- [ ] **Step 10: Crear `apps/api/src/accounts/accounts.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.account.findMany({ where: { isActive: true } });
  }

  findByCompany(companyId: string) {
    return this.prisma.account.findMany({ where: { companyId, isActive: true } });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Cuenta ${id} no encontrada`);
    return account;
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }
}
```

- [ ] **Step 11: Ejecutar tests**

```bash
pnpm --filter api test accounts.service
```

Expected: 2 tests passing.

- [ ] **Step 12: Crear `apps/api/src/accounts/accounts.controller.ts`**

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    if (companyId) return this.accountsService.findByCompany(companyId);
    return this.accountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }
}
```

- [ ] **Step 13: Crear `apps/api/src/accounts/accounts.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
```

- [ ] **Step 14: Actualizar `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { AccountsModule } from './accounts/accounts.module';

@Module({
  imports: [PrismaModule, HealthModule, CompaniesModule, AccountsModule],
})
export class AppModule {}
```

- [ ] **Step 15: Verificar endpoint**

```bash
curl http://localhost:3001/companies
```

Expected: array JSON con AW y EXPRO.

- [ ] **Step 16: Commit**

```bash
git add apps/api/src/companies apps/api/src/accounts apps/api/src/app.module.ts
git commit -m "feat: agregar CompaniesModule y AccountsModule"
```

---

## Task 6: apps/api — CounterpartiesModule + CategoriesModule

**Files:**
- Create: `apps/api/src/counterparties/{counterparties.module,counterparties.controller,counterparties.service,counterparties.service.spec,dto/create-counterparty.dto}.ts`
- Create: `apps/api/src/categories/{categories.module,categories.controller,categories.service,categories.service.spec,dto/create-category.dto}.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir tests que fallan**

Crear `apps/api/src/counterparties/counterparties.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CounterpartiesService } from './counterparties.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CounterpartiesService', () => {
  let service: CounterpartiesService;

  const mockPrisma = {
    counterparty: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CounterpartiesService>(CounterpartiesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll retorna contraparte activas', async () => {
    mockPrisma.counterparty.findMany.mockResolvedValue([]);
    await service.findAll();
    expect(mockPrisma.counterparty.findMany).toHaveBeenCalledWith({ where: { isActive: true } });
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    mockPrisma.counterparty.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });
});
```

Crear `apps/api/src/categories/categories.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrisma = {
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findTree construye árbol a partir de flat list', async () => {
    const flat = [
      { id: 'p1', name: 'Sueldos', type: 'EXPENSE', parentId: null },
      { id: 'c1', name: 'Sueldo socios', type: 'EXPENSE', parentId: 'p1' },
      { id: 'c2', name: 'Sueldo developers', type: 'EXPENSE', parentId: 'p1' },
    ];
    mockPrisma.category.findMany.mockResolvedValue(flat);

    const result = await service.findTree();

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].name).toBe('Sueldo socios');
  });
});
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
pnpm --filter api test counterparties.service categories.service
```

Expected: FAIL ambos.

- [ ] **Step 3: Crear DTOs**

`apps/api/src/counterparties/dto/create-counterparty.dto.ts`:
```typescript
import { IsString, IsEnum, IsOptional, IsEmail, MaxLength } from 'class-validator';
import { CounterpartyType } from '@aw-finanzas/database';

export class CreateCounterpartyDto {
  @IsEnum(CounterpartyType)
  type: CounterpartyType;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

`apps/api/src/categories/dto/create-category.dto.ts`:
```typescript
import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { TransactionType } from '@aw-finanzas/database';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
```

- [ ] **Step 4: Crear services**

`apps/api/src/counterparties/counterparties.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';

@Injectable()
export class CounterpartiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.counterparty.findMany({ where: { isActive: true } });
  }

  async findOne(id: string) {
    const cp = await this.prisma.counterparty.findUnique({ where: { id } });
    if (!cp) throw new NotFoundException(`Contraparte ${id} no encontrada`);
    return cp;
  }

  create(dto: CreateCounterpartyDto) {
    return this.prisma.counterparty.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateCounterpartyDto>) {
    return this.prisma.counterparty.update({ where: { id }, data: dto });
  }
}
```

`apps/api/src/categories/categories.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree() {
    const all = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    const roots = all.filter((c) => !c.parentId);
    return roots.map((root) => ({
      ...root,
      children: all.filter((c) => c.parentId === root.id),
    }));
  }

  findAll() {
    return this.prisma.category.findMany({ where: { isActive: true } });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }
}
```

- [ ] **Step 5: Ejecutar tests — deben pasar**

```bash
pnpm --filter api test counterparties.service categories.service
```

Expected: 3 tests passing.

- [ ] **Step 6: Crear controllers**

`apps/api/src/counterparties/counterparties.controller.ts`:
```typescript
import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { CounterpartiesService } from './counterparties.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';

@Controller('counterparties')
export class CounterpartiesController {
  constructor(private readonly counterpartiesService: CounterpartiesService) {}

  @Get()
  findAll() { return this.counterpartiesService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.counterpartiesService.findOne(id); }

  @Post()
  create(@Body() dto: CreateCounterpartyDto) { return this.counterpartiesService.create(dto); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCounterpartyDto>) {
    return this.counterpartiesService.update(id, dto);
  }
}
```

`apps/api/src/categories/categories.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(@Query('tree') tree?: string) {
    if (tree === 'true') return this.categoriesService.findTree();
    return this.categoriesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) { return this.categoriesService.create(dto); }
}
```

- [ ] **Step 7: Crear modules**

`apps/api/src/counterparties/counterparties.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CounterpartiesController } from './counterparties.controller';
import { CounterpartiesService } from './counterparties.service';

@Module({ controllers: [CounterpartiesController], providers: [CounterpartiesService], exports: [CounterpartiesService] })
export class CounterpartiesModule {}
```

`apps/api/src/categories/categories.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({ controllers: [CategoriesController], providers: [CategoriesService], exports: [CategoriesService] })
export class CategoriesModule {}
```

- [ ] **Step 8: Actualizar `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { AccountsModule } from './accounts/accounts.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    PrismaModule, HealthModule,
    CompaniesModule, AccountsModule,
    CounterpartiesModule, CategoriesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Verificar endpoints**

```bash
curl "http://localhost:3001/categories?tree=true"
```

Expected: array con categorías padre que tienen `children`.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/counterparties apps/api/src/categories apps/api/src/app.module.ts
git commit -m "feat: agregar CounterpartiesModule y CategoriesModule"
```

---

## Task 7: apps/api — DocumentsModule + TransactionsModule

**Files:**
- Create: `apps/api/src/documents/{documents.module,documents.controller,documents.service,documents.service.spec,dto/create-document.dto}.ts`
- Create: `apps/api/src/transactions/{transactions.module,transactions.controller,transactions.service,transactions.service.spec,dto/create-transaction.dto,dto/filter-transactions.dto}.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir tests que fallan**

Crear `apps/api/src/documents/documents.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockPrisma = {
    document: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByCompany filtra por companyId', async () => {
    mockPrisma.document.findMany.mockResolvedValue([]);
    await service.findByCompany('c1');
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 'c1' }) }),
    );
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    mockPrisma.document.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });
});
```

Crear `apps/api/src/transactions/transactions.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const mockPrisma = {
    transaction: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll sin filtros llama findMany sin where restrictions de tipo', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await service.findAll({});
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.not.objectContaining({ type: expect.anything() }) }),
    );
  });

  it('findAll con type filtra por type', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await service.findAll({ type: 'EXPENSE' });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: 'EXPENSE' }) }),
    );
  });

  it('findAll con dateFrom agrega gte a where.date', async () => {
    mockPrisma.transaction.findMany.mockResolvedValue([]);
    await service.findAll({ dateFrom: '2026-05-01' });
    expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: expect.objectContaining({ gte: new Date('2026-05-01') }) }),
      }),
    );
  });
});
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
pnpm --filter api test documents.service transactions.service
```

Expected: FAIL ambos.

- [ ] **Step 3: Crear DTOs**

`apps/api/src/documents/dto/create-document.dto.ts`:
```typescript
import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';
import { DocumentType, Currency } from '@aw-finanzas/database';

export class CreateDocumentDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  netAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ivaAmount?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSent?: boolean;
}
```

`apps/api/src/transactions/dto/create-transaction.dto.ts`:
```typescript
import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsPositive } from 'class-validator';
import { TransactionType, Currency } from '@aw-finanzas/database';

export class CreateTransactionDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsNumber()
  @IsPositive()
  amountCLP: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
```

`apps/api/src/transactions/dto/filter-transactions.dto.ts`:
```typescript
import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { TransactionType, TransactionStatus } from '@aw-finanzas/database';

export class FilterTransactionsDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
```

- [ ] **Step 4: Crear services**

`apps/api/src/documents/documents.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.document.findMany({ include: { counterparty: true } });
  }

  findByCompany(companyId: string) {
    return this.prisma.document.findMany({
      where: { companyId },
      include: { counterparty: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { counterparty: true, transactions: true },
    });
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    return doc;
  }

  create(dto: CreateDocumentDto) {
    return this.prisma.document.create({ data: dto });
  }
}
```

`apps/api/src/transactions/transactions.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: FilterTransactionsDto) {
    const { companyId, type, status, dateFrom, dateTo } = filters;
    return this.prisma.transaction.findMany({
      where: {
        ...(companyId && { companyId }),
        ...(type && { type }),
        ...(status && { status }),
        ...((dateFrom || dateTo) && {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }),
      },
      include: {
        allocations: true,
        counterparty: true,
        category: true,
        document: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { allocations: true, counterparty: true, category: true, document: true },
    });
    if (!tx) throw new NotFoundException(`Transacción ${id} no encontrada`);
    return tx;
  }

  create(dto: CreateTransactionDto) {
    return this.prisma.transaction.create({ data: dto });
  }

  markPaid(id: string) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
```

- [ ] **Step 5: Ejecutar tests — deben pasar**

```bash
pnpm --filter api test documents.service transactions.service
```

Expected: 5 tests passing.

- [ ] **Step 6: Crear controllers**

`apps/api/src/documents/documents.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    if (companyId) return this.documentsService.findByCompany(companyId);
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.documentsService.findOne(id); }

  @Post()
  create(@Body() dto: CreateDocumentDto) { return this.documentsService.create(dto); }
}
```

`apps/api/src/transactions/transactions.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@Query() filters: FilterTransactionsDto) {
    return this.transactionsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.transactionsService.findOne(id); }

  @Post()
  create(@Body() dto: CreateTransactionDto) { return this.transactionsService.create(dto); }

  @Patch(':id/paid')
  markPaid(@Param('id') id: string) { return this.transactionsService.markPaid(id); }
}
```

- [ ] **Step 7: Crear modules**

`apps/api/src/documents/documents.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({ controllers: [DocumentsController], providers: [DocumentsService], exports: [DocumentsService] })
export class DocumentsModule {}
```

`apps/api/src/transactions/transactions.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({ controllers: [TransactionsController], providers: [TransactionsService], exports: [TransactionsService] })
export class TransactionsModule {}
```

- [ ] **Step 8: Actualizar `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { AccountsModule } from './accounts/accounts.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { CategoriesModule } from './categories/categories.module';
import { DocumentsModule } from './documents/documents.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    PrismaModule, HealthModule,
    CompaniesModule, AccountsModule,
    CounterpartiesModule, CategoriesModule,
    DocumentsModule, TransactionsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Verificar endpoint con filtro**

```bash
curl "http://localhost:3001/transactions?type=EXPENSE"
```

Expected: array JSON (vacío hasta que se ejecute el importer).

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/documents apps/api/src/transactions apps/api/src/app.module.ts
git commit -m "feat: agregar DocumentsModule y TransactionsModule con filtros"
```

---

## Task 8: apps/api — OpportunitiesModule

**Files:**
- Create: `apps/api/src/opportunities/{opportunities.module,opportunities.controller,opportunities.service,opportunities.service.spec,dto/create-opportunity.dto}.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir test que falla**

Crear `apps/api/src/opportunities/opportunities.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;

  const mockPrisma = {
    opportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunitiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<OpportunitiesService>(OpportunitiesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findByCompany filtra por companyId', async () => {
    mockPrisma.opportunity.findMany.mockResolvedValue([]);
    await service.findByCompany('c1');
    expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 'c1' }) }),
    );
  });

  it('findOne lanza NotFoundException si no existe', async () => {
    mockPrisma.opportunity.findUnique.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
pnpm --filter api test opportunities.service
```

Expected: FAIL.

- [ ] **Step 3: Crear DTO**

`apps/api/src/opportunities/dto/create-opportunity.dto.ts`:
```typescript
import { IsString, IsEnum, IsNumber, IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';
import { OpportunityStage, Currency } from '@aw-finanzas/database';

export class CreateOpportunityDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(OpportunityStage)
  @IsOptional()
  stage?: OpportunityStage;

  @IsNumber()
  @Min(0)
  estimatedAmount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

- [ ] **Step 4: Crear service**

`apps/api/src/opportunities/opportunities.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityStage } from '@aw-finanzas/database';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.opportunity.findMany({ include: { company: true, counterparty: true } });
  }

  findByCompany(companyId: string) {
    return this.prisma.opportunity.findMany({
      where: { companyId },
      include: { counterparty: true },
      orderBy: { estimatedAmount: 'desc' },
    });
  }

  async findOne(id: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!opp) throw new NotFoundException(`Oportunidad ${id} no encontrada`);
    return opp;
  }

  create(dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({ data: dto });
  }

  updateStage(id: string, stage: OpportunityStage) {
    return this.prisma.opportunity.update({ where: { id }, data: { stage } });
  }
}
```

- [ ] **Step 5: Ejecutar test — debe pasar**

```bash
pnpm --filter api test opportunities.service
```

Expected: 2 tests passing.

- [ ] **Step 6: Crear controller y module**

`apps/api/src/opportunities/opportunities.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Param, Query, Patch } from '@nestjs/common';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityStage } from '@aw-finanzas/database';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    if (companyId) return this.opportunitiesService.findByCompany(companyId);
    return this.opportunitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.opportunitiesService.findOne(id); }

  @Post()
  create(@Body() dto: CreateOpportunityDto) { return this.opportunitiesService.create(dto); }

  @Patch(':id/stage')
  updateStage(@Param('id') id: string, @Body('stage') stage: OpportunityStage) {
    return this.opportunitiesService.updateStage(id, stage);
  }
}
```

`apps/api/src/opportunities/opportunities.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller';
import { OpportunitiesService } from './opportunities.service';

@Module({ controllers: [OpportunitiesController], providers: [OpportunitiesService], exports: [OpportunitiesService] })
export class OpportunitiesModule {}
```

- [ ] **Step 7: Actualizar `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { AccountsModule } from './accounts/accounts.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { CategoriesModule } from './categories/categories.module';
import { DocumentsModule } from './documents/documents.module';
import { TransactionsModule } from './transactions/transactions.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';

@Module({
  imports: [
    PrismaModule, HealthModule,
    CompaniesModule, AccountsModule,
    CounterpartiesModule, CategoriesModule,
    DocumentsModule, TransactionsModule,
    OpportunitiesModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/opportunities apps/api/src/app.module.ts
git commit -m "feat: agregar OpportunitiesModule"
```

---

## Task 9: apps/api — ImportersModule (Sheet Importer)

Esta es la tarea más crítica. La lógica core vive en `packages/database` para poder ejecutarse desde CLI y desde HTTP.

**Files:**
- Create: `packages/database/src/importers/sheet-importer.ts`
- Create: `packages/database/src/importers/sheet-importer.test.ts`
- Create: `packages/database/scripts/import-sheet.ts`
- Create: `apps/api/src/importers/dto/sheet-import.dto.ts`
- Create: `apps/api/src/importers/importers.service.ts`
- Create: `apps/api/src/importers/importers.service.spec.ts`
- Create: `apps/api/src/importers/importers.controller.ts`
- Create: `apps/api/src/importers/importers.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir test del importer core — debe fallar**

Crear `packages/database/src/importers/sheet-importer.test.ts`:

```typescript
import { importFromSheet, SheetImportData } from './sheet-importer';

const makeData = (overrides: Partial<SheetImportData> = {}): SheetImportData => ({
  month: '2026-05',
  payments: [],
  invoices: [],
  visa: [],
  opportunities: [],
  exchangeRate: { USD_CLP: 1041 },
  ...overrides,
});

const makeMockPrisma = () => ({
  $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(makeMockTx())),
  company: { findMany: jest.fn().mockResolvedValue([
    { id: 'aw-id', shortCode: 'AW', name: 'AplicacionesWeb' },
    { id: 'expro-id', shortCode: 'EXPRO', name: 'Expande PRO' },
  ])},
  category: { findMany: jest.fn().mockResolvedValue([]) },
});

const makeMockTx = () => ({
  transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
  transactionAllocation: { create: jest.fn().mockResolvedValue({}) },
  document: { create: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
  opportunity: { create: jest.fn().mockResolvedValue({}) },
  counterparty: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'cp-1' }),
    upsert: jest.fn().mockResolvedValue({ id: 'cp-1' }),
  },
});

describe('importFromSheet', () => {
  it('crea una transaction EXPENSE por cada payment', async () => {
    const tx = makeMockTx();
    const mockPrisma = {
      ...makeMockPrisma(),
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(tx)),
    };

    const data = makeData({
      payments: [
        { item: 'IVA + PPM', amount: 188351, paid: false, comment: '', company: 'EXPRO' },
        { item: 'Cuota Fogape', amount: 531500, paid: false, comment: '', company: 'AW' },
      ],
    });

    const result = await importFromSheet(data, mockPrisma as any);

    expect(tx.transaction.create).toHaveBeenCalledTimes(2);
    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'EXPENSE', amount: 188351 }) }),
    );
    expect(result.payments).toBe(2);
  });

  it('divide allocations 50/50 para pago multi-empresa', async () => {
    const tx = makeMockTx();
    const mockPrisma = {
      ...makeMockPrisma(),
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(tx)),
    };

    const data = makeData({
      payments: [
        { item: 'Sueldo Juan', amount: 3500000, paid: false, comment: '', company: 'EXPRO,AW' },
      ],
    });

    await importFromSheet(data, mockPrisma as any);

    expect(tx.transactionAllocation.create).toHaveBeenCalledTimes(2);
    expect(tx.transactionAllocation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ percentage: 50, amountCLP: 1750000 }) }),
    );
  });

  it('convierte USD a CLP para items visa', async () => {
    const tx = makeMockTx();
    const mockPrisma = {
      ...makeMockPrisma(),
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(tx)),
    };

    const data = makeData({
      visa: [{ item: 'Claude', amountCLP: null, amountUSD: 100 }],
      exchangeRate: { USD_CLP: 1041 },
    });

    await importFromSheet(data, mockPrisma as any);

    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 100, currency: 'USD', amountCLP: 104100 }),
      }),
    );
  });

  it('retorna conteos correctos', async () => {
    const tx = makeMockTx();
    const mockPrisma = {
      ...makeMockPrisma(),
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(tx)),
    };

    const data = makeData({
      payments: [{ item: 'F29', amount: 100, paid: true, comment: '', company: 'AW' }],
      invoices: [{ rut: '76.000.000-0', number: '1', type: 'AFECTA', counterparty: 'Test SA',
        service: 'Test', net: 100, iva: 19, total: 119, sent: true, paidAt: null }],
      visa: [{ item: 'Canva', amountCLP: 9200, amountUSD: null }],
      opportunities: [{ name: 'Test Opp', amount: 1000000, company: 'AW' }],
    });

    const result = await importFromSheet(data, mockPrisma as any);

    expect(result).toEqual({ payments: 1, invoices: 1, visa: 1, opportunities: 1 });
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
pnpm --filter @aw-finanzas/database test
```

Expected: FAIL — `Cannot find module './sheet-importer'`.

- [ ] **Step 3: Crear `packages/database/src/importers/sheet-importer.ts`**

```typescript
import { PrismaClient, Prisma, TransactionSource } from '@prisma/client';
import { endOfMonth, startOfMonth, parseISO } from 'date-fns';

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
  type: 'AFECTA' | 'EXENTA';
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

export async function importFromSheet(
  data: SheetImportData,
  prisma: PrismaClient,
): Promise<{ payments: number; invoices: number; visa: number; opportunities: number }> {
  const companies = await prisma.company.findMany();
  const companiesMap = Object.fromEntries(companies.map((c) => [c.shortCode, c]));

  const categories = await prisma.category.findMany();
  const categoriesMap = Object.fromEntries(categories.map((c) => [c.name, c]));

  const monthDate = parseISO(`${data.month}-01`);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  let paymentCount = 0;
  let invoiceCount = 0;
  let visaCount = 0;
  let opportunityCount = 0;

  const awCompany = companiesMap['AW'];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. PAYMENTS → Transactions (EXPENSE)
    for (const p of data.payments) {
      const codes = p.company.split(',').map((c) => c.trim());
      const primary = companiesMap[codes[0]];
      if (!primary) {
        console.warn(`⚠️  Empresa no encontrada: ${codes[0]}`);
        continue;
      }

      const catName = ITEM_TO_CATEGORY[p.item];
      const category = catName ? categoriesMap[catName] : undefined;

      const transaction = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          status: p.paid ? 'PAID' : 'PENDING',
          source: TransactionSource.SHEET_IMPORT,
          amount: p.amount,
          amountCLP: p.amount,
          currency: 'CLP',
          date: monthEnd,
          description: p.item,
          comment: p.comment || null,
          companyId: primary.id,
          categoryId: category?.id ?? null,
        },
      });

      const pct = 100 / codes.length;
      for (const code of codes) {
        const co = companiesMap[code];
        if (!co) continue;
        await tx.transactionAllocation.create({
          data: {
            transactionId: transaction.id,
            companyId: co.id,
            percentage: pct,
            amountCLP: (p.amount * pct) / 100,
          },
        });
      }

      paymentCount++;
    }

    // 2. INVOICES → Document + Transaction (INCOME)
    if (!awCompany) throw new Error('Empresa AW no encontrada — ejecutar seed primero');

    for (const inv of data.invoices) {
      const cp = await upsertCounterparty(tx, inv.rut, inv.counterparty);

      const doc = await tx.document.create({
        data: {
          companyId: awCompany.id,
          counterpartyId: cp.id,
          type: inv.type,
          number: inv.number || null,
          netAmount: inv.net,
          ivaAmount: inv.iva,
          totalAmount: inv.total,
          currency: 'CLP',
          description: inv.service || null,
          isSent: inv.sent,
        },
      });

      const incTx = await tx.transaction.create({
        data: {
          type: 'INCOME',
          status: inv.paidAt ? 'PAID' : 'PENDING',
          source: TransactionSource.SHEET_IMPORT,
          amount: inv.total,
          amountCLP: inv.total,
          currency: 'CLP',
          date: monthStart,
          paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
          description: `Factura ${inv.number || 'S/N'} - ${inv.counterparty}`,
          companyId: awCompany.id,
          counterpartyId: cp.id,
          documentId: doc.id,
        },
      });

      await tx.transactionAllocation.create({
        data: {
          transactionId: incTx.id,
          companyId: awCompany.id,
          percentage: 100,
          amountCLP: inv.total,
        },
      });

      invoiceCount++;
    }

    // 3. VISA → Transactions (EXPENSE)
    for (const v of data.visa) {
      const isUSD = v.amountUSD !== null;
      const amount = isUSD ? v.amountUSD! : v.amountCLP!;
      const amountCLP = isUSD ? v.amountUSD! * data.exchangeRate.USD_CLP : v.amountCLP!;

      const catName = ITEM_TO_CATEGORY[v.item];
      const category = catName ? categoriesMap[catName] : undefined;

      await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          status: 'PAID',
          source: TransactionSource.SHEET_IMPORT,
          amount,
          currency: isUSD ? 'USD' : 'CLP',
          exchangeRate: isUSD ? data.exchangeRate.USD_CLP : null,
          amountCLP,
          date: monthStart,
          description: v.item,
          companyId: awCompany.id,
          categoryId: category?.id ?? null,
        },
      });

      visaCount++;
    }

    // 4. OPPORTUNITIES
    for (const o of data.opportunities) {
      const co = companiesMap[o.company];
      if (!co) {
        console.warn(`⚠️  Empresa no encontrada para oportunidad: ${o.company}`);
        continue;
      }

      await tx.opportunity.create({
        data: {
          name: o.name,
          estimatedAmount: o.amount,
          currency: 'CLP',
          stage: 'PROPOSAL_SENT',
          probability: 50,
          companyId: co.id,
        },
      });

      opportunityCount++;
    }
  });

  console.log(`✅ Importación completada: ${paymentCount} pagos, ${invoiceCount} facturas, ${visaCount} visa, ${opportunityCount} oportunidades`);

  return { payments: paymentCount, invoices: invoiceCount, visa: visaCount, opportunities: opportunityCount };
}

async function upsertCounterparty(
  tx: Prisma.TransactionClient,
  rut: string,
  name: string,
) {
  if (rut) {
    return tx.counterparty.upsert({
      where: { rut },
      update: { name },
      create: { type: 'CUSTOMER', name, rut },
    });
  }

  const existing = await tx.counterparty.findFirst({ where: { name } });
  if (existing) return existing;

  return tx.counterparty.create({ data: { type: 'CUSTOMER', name } });
}
```

- [ ] **Step 4: Ejecutar tests del importer — deben pasar**

```bash
pnpm --filter @aw-finanzas/database test
```

Expected: 4 tests passing.

- [ ] **Step 5: Crear `packages/database/scripts/import-sheet.ts`**

```typescript
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
```

- [ ] **Step 6: Crear DTO para el endpoint HTTP**

`apps/api/src/importers/dto/sheet-import.dto.ts`:
```typescript
import { Type } from 'class-transformer';
import {
  IsString, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsObject,
} from 'class-validator';

export class PaymentDto {
  @IsString() item: string;
  @IsNumber() amount: number;
  @IsBoolean() paid: boolean;
  @IsString() comment: string;
  @IsString() company: string;
}

export class InvoiceDto {
  @IsString() rut: string;
  @IsString() number: string;
  @IsString() type: string;
  @IsString() counterparty: string;
  @IsString() service: string;
  @IsNumber() net: number;
  @IsNumber() iva: number;
  @IsNumber() total: number;
  @IsBoolean() sent: boolean;
  @IsOptional() @IsString() paidAt: string | null;
}

export class VisaItemDto {
  @IsString() item: string;
  @IsOptional() @IsNumber() amountCLP: number | null;
  @IsOptional() @IsNumber() amountUSD: number | null;
}

export class OpportunityImportDto {
  @IsString() name: string;
  @IsNumber() amount: number;
  @IsString() company: string;
}

export class SheetImportDto {
  @IsString() month: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceDto)
  invoices: InvoiceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisaItemDto)
  visa: VisaItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpportunityImportDto)
  opportunities: OpportunityImportDto[];

  @IsObject()
  exchangeRate: { USD_CLP: number };
}
```

- [ ] **Step 7: Crear `apps/api/src/importers/importers.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { importFromSheet } from '@aw-finanzas/database/importers/sheet-importer';
import { SheetImportDto } from './dto/sheet-import.dto';

@Injectable()
export class ImportersService {
  constructor(private readonly prisma: PrismaService) {}

  async importSheet(dto: SheetImportDto) {
    return importFromSheet(dto, this.prisma as any);
  }
}
```

- [ ] **Step 8: Escribir test del ImportersService**

Crear `apps/api/src/importers/importers.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ImportersService } from './importers.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('@aw-finanzas/database/importers/sheet-importer', () => ({
  importFromSheet: jest.fn().mockResolvedValue({ payments: 2, invoices: 1, visa: 1, opportunities: 1 }),
}));

describe('ImportersService', () => {
  let service: ImportersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportersService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = module.get<ImportersService>(ImportersService);
  });

  it('delega a importFromSheet y retorna resultado', async () => {
    const dto: any = { month: '2026-05', payments: [], invoices: [], visa: [], opportunities: [], exchangeRate: { USD_CLP: 1041 } };
    const result = await service.importSheet(dto);
    expect(result).toEqual({ payments: 2, invoices: 1, visa: 1, opportunities: 1 });
  });
});
```

- [ ] **Step 9: Crear controller y module**

`apps/api/src/importers/importers.controller.ts`:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ImportersService } from './importers.service';
import { SheetImportDto } from './dto/sheet-import.dto';

@Controller('importers')
export class ImportersController {
  constructor(private readonly importersService: ImportersService) {}

  @Post('sheet')
  importSheet(@Body() dto: SheetImportDto) {
    return this.importersService.importSheet(dto);
  }
}
```

`apps/api/src/importers/importers.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ImportersController } from './importers.controller';
import { ImportersService } from './importers.service';

@Module({ controllers: [ImportersController], providers: [ImportersService] })
export class ImportersModule {}
```

- [ ] **Step 10: Actualizar `apps/api/src/app.module.ts` (versión final)**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { AccountsModule } from './accounts/accounts.module';
import { CounterpartiesModule } from './counterparties/counterparties.module';
import { CategoriesModule } from './categories/categories.module';
import { DocumentsModule } from './documents/documents.module';
import { TransactionsModule } from './transactions/transactions.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { ImportersModule } from './importers/importers.module';

@Module({
  imports: [
    PrismaModule, HealthModule,
    CompaniesModule, AccountsModule,
    CounterpartiesModule, CategoriesModule,
    DocumentsModule, TransactionsModule,
    OpportunitiesModule, ImportersModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 11: Ejecutar todos los tests del API**

```bash
pnpm --filter api test
```

Expected: todos los spec pasan.

- [ ] **Step 12: Commit**

```bash
git add packages/database/src/importers packages/database/scripts apps/api/src/importers apps/api/src/app.module.ts
git commit -m "feat: agregar ImportersModule y sheet-importer core en packages/database"
```

---

## Task 10: apps/web — Next.js + shadcn placeholder

**Files:**
- Create: `apps/web/` (via `create-next-app`)
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/transactions/page.tsx`
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/.env.local`

- [ ] **Step 1: Crear Next.js app**

```bash
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --no-src-dir --no-turbo
```

Si pregunta algo, aceptar defaults (Enter).

- [ ] **Step 2: Instalar shadcn/ui**

```bash
cd apps/web && npx shadcn@latest init
```

Cuando pregunte: estilo **New York**, color **Slate**, CSS variables **sí**.

- [ ] **Step 3: Instalar componentes shadcn base**

```bash
cd apps/web && npx shadcn@latest add button card input label table tabs toast dialog
```

- [ ] **Step 4: Crear `apps/web/.env.local`**

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 5: Crear `apps/web/lib/api.ts`**

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
```

- [ ] **Step 6: Reemplazar `apps/web/app/page.tsx`**

```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50">
      <h1 className="text-4xl font-bold text-slate-900 mb-2">aw-finanzas</h1>
      <p className="text-slate-500 mb-1">AplicacionesWeb · Expande PRO</p>
      <p className="text-slate-400 text-sm mb-8">Sistema de gestión financiera multi-empresa</p>
      <Link
        href="/transactions"
        className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700 transition-colors"
      >
        Ver Transacciones →
      </Link>
    </main>
  );
}
```

- [ ] **Step 7: Crear `apps/web/app/transactions/page.tsx`**

```tsx
export default function TransactionsPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold text-slate-400">Próximamente — Phase 1</h1>
      <p className="text-slate-300 mt-2 text-sm">Dashboard, CxC/CxP y formularios</p>
    </main>
  );
}
```

- [ ] **Step 8: Verificar que web compila y corre**

```bash
pnpm --filter web dev &
sleep 5
curl -s http://localhost:3000 | grep -o 'aw-finanzas'
```

Expected: `aw-finanzas`

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat: agregar apps/web con Next.js 14, shadcn/ui y placeholder"
```

---

## Task 11: data/sheet-mayo-2026.json + CLI import + validación E2E

**Files:**
- Create: `data/sheet-mayo-2026.json`

- [ ] **Step 1: Crear `data/sheet-mayo-2026.json`**

Crear el directorio y archivo:
```bash
mkdir -p data
```

Crear `data/sheet-mayo-2026.json` con el siguiente contenido exacto:

```json
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

- [ ] **Step 2: Ejecutar CLI import**

```bash
pnpm db:import-sheet data/sheet-mayo-2026.json
```

Expected: `✅ Importación completada: 14 pagos, 14 facturas, 5 visa, 4 oportunidades`

- [ ] **Step 3: Verificar conteos en DB**

```bash
curl -s "http://localhost:3001/transactions?type=EXPENSE" | node -e "const d=[]; process.stdin.on('data',c=>d.push(c)); process.stdin.on('end',()=>{ const r=JSON.parse(Buffer.concat(d)); console.log('EXPENSE:', r.length) })"
curl -s "http://localhost:3001/transactions?type=INCOME" | node -e "const d=[]; process.stdin.on('data',c=>d.push(c)); process.stdin.on('end',()=>{ const r=JSON.parse(Buffer.concat(d)); console.log('INCOME:', r.length) })"
curl -s "http://localhost:3001/opportunities" | node -e "const d=[]; process.stdin.on('data',c=>d.push(c)); process.stdin.on('end',()=>{ const r=JSON.parse(Buffer.concat(d)); console.log('Opportunities:', r.length) })"
```

Expected:
- `EXPENSE: 19` (14 payments + 5 visa)
- `INCOME: 14`
- `Opportunities: 4`

- [ ] **Step 4: Verificar allocations para multi-empresa**

```bash
curl -s "http://localhost:3001/transactions" | node -e "
const d=[]; process.stdin.on('data',c=>d.push(c));
process.stdin.on('end',()=>{
  const r=JSON.parse(Buffer.concat(d));
  const multiAlloc = r.filter(t => t.allocations && t.allocations.length > 1);
  console.log('Transactions con múltiples allocations:', multiAlloc.length);
  console.log('(deben ser 3: Luis Farías, Sueldo Juan x2)');
})"
```

Expected: `Transactions con múltiples allocations: 3`

- [ ] **Step 5: Commit**

```bash
git add data/
git commit -m "chore: agregar data/sheet-mayo-2026.json para importación inicial"
```

---

## Task 12: README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Crear `README.md`**

```markdown
# aw-finanzas

Sistema de gestión financiera multi-empresa para AplicacionesWeb y Expande PRO.

## Requisitos

- Node.js 20 LTS
- pnpm
- Docker

## Setup en 5 pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar PostgreSQL
docker-compose up -d

# 3. Aplicar migraciones y generar cliente Prisma
pnpm db:migrate

# 4. Cargar categorías, empresas y cuentas iniciales
pnpm db:seed

# 5. Levantar API y web
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000
- Health: http://localhost:3001/health

## Importar datos del Google Sheet

```bash
pnpm db:import-sheet data/sheet-mayo-2026.json
```

## Estructura

```
apps/api/     NestJS API (puerto 3001)
apps/web/     Next.js web (puerto 3000)
packages/database/   Prisma schema + seed + importer core
packages/shared/     Zod schemas compartidos
data/         JSONs de importación mensual
```

## Endpoints principales

| Endpoint | Descripción |
|---|---|
| `GET /health` | Estado del servidor y DB |
| `GET /companies` | Empresas (AW, EXPRO) |
| `GET /categories?tree=true` | Categorías jerárquicas |
| `GET /transactions?type=EXPENSE&companyId=X` | Transacciones filtradas |
| `PATCH /transactions/:id/paid` | Marcar transacción como pagada |
| `GET /opportunities` | Pipeline de oportunidades |
| `POST /importers/sheet` | Importar JSON del Google Sheet |

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar valores.

## Roadmap

- **Phase 0** ✅ Monorepo, API, web placeholder, importer
- **Phase 1** Dashboard mensual, CxC/CxP, formularios
- **Phase 2** Importer cartolas bancarias CSV, categorización automática
- **Phase 3** Auth multi-usuario, deploy AWS Lightsail, integración SII
- **Phase 4** Integración bidireccional ExpandERP
```

- [ ] **Step 2: Commit final**

```bash
git add README.md
git commit -m "docs: agregar README con setup y documentación de endpoints"
```

---

## Self-Review

### Cobertura del spec

| Requisito Phase 0 | Task que lo implementa |
|---|---|
| Estructura monorepo (apps/api, apps/web, packages/database) | Task 1 |
| NestJS API booteando con health endpoint | Task 4 |
| Next.js web booteando con página de inicio | Task 10 |
| Prisma schema completo aplicado a PostgreSQL local (Docker) | Task 2 |
| Seed con 2 empresas + categorías base + cuentas tipo | Task 2 |
| Importer del Google Sheet cargando datos reales | Tasks 9, 11 |
| README con instrucciones de setup | Task 12 |
| CompaniesModule, CounterpartiesModule, etc. | Tasks 5, 6, 7, 8 |

### Verificación de tipos

- `importFromSheet` acepta `PrismaClient` → `PrismaService extends PrismaClient` ✓
- `TransactionSource.SHEET_IMPORT` importado de `@prisma/client` ✓
- `Prisma.TransactionClient` usado para el callback de `$transaction` ✓
- DTOs en NestJS usan `class-validator`; zod schemas en `packages/shared` son independientes ✓

### Gaps detectados

- `pnpm-workspace.yaml` + `package.json` root se crean en Task 1 pero `pnpm install` root no se ejecuta. Agregar `pnpm install` al final de Task 1 antes del commit. ✓ (Step 9 asume Docker; developer debe ejecutar `pnpm install` primero)
- El path `@aw-finanzas/database/importers/sheet-importer` requiere que `packages/database/package.json` declare ese export. Agregar a `packages/database/package.json`:
  ```json
  "exports": {
    ".": "./src/index.ts",
    "./importers/sheet-importer": "./src/importers/sheet-importer.ts"
  }
  ```
  Esto se debe agregar en Task 2, Step 1.

---

**Plan guardado en `docs/superpowers/plans/2026-05-08-phase-0-scaffold.md`.**

**Dos opciones de ejecución:**

**1. Subagent-Driven (recomendado)** — subagente por task, revisión entre tasks, iteración rápida

**2. Inline Execution** — ejecutar en esta sesión con superpowers:executing-plans, ejecución por lotes con checkpoints

**¿Cuál prefieres?**
