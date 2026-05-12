# Mejoras Transacciones y Documentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar documentos N:M a transacciones, normalización de RUT, tabla de transacciones mejorada con saldo/estado/docs, bitácora de notas, y BankStatement como entidad.

**Architecture:** Schema-first: migration → API modules → frontend. La utilidad RUT ya existe en `packages/shared/src/validators/rut.validator.ts` — solo agregar `areRutsEqual`. `TransactionDocument` y `TransactionNote` son módulos NestJS independientes. El frontend calcula saldo acumulado en cliente.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL 16, Next.js 14 App Router, React Query, shadcn/ui, Tailwind 3, Vitest/Jest

---

## Mapa de archivos

| Archivo | Acción |
|---|---|
| `packages/database/prisma/schema.prisma` | Modificar: add TransactionDocument, TransactionNote, BankStatement, REJECTED enum, bankStatementId |
| `packages/shared/src/validators/rut.validator.ts` | Modificar: add areRutsEqual export |
| `packages/shared/src/__tests__/rut.validator.test.ts` | Crear: tests areRutsEqual + cobertura completa |
| `packages/database/prisma/scripts/normalize-ruts.ts` | Crear: script one-shot migración datos |
| `apps/api/src/transaction-documents/transaction-documents.module.ts` | Crear |
| `apps/api/src/transaction-documents/transaction-documents.service.ts` | Crear |
| `apps/api/src/transaction-documents/transaction-documents.controller.ts` | Crear |
| `apps/api/src/transaction-documents/transaction-documents.service.spec.ts` | Crear |
| `apps/api/src/transaction-notes/transaction-notes.module.ts` | Crear |
| `apps/api/src/transaction-notes/transaction-notes.service.ts` | Crear |
| `apps/api/src/transaction-notes/transaction-notes.controller.ts` | Crear |
| `apps/api/src/transaction-notes/transaction-notes.service.spec.ts` | Crear |
| `apps/api/src/transactions/transactions.service.ts` | Modificar: drop document include, add documents/notes includes, add updateStatus |
| `apps/api/src/transactions/transactions.controller.ts` | Modificar: add PATCH /:id/status |
| `apps/api/src/transactions/dto/update-transaction.dto.ts` | Modificar: add status field |
| `apps/api/src/counterparties/counterparties.service.ts` | Modificar: normalizeRut on create/update |
| `apps/api/src/importers/importers.service.ts` | Modificar: BankStatement registro, normalizeRut en upsert |
| `apps/api/src/app.module.ts` | Modificar: register 2 new modules |
| `apps/web/lib/types.ts` | Modificar: Transaction type (REJECTED, documents[], notes[]) |
| `apps/web/lib/api.ts` | Modificar: add linkDocument, unlinkDocument, addNote, updateStatus calls |
| `apps/web/lib/queries.ts` | Modificar: add mutations for new endpoints |
| `apps/web/lib/balance.ts` | Crear: calculateRunningBalance utility |
| `apps/web/lib/balance.test.ts` | Crear: tests |
| `apps/web/app/(app)/transactions/page.tsx` | Modificar: new columns, saldo, status popover, remove max-w-5xl |
| `apps/web/components/transactions/ReviewDrawer.tsx` | Modificar: add documents section + bitácora |

---

## Task 1: Schema migration

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Actualizar schema.prisma**

Agregar al final del archivo, antes del último modelo:

```prisma
model TransactionDocument {
  id            String   @id @default(cuid())
  transactionId String
  documentId    String
  note          String?
  linkedAt      DateTime @default(now())

  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  document      Document    @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([transactionId, documentId])
  @@map("transaction_documents")
}

model TransactionNote {
  id            String   @id @default(cuid())
  transactionId String
  content       String
  createdAt     DateTime @default(now())

  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId])
  @@map("transaction_notes")
}

model BankStatement {
  id         String   @id @default(cuid())
  companyId  String
  accountId  String?
  filename   String
  month      String
  importedAt DateTime @default(now())
  rowCount   Int      @default(0)

  company      Company       @relation(fields: [companyId], references: [id])
  account      Account?      @relation(fields: [accountId], references: [id])
  transactions Transaction[]

  @@map("bank_statements")
}
```

- [ ] **Step 2: Modificar enum TransactionStatus**

Reemplazar en schema.prisma:
```prisma
enum TransactionStatus {
  PENDING
  PAID
  RECONCILED
  REJECTED
  CANCELLED
}
```

- [ ] **Step 3: Modificar modelo Transaction**

Reemplazar la línea `documentId      String?` por `bankStatementId String?`

Agregar en la sección de relaciones del modelo Transaction:
```prisma
  bankStatement   BankStatement?      @relation(fields: [bankStatementId], references: [id])
  documents       TransactionDocument[]
  notes           TransactionNote[]
```

Quitar la línea:
```prisma
  document        Document?           @relation(fields: [documentId], references: [id])
```

- [ ] **Step 4: Modificar modelo Document**

Reemplazar `transactions    Transaction[]` por:
```prisma
  transactionLinks TransactionDocument[]
```

- [ ] **Step 5: Agregar relaciones BankStatement a Company y Account**

En modelo Company, agregar:
```prisma
  bankStatements  BankStatement[]
```

En modelo Account, agregar:
```prisma
  bankStatements  BankStatement[]
```

- [ ] **Step 6: Correr migración**

```bash
cd /path/to/project
pnpm --filter @aw-finanzas/database prisma migrate dev --name transaction_documents_notes_bankstatement
```

Esperado: migración creada y aplicada sin errores. Si hay error por `documentId` FK existente, la migración incluirá el DROP automáticamente.

- [ ] **Step 7: Generar cliente Prisma**

```bash
pnpm --filter @aw-finanzas/database prisma generate
```

- [ ] **Step 8: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(schema): TransactionDocument N:M, TransactionNote, BankStatement, REJECTED status"
```

---

## Task 2: RUT utility — agregar areRutsEqual

**Files:**
- Modify: `packages/shared/src/validators/rut.validator.ts`
- Create: `packages/shared/src/__tests__/rut.validator.test.ts`

- [ ] **Step 1: Escribir los tests primero**

```typescript
// packages/shared/src/__tests__/rut.validator.test.ts
import { normalizeRut, formatRut, isValidRut, areRutsEqual } from '../validators/rut.validator';

describe('normalizeRut', () => {
  it('strips dots', () => expect(normalizeRut('11.111.111-1')).toBe('111111111'));
  it('strips hyphens', () => expect(normalizeRut('11111111-1')).toBe('111111111'));
  it('strips spaces', () => expect(normalizeRut(' 11111111-1 ')).toBe('111111111'));
  it('uppercases DV k', () => expect(normalizeRut('12345678-k')).toBe('12345678K'));
  it('handles no formatting', () => expect(normalizeRut('111111111')).toBe('111111111'));
});

describe('formatRut', () => {
  it('formats 8-digit RUT', () => expect(formatRut('76354771K')).toBe('76.354.771-K'));
  it('is idempotent on already formatted', () => expect(formatRut('11.111.111-1')).toBe('11.111.111-1'));
  it('formats from raw digits', () => expect(formatRut('111111111')).toBe('11.111.111-1'));
});

describe('areRutsEqual', () => {
  it('matches with vs without dots', () => expect(areRutsEqual('11.111.111-1', '11111111-1')).toBe(true));
  it('matches formatted vs raw', () => expect(areRutsEqual('11.111.111-1', '111111111')).toBe(true));
  it('rejects different RUTs', () => expect(areRutsEqual('11111111-1', '22222222-2')).toBe(false));
  it('case insensitive on DV', () => expect(areRutsEqual('12345678-k', '12345678-K')).toBe(true));
});

describe('isValidRut', () => {
  it('accepts valid formatted RUT', () => expect(isValidRut('76.354.771-K')).toBe(true));
  it('accepts valid raw RUT', () => expect(isValidRut('76354771K')).toBe(true));
  it('rejects invalid DV', () => expect(isValidRut('11111111-9')).toBe(false));
  it('rejects non-string', () => expect(isValidRut(123)).toBe(false));
});
```

- [ ] **Step 2: Correr tests — deben fallar en areRutsEqual**

```bash
pnpm --filter @aw-finanzas/shared test
```

Esperado: error `areRutsEqual is not a function`

- [ ] **Step 3: Agregar areRutsEqual a rut.validator.ts**

Agregar después de la función `isValidRut`:

```typescript
/**
 * Compara dos RUTs independiente del formato (con/sin puntos, con/sin guión).
 */
export function areRutsEqual(a: string, b: string): boolean {
  return normalizeRut(a) === normalizeRut(b);
}
```

- [ ] **Step 4: Correr tests — deben pasar**

```bash
pnpm --filter @aw-finanzas/shared test
```

Esperado: all tests pass

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/validators/rut.validator.ts packages/shared/src/__tests__/rut.validator.test.ts
git commit -m "feat(shared): agregar areRutsEqual a utilidad RUT con tests"
```

---

## Task 3: Migración de datos — normalizar RUTs existentes

**Files:**
- Create: `packages/database/prisma/scripts/normalize-ruts.ts`

- [ ] **Step 1: Crear script**

```typescript
// packages/database/prisma/scripts/normalize-ruts.ts
import { PrismaClient } from '@prisma/client';
import { normalizeRut } from '@aw-finanzas/shared';

const prisma = new PrismaClient();

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
      conflicts.push(`  CONFLICTO: id=${cp.id} rut="${cp.rut}" → "${normalized}" ya existe en id=${conflict.id}`);
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
```

- [ ] **Step 2: Ejecutar script**

```bash
pnpm --filter @aw-finanzas/database tsx prisma/scripts/normalize-ruts.ts
```

Esperado: reporte de cuántos se actualizaron. Si hay conflictos, resolverlos manualmente en `/contrapartes` antes de continuar.

- [ ] **Step 3: Commit**

```bash
git add packages/database/prisma/scripts/normalize-ruts.ts
git commit -m "chore(db): script normalización RUTs existentes"
```

---

## Task 4: API — TransactionDocument module

**Files:**
- Create: `apps/api/src/transaction-documents/transaction-documents.module.ts`
- Create: `apps/api/src/transaction-documents/transaction-documents.service.ts`
- Create: `apps/api/src/transaction-documents/transaction-documents.controller.ts`
- Create: `apps/api/src/transaction-documents/transaction-documents.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir tests primero**

```typescript
// apps/api/src/transaction-documents/transaction-documents.service.spec.ts
import { Test } from '@nestjs/testing';
import { TransactionDocumentsService } from './transaction-documents.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  transactionDocument: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('TransactionDocumentsService', () => {
  let service: TransactionDocumentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionDocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TransactionDocumentsService);
    jest.clearAllMocks();
  });

  it('links document to transaction', async () => {
    mockPrisma.transactionDocument.create.mockResolvedValue({
      id: '1', transactionId: 'tx1', documentId: 'doc1',
    });
    const result = await service.link('tx1', 'doc1');
    expect(mockPrisma.transactionDocument.create).toHaveBeenCalledWith({
      data: { transactionId: 'tx1', documentId: 'doc1' },
      include: { document: true },
    });
    expect(result.transactionId).toBe('tx1');
  });

  it('returns links for a transaction', async () => {
    mockPrisma.transactionDocument.findMany.mockResolvedValue([
      { id: '1', transactionId: 'tx1', documentId: 'doc1' },
    ]);
    const result = await service.findByTransaction('tx1');
    expect(result).toHaveLength(1);
  });

  it('unlinks document', async () => {
    mockPrisma.transactionDocument.delete.mockResolvedValue({ id: '1' });
    await service.unlink('1');
    expect(mockPrisma.transactionDocument.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
pnpm --filter api test transaction-documents
```

Esperado: error `Cannot find module`

- [ ] **Step 3: Crear service**

```typescript
// apps/api/src/transaction-documents/transaction-documents.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  link(transactionId: string, documentId: string, note?: string) {
    return this.prisma.transactionDocument.create({
      data: { transactionId, documentId, ...(note && { note }) },
      include: { document: true },
    });
  }

  findByTransaction(transactionId: string) {
    return this.prisma.transactionDocument.findMany({
      where: { transactionId },
      include: { document: { include: { counterparty: true } } },
      orderBy: { linkedAt: 'asc' },
    });
  }

  unlink(id: string) {
    return this.prisma.transactionDocument.delete({ where: { id } });
  }
}
```

- [ ] **Step 4: Crear controller**

```typescript
// apps/api/src/transaction-documents/transaction-documents.controller.ts
import { Controller, Post, Delete, Get, Body, Param } from '@nestjs/common';
import { TransactionDocumentsService } from './transaction-documents.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('transaction-documents')
export class TransactionDocumentsController {
  constructor(private readonly service: TransactionDocumentsService) {}

  @Post()
  link(@Body() body: { transactionId: string; documentId: string; note?: string }) {
    return this.service.link(body.transactionId, body.documentId, body.note);
  }

  @Get('by-transaction/:transactionId')
  findByTransaction(@Param('transactionId') transactionId: string) {
    return this.service.findByTransaction(transactionId);
  }

  @Delete(':id')
  unlink(@Param('id') id: string) {
    return this.service.unlink(id);
  }
}
```

- [ ] **Step 5: Crear module**

```typescript
// apps/api/src/transaction-documents/transaction-documents.module.ts
import { Module } from '@nestjs/common';
import { TransactionDocumentsService } from './transaction-documents.service';
import { TransactionDocumentsController } from './transaction-documents.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionDocumentsController],
  providers: [TransactionDocumentsService],
  exports: [TransactionDocumentsService],
})
export class TransactionDocumentsModule {}
```

- [ ] **Step 6: Registrar en app.module.ts**

Agregar import en `apps/api/src/app.module.ts`:
```typescript
import { TransactionDocumentsModule } from './transaction-documents/transaction-documents.module';
```

Y en el array `imports:` agregar `TransactionDocumentsModule,`

- [ ] **Step 7: Correr tests — deben pasar**

```bash
pnpm --filter api test transaction-documents
```

Esperado: 3 tests passing

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/transaction-documents/ apps/api/src/app.module.ts
git commit -m "feat(api): módulo TransactionDocument — link/unlink documentos a transacciones"
```

---

## Task 5: API — TransactionNote module

**Files:**
- Create: `apps/api/src/transaction-notes/transaction-notes.module.ts`
- Create: `apps/api/src/transaction-notes/transaction-notes.service.ts`
- Create: `apps/api/src/transaction-notes/transaction-notes.controller.ts`
- Create: `apps/api/src/transaction-notes/transaction-notes.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Escribir tests primero**

```typescript
// apps/api/src/transaction-notes/transaction-notes.service.spec.ts
import { Test } from '@nestjs/testing';
import { TransactionNotesService } from './transaction-notes.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  transactionNote: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('TransactionNotesService', () => {
  let service: TransactionNotesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionNotesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(TransactionNotesService);
    jest.clearAllMocks();
  });

  it('creates note with content', async () => {
    mockPrisma.transactionNote.create.mockResolvedValue({
      id: '1', transactionId: 'tx1', content: 'Revisado con contador', createdAt: new Date(),
    });
    const note = await service.addNote('tx1', 'Revisado con contador');
    expect(mockPrisma.transactionNote.create).toHaveBeenCalledWith({
      data: { transactionId: 'tx1', content: 'Revisado con contador' },
    });
    expect(note.content).toBe('Revisado con contador');
  });

  it('returns notes ordered oldest first', async () => {
    const notes = [
      { id: '1', content: 'Primera', createdAt: new Date('2026-01-01') },
      { id: '2', content: 'Segunda', createdAt: new Date('2026-01-02') },
    ];
    mockPrisma.transactionNote.findMany.mockResolvedValue(notes);
    const result = await service.getNotes('tx1');
    expect(result[0].content).toBe('Primera');
    expect(mockPrisma.transactionNote.findMany).toHaveBeenCalledWith({
      where: { transactionId: 'tx1' },
      orderBy: { createdAt: 'asc' },
    });
  });
});
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
pnpm --filter api test transaction-notes
```

Esperado: error `Cannot find module`

- [ ] **Step 3: Crear service**

```typescript
// apps/api/src/transaction-notes/transaction-notes.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionNotesService {
  constructor(private readonly prisma: PrismaService) {}

  addNote(transactionId: string, content: string) {
    return this.prisma.transactionNote.create({
      data: { transactionId, content },
    });
  }

  getNotes(transactionId: string) {
    return this.prisma.transactionNote.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
```

- [ ] **Step 4: Crear controller**

```typescript
// apps/api/src/transaction-notes/transaction-notes.controller.ts
import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TransactionNotesService } from './transaction-notes.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('transactions/:transactionId/notes')
export class TransactionNotesController {
  constructor(private readonly service: TransactionNotesService) {}

  @Post()
  addNote(
    @Param('transactionId') transactionId: string,
    @Body() body: { content: string },
  ) {
    return this.service.addNote(transactionId, body.content);
  }

  @Get()
  getNotes(@Param('transactionId') transactionId: string) {
    return this.service.getNotes(transactionId);
  }
}
```

- [ ] **Step 5: Crear module**

```typescript
// apps/api/src/transaction-notes/transaction-notes.module.ts
import { Module } from '@nestjs/common';
import { TransactionNotesService } from './transaction-notes.service';
import { TransactionNotesController } from './transaction-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionNotesController],
  providers: [TransactionNotesService],
  exports: [TransactionNotesService],
})
export class TransactionNotesModule {}
```

- [ ] **Step 6: Registrar en app.module.ts**

Agregar import:
```typescript
import { TransactionNotesModule } from './transaction-notes/transaction-notes.module';
```

Y en `imports:` agregar `TransactionNotesModule,`

- [ ] **Step 7: Correr tests — deben pasar**

```bash
pnpm --filter api test transaction-notes
```

Esperado: 2 tests passing

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/transaction-notes/ apps/api/src/app.module.ts
git commit -m "feat(api): módulo TransactionNote — bitácora de transacciones"
```

---

## Task 6: API — Counterparties RUT normalization + BankStatement en importer

**Files:**
- Modify: `apps/api/src/counterparties/counterparties.service.ts`
- Modify: `apps/api/src/importers/importers.service.ts`

- [ ] **Step 1: Actualizar CounterpartiesService**

Reemplazar `apps/api/src/counterparties/counterparties.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';
import { normalizeRut } from '@aw-finanzas/shared';

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
    const data = dto.rut ? { ...dto, rut: normalizeRut(dto.rut) } : dto;
    return this.prisma.counterparty.create({ data });
  }

  update(id: string, dto: Partial<CreateCounterpartyDto>) {
    const data = dto.rut ? { ...dto, rut: normalizeRut(dto.rut) } : dto;
    return this.prisma.counterparty.update({ where: { id }, data });
  }

  async upsertByRut(rut: string, dto: Partial<CreateCounterpartyDto>) {
    const normalizedRut = normalizeRut(rut);
    const existing = await this.prisma.counterparty.findUnique({ where: { rut: normalizedRut } });
    if (existing) return existing;
    return this.prisma.counterparty.create({
      data: { rut: normalizedRut, name: dto.name ?? '', type: dto.type ?? 'OTHER', ...dto },
    });
  }
}
```

- [ ] **Step 2: En importers.service.ts, registrar BankStatement y normalizar RUTs**

Busca donde se hace `upsert` de contraparte en el importer bancario (método que importa cartola BCI). Agregar al inicio del método de importación bancaria:

```typescript
// Registrar BankStatement
const bankStatement = await this.prisma.bankStatement.create({
  data: {
    companyId,
    filename: originalFilename,  // pasar como parámetro desde controller
    month: `${year}-${String(month).padStart(2, '0')}`,
    rowCount: rows.length,
  },
});
```

Y en el upsert de contrapartes del importer, reemplazar llamadas directas a `prisma.counterparty.upsert` por `counterpartiesService.upsertByRut(rut, dto)` para que el RUT se normalice automáticamente.

Para cada transacción creada en la importación, agregar `bankStatementId: bankStatement.id`.

- [ ] **Step 3: Verificar que el build compila**

```bash
pnpm --filter api build
```

Esperado: sin errores TypeScript

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/counterparties/counterparties.service.ts apps/api/src/importers/
git commit -m "feat(api): normalización RUT en contrapartes + registro BankStatement en importación"
```

---

## Task 7: API — Transaction status PATCH + include documents/notes

**Files:**
- Modify: `apps/api/src/transactions/transactions.service.ts`
- Modify: `apps/api/src/transactions/transactions.controller.ts`

- [ ] **Step 1: Actualizar findAll e findOne en transactions.service.ts**

En `findAll`, reemplazar el `include`:
```typescript
include: {
  allocations: true,
  counterparty: true,
  category: true,
  account: true,
  documents: { include: { document: { include: { counterparty: true } } } },
  notes: { orderBy: { createdAt: 'asc' } },
},
```

En `findOne`, mismo cambio al `include`.

Quitar `document: true` de todos los includes del service (la FK ya no existe).

- [ ] **Step 2: Agregar método updateStatus**

Al final de `TransactionsService`:

```typescript
async updateStatus(id: string, status: 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'RECONCILED') {
  return this.prisma.transaction.update({
    where: { id },
    data: { status },
  });
}
```

- [ ] **Step 3: Agregar PATCH /:id/status en controller**

En `apps/api/src/transactions/transactions.controller.ts`, agregar antes del último `}`:

```typescript
@Patch(':id/status')
updateStatus(
  @Param('id') id: string,
  @Body() body: { status: 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'RECONCILED' },
) {
  return this.transactionsService.updateStatus(id, body.status);
}
```

- [ ] **Step 4: Verificar build**

```bash
pnpm --filter api build
```

Esperado: sin errores

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/transactions/
git commit -m "feat(api): PATCH status en transacciones + include documents/notes en queries"
```

---

## Task 8: Frontend — types y queries

**Files:**
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/lib/queries.ts`

- [ ] **Step 1: Actualizar types.ts**

Agregar interfaces nuevas y actualizar `Transaction`:

```typescript
// Agregar estas interfaces nuevas:
export interface TransactionDocument {
  id: string;
  transactionId: string;
  documentId: string;
  note: string | null;
  linkedAt: string;
  document: {
    id: string;
    type: string;
    number: string | null;
    totalAmount: string;
    currency: string;
    issueDate: string | null;
    counterparty: { id: string; name: string } | null;
  };
}

export interface TransactionNote {
  id: string;
  transactionId: string;
  content: string;
  createdAt: string;
}
```

En la interfaz `Transaction`, reemplazar:
- `status: 'PENDING' | 'PAID' | 'RECONCILED' | 'CANCELLED'` → `status: 'PENDING' | 'PAID' | 'RECONCILED' | 'REJECTED' | 'CANCELLED'`
- Agregar después de `allocations`:
```typescript
  documents: TransactionDocument[];
  notes: TransactionNote[];
```

- [ ] **Step 2: Agregar funciones en api.ts**

Agregar al final de `apps/web/lib/api.ts`:

```typescript
export async function linkDocument(transactionId: string, documentId: string, note?: string) {
  const res = await fetch(`${API_URL}/transaction-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, documentId, note }),
  });
  if (!res.ok) throw new Error('Error al vincular documento');
  return res.json();
}

export async function unlinkDocument(linkId: string) {
  const res = await fetch(`${API_URL}/transaction-documents/${linkId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al desvincular documento');
}

export async function addTransactionNote(transactionId: string, content: string) {
  const res = await fetch(`${API_URL}/transactions/${transactionId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Error al agregar nota');
  return res.json();
}

export async function updateTransactionStatus(id: string, status: string) {
  const res = await fetch(`${API_URL}/transactions/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Error al actualizar estado');
  return res.json();
}
```

- [ ] **Step 3: Agregar mutations en queries.ts**

Agregar imports y mutations al final de `apps/web/lib/queries.ts`:

```typescript
import { linkDocument, unlinkDocument, addTransactionNote, updateTransactionStatus } from './api';

export function useLinkDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, documentId, note }: { transactionId: string; documentId: string; note?: string }) =>
      linkDocument(transactionId, documentId, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useUnlinkDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => unlinkDocument(linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useAddTransactionNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, content }: { transactionId: string; content: string }) =>
      addTransactionNote(transactionId, content),
    onSuccess: (_, { transactionId }) => queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] }),
  });
}

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateTransactionStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
pnpm --filter web tsc --noEmit
```

Esperado: sin errores de tipos

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/types.ts apps/web/lib/api.ts apps/web/lib/queries.ts
git commit -m "feat(web): tipos y queries para TransactionDocument, TransactionNote, status"
```

---

## Task 9: Frontend — balance utility con tests

**Files:**
- Create: `apps/web/lib/balance.ts`
- Create: `apps/web/lib/balance.test.ts`

- [ ] **Step 1: Escribir tests primero**

```typescript
// apps/web/lib/balance.test.ts
import { calculateRunningBalance } from './balance';

describe('calculateRunningBalance', () => {
  it('accumulates income positive', () => {
    const txs = [{ date: '2026-05-01', type: 'INCOME' as const, amountCLP: '100000', id: '1' }];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(100000);
  });

  it('accumulates expense negative', () => {
    const txs = [
      { date: '2026-05-01', type: 'INCOME' as const, amountCLP: '100000', id: '1' },
      { date: '2026-05-02', type: 'EXPENSE' as const, amountCLP: '30000', id: '2' },
    ];
    const result = calculateRunningBalance(txs as any);
    // result is displayed desc (newest first), so result[0] is the latest
    expect(result[0].balance).toBe(70000);
    expect(result[1].balance).toBe(100000);
  });

  it('handles multiple expenses same day', () => {
    const txs = [
      { date: '2026-05-01', type: 'INCOME' as const, amountCLP: '200000', id: '1' },
      { date: '2026-05-01', type: 'EXPENSE' as const, amountCLP: '50000', id: '2' },
      { date: '2026-05-01', type: 'EXPENSE' as const, amountCLP: '50000', id: '3' },
    ];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(100000);
  });

  it('returns empty array for no transactions', () => {
    expect(calculateRunningBalance([])).toEqual([]);
  });

  it('ignores TRANSFER type in balance calc', () => {
    const txs = [
      { date: '2026-05-01', type: 'INCOME' as const, amountCLP: '100000', id: '1' },
      { date: '2026-05-02', type: 'TRANSFER' as const, amountCLP: '50000', id: '2' },
    ];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(100000);
    expect(result[1].balance).toBe(100000);
  });
});
```

- [ ] **Step 2: Correr tests — deben fallar**

```bash
pnpm --filter web test balance
```

Esperado: error `Cannot find module`

- [ ] **Step 3: Crear balance.ts**

```typescript
// apps/web/lib/balance.ts
import type { Transaction } from './types';

export type TransactionWithBalance = Transaction & { balance: number };

export function calculateRunningBalance(transactions: Transaction[]): TransactionWithBalance[] {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const withBalance = sorted.map((tx) => {
    if (tx.type === 'INCOME') running += Number(tx.amountCLP);
    else if (tx.type === 'EXPENSE') running -= Number(tx.amountCLP);
    return { ...tx, balance: running };
  });

  return [...withBalance].reverse();
}
```

- [ ] **Step 4: Correr tests — deben pasar**

```bash
pnpm --filter web test balance
```

Esperado: 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/balance.ts apps/web/lib/balance.test.ts
git commit -m "feat(web): utilidad calculateRunningBalance con tests"
```

---

## Task 10: Frontend — Transaction table UI

**Files:**
- Modify: `apps/web/app/(app)/transactions/page.tsx`

- [ ] **Step 1: Reemplazar el div wrapper**

En `apps/web/app/(app)/transactions/page.tsx`, línea con `<div className="p-8 max-w-5xl">`:

```diff
- <div className="p-8 max-w-5xl">
+ <div className="p-8 w-full">
```

- [ ] **Step 2: Agregar imports y balance utility al archivo**

Al inicio del archivo, agregar:
```typescript
import { calculateRunningBalance, type TransactionWithBalance } from '@/lib/balance';
import { useUpdateTransactionStatus } from '@/lib/queries';
import { formatRut } from '@aw-finanzas/shared';
import { FileText, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
```

- [ ] **Step 3: Calcular saldo antes del render**

Después de la línea `const transactions = allTxs.filter(...)`, agregar:

```typescript
const txsWithBalance = calculateRunningBalance(transactions);
```

Reemplazar `const dates = Object.keys(grouped).sort(...)` para usar `txsWithBalance`:

```typescript
const grouped = txsWithBalance.reduce((acc: Record<string, TransactionWithBalance[]>, tx) => {
  const key = tx.date.split('T')[0];
  if (!acc[key]) acc[key] = [];
  acc[key].push(tx);
  return acc;
}, {});
const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
```

- [ ] **Step 4: Actualizar cabecera de tabla**

Reemplazar el `<thead>` completo:

```tsx
<thead>
  <tr className="border-b dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-slate-50">
    <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-24">Fecha</th>
    <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Descripción</th>
    <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-28">RUT</th>
    <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Categoría</th>
    <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-16">Origen</th>
    <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-12">Docs</th>
    <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500 w-32">Monto</th>
    <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500 w-32">Saldo</th>
    <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-24">Estado</th>
    <th className="px-2 py-2.5 w-8" />
  </tr>
</thead>
```

- [ ] **Step 5: Actualizar TxRow para nuevas columnas**

Reemplazar la función `TxRow` completa:

```tsx
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', PAID: 'Pagada', RECONCILED: 'Conciliada',
  REJECTED: 'Rechazada', CANCELLED: 'Anulada',
};

const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  RECONCILED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  REJECTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  CANCELLED: 'dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400',
};

const STATUS_OPTIONS = ['PENDING', 'PAID', 'REJECTED', 'CANCELLED'] as const;

function TxRow({ tx, onReview }: { tx: TransactionWithBalance; onReview?: (tx: TransactionWithBalance) => void }) {
  const isIncome = tx.type === 'INCOME';
  const isExpense = tx.type === 'EXPENSE';
  const source = tx.source ?? 'MANUAL';
  const { mutate: updateStatus } = useUpdateTransactionStatus();

  return (
    <tr className="border-b dark:border-slate-800/60 border-slate-100 dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-2.5 dark:text-slate-500 text-slate-400 tabular-nums text-xs">{fmtDate(tx.date)}</td>
      <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700 max-w-xs">
        <span className="truncate block text-xs">{tx.description}</span>
        {tx.counterparty?.name && (
          <span className="text-[10px] dark:text-slate-500 text-slate-400 truncate block">{tx.counterparty.name}</span>
        )}
      </td>
      <td className="px-4 py-2.5 dark:text-slate-500 text-slate-400 text-[11px] tabular-nums">
        {tx.counterparty?.rut ? formatRut(tx.counterparty.rut) : <span className="dark:text-slate-700 text-slate-300">—</span>}
      </td>
      <td className="px-4 py-2.5">
        {tx.category ? (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500">
            {tx.category.name}
          </span>
        ) : <span className="dark:text-slate-700 text-slate-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', SOURCE_CLS[source] ?? SOURCE_CLS.MANUAL)}>
          {SOURCE_LABELS[source] ?? source}
        </span>
      </td>
      <td className="px-4 py-2.5 text-center">
        {tx.documents?.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] dark:text-indigo-400 text-indigo-600 font-medium">
            <FileText className="h-3 w-3" />
            {tx.documents.length}
          </span>
        ) : <span className="dark:text-slate-700 text-slate-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
        <span className={cn('flex items-center justify-end gap-1 font-semibold text-xs',
          isIncome ? 'text-emerald-500' : isExpense ? 'text-rose-500' : 'dark:text-slate-300 text-slate-700'
        )}>
          {isIncome && <ArrowDownCircle className="h-3 w-3" />}
          {isExpense && <ArrowUpCircle className="h-3 w-3" />}
          {!isIncome && !isExpense && <ArrowRightLeft className="h-3 w-3" />}
          {fmtAmount(tx.amountCLP, 'CLP')}
        </span>
        {tx.currency !== 'CLP' && (
          <span className="text-[10px] dark:text-slate-500 text-slate-400 block text-right">
            {tx.currency} {USD.format(Number(tx.amount))}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-xs font-mono">
        <span className={cn('font-semibold', tx.balance >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
          {CLP.format(tx.balance)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer',
              STATUS_CLS[tx.status] ?? STATUS_CLS.PENDING
            )}>
              {STATUS_LABELS[tx.status] ?? tx.status}
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="center">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => updateStatus({ id: tx.id, status: s })}
                className={cn(
                  'w-full text-left rounded px-2 py-1.5 text-xs transition-colors',
                  tx.status === s
                    ? 'dark:bg-slate-700 bg-slate-100 font-semibold'
                    : 'dark:hover:bg-slate-800 hover:bg-slate-50'
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-2 py-2.5 text-center">
        {onReview && (
          <button
            onClick={() => onReview(tx)}
            className="rounded p-1 dark:text-slate-600 text-slate-300 dark:hover:text-indigo-400 hover:text-indigo-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
```

- [ ] **Step 6: Verificar que el dev server corre sin errores**

```bash
pnpm dev
```

Navega a `http://finanzas.local:4001/transactions`. Verifica tabla con nuevas columnas.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/(app)/transactions/page.tsx
git commit -m "feat(web): tabla transacciones — RUT, saldo, docs, estado inline, layout full-width"
```

---

## Task 11: Frontend — ReviewDrawer documentos + bitácora

**Files:**
- Modify: `apps/web/components/transactions/ReviewDrawer.tsx`

- [ ] **Step 1: Agregar imports**

Al inicio de `ReviewDrawer.tsx`, agregar:

```typescript
import { useLinkDocument, useUnlinkDocument, useAddTransactionNote } from '@/lib/queries';
import { useDocuments } from '@/lib/queries'; // agregar si no existe: getDocuments en api.ts
import { FileText, X, Plus, MessageSquare } from 'lucide-react';
import { formatRut } from '@aw-finanzas/shared';
```

- [ ] **Step 2: Agregar función getDocuments en api.ts si no existe**

Verificar si existe `getDocuments` en `apps/web/lib/api.ts`. Si no:

```typescript
export async function getDocuments(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/documents${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar documentos');
  return res.json();
}
```

Y en `queries.ts`:
```typescript
export function useDocuments(params: Record<string, string> = {}) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => getDocuments(params),
  });
}
```

- [ ] **Step 3: Agregar state y mutations en ReviewDrawer**

Dentro de `ReviewDrawer`, después de los hooks existentes, agregar:

```typescript
const { mutate: linkDoc, isPending: linking } = useLinkDocument();
const { mutate: unlinkDoc } = useUnlinkDocument();
const { mutate: addNote, isPending: addingNote } = useAddTransactionNote();
const { data: allDocs = [] } = useDocuments(
  tx?.counterparty?.id ? { counterpartyId: tx.counterparty.id } : {}
);

const [newNote, setNewNote] = useState('');
const [selectedDocId, setSelectedDocId] = useState('');
```

Agregar al `useEffect` del reset:
```typescript
setNewNote('');
setSelectedDocId('');
```

- [ ] **Step 4: Agregar sección Documentos vinculados en el JSX del drawer**

Justo antes del botón "Guardar" en el drawer, agregar:

```tsx
{/* Documentos vinculados */}
<div className="space-y-2">
  <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 flex items-center gap-1.5">
    <FileText className="h-3.5 w-3.5" /> Documentos vinculados
  </p>
  {tx.documents?.length > 0 ? (
    <div className="space-y-1">
      {tx.documents.map((link) => (
        <div key={link.id} className="flex items-center justify-between rounded-md border dark:border-slate-700 border-slate-200 px-3 py-2 text-xs dark:bg-slate-900 bg-slate-50">
          <span className="dark:text-slate-300 text-slate-700">
            {link.document.type} {link.document.number ? `#${link.document.number}` : ''}
            {' · '}
            <span className="dark:text-slate-500 text-slate-400">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(link.document.totalAmount))}
            </span>
          </span>
          <button
            onClick={() => unlinkDoc(link.id)}
            className="rounded p-0.5 dark:text-slate-600 text-slate-400 dark:hover:text-rose-400 hover:text-rose-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-[11px] dark:text-slate-600 text-slate-400">Sin documentos vinculados</p>
  )}
  {allDocs.length > 0 && (
    <div className="flex gap-2">
      <select
        value={selectedDocId}
        onChange={(e) => setSelectedDocId(e.target.value)}
        className={cn(SELECT_CLS, 'flex-1 text-xs')}
      >
        <option value="">Vincular documento...</option>
        {allDocs
          .filter((d: any) => !tx.documents?.some((l) => l.documentId === d.id))
          .map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.type} {d.number ? `#${d.number}` : ''} — {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(d.totalAmount))}
            </option>
          ))}
      </select>
      <button
        disabled={!selectedDocId || linking}
        onClick={() => {
          if (!selectedDocId || !tx) return;
          linkDoc({ transactionId: tx.id, documentId: selectedDocId });
          setSelectedDocId('');
        }}
        className="rounded-md px-3 py-2 text-xs dark:bg-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )}
</div>

{/* Bitácora */}
<div className="space-y-2">
  <p className="text-xs font-semibold dark:text-slate-300 text-slate-700 flex items-center gap-1.5">
    <MessageSquare className="h-3.5 w-3.5" /> Bitácora
  </p>
  {tx.notes?.length > 0 && (
    <div className="space-y-1.5 max-h-40 overflow-y-auto">
      {tx.notes.map((note) => (
        <div key={note.id} className="rounded-md dark:bg-slate-900 bg-slate-50 border dark:border-slate-800 border-slate-200 px-3 py-2">
          <p className="text-xs dark:text-slate-300 text-slate-700">{note.content}</p>
          <p className="text-[10px] dark:text-slate-600 text-slate-400 mt-0.5">
            {new Date(note.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  )}
  <div className="flex gap-2">
    <input
      value={newNote}
      onChange={(e) => setNewNote(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey && newNote.trim() && tx) {
          e.preventDefault();
          addNote({ transactionId: tx.id, content: newNote.trim() });
          setNewNote('');
        }
      }}
      placeholder="Agregar nota... (Enter para guardar)"
      className={cn(INPUT_CLS, 'flex-1 text-xs')}
    />
    <button
      disabled={!newNote.trim() || addingNote}
      onClick={() => {
        if (!newNote.trim() || !tx) return;
        addNote({ transactionId: tx.id, content: newNote.trim() });
        setNewNote('');
      }}
      className="rounded-md px-3 py-2 text-xs dark:bg-slate-700 bg-slate-200 dark:text-slate-300 text-slate-700 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  </div>
</div>
```

- [ ] **Step 5: Verificar en browser**

```bash
pnpm dev
```

Abrir una transacción → verificar sección documentos + bitácora en el drawer.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/transactions/ReviewDrawer.tsx apps/web/lib/
git commit -m "feat(web): ReviewDrawer — vincular documentos + bitácora de notas"
```

---

## Task 12: Verificación final

- [ ] **Step 1: Correr todos los tests**

```bash
pnpm --filter @aw-finanzas/shared test
pnpm --filter api test
pnpm --filter web test
```

Esperado: todos verdes

- [ ] **Step 2: Build completo**

```bash
pnpm build
```

Esperado: sin errores

- [ ] **Step 3: Smoke test manual**

1. Crear contraparte con RUT `11.111.111-1` → verificar guardado como `111111111`
2. Crear otra contraparte con RUT `11111111-1` → debe fallar con unicidad (misma contraparte)
3. Abrir transacción → vincular documento → aparece en lista
4. Agregar nota en bitácora → aparece en timeline
5. Cambiar estado desde tabla → badge cambia sin reload
6. Verificar columna Saldo muestra acumulado correcto
7. Verificar tabla usa ancho completo (sin max-w-5xl)

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: mejoras transacciones — documentos N:M, normalización RUT, saldo, bitácora, estado"
```
