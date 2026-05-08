# Phase 1 — Dashboard + CxC/CxP + Nueva Transacción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar dashboard mensual por empresa, listas CxC/CxP con marcado inline de pagos, y drawer para crear transacciones manualmente.

**Architecture:** Route group `(app)/` en Next.js App Router provee layout compartido (sidebar + QueryClientProvider). TanStack Query maneja estado del servidor con invalidación automática tras mutations. URL (`?company=AW&month=2026-05`) es fuente de verdad para filtros globales. En el backend se corrige el filtro de empresa para usar `allocations.some.companyId` (per CLAUDE.md: "reportes siempre agregan sobre transaction_allocations") y se agrega soporte de `allocations[]` en `POST /transactions`.

**Tech Stack:** Next.js 14 App Router, React 18, TanStack Query v5, Tailwind 3, shadcn/ui New York/Slate, tailwindcss-animate (ya instalado), NestJS 11, Prisma 5, Jest + @nestjs/testing, Playwright

---

## Mapa de archivos

**Backend — modificar:**
- `apps/api/src/transactions/transactions.service.ts`
- `apps/api/src/transactions/dto/create-transaction.dto.ts`

**Backend — crear:**
- `apps/api/src/transactions/transactions.service.spec.ts`

**Frontend — crear:**
- `apps/web/lib/types.ts`
- `apps/web/lib/queries.ts`
- `apps/web/components/layout/AppProviders.tsx`
- `apps/web/components/layout/AppSidebar.tsx`
- `apps/web/components/ui/sheet.tsx`
- `apps/web/components/transactions/NewTransactionDrawer.tsx` ← stub en Task 5, implementación en Task 8
- `apps/web/components/dashboard/CompanySummaryCard.tsx`
- `apps/web/components/dashboard/MonthTotalBar.tsx`
- `apps/web/components/transactions/TransactionTable.tsx`
- `apps/web/components/transactions/MarkPaidButton.tsx`
- `apps/web/app/(app)/layout.tsx`
- `apps/web/app/(app)/dashboard/page.tsx`
- `apps/web/app/(app)/cxc/page.tsx`
- `apps/web/app/(app)/cxp/page.tsx`
- `apps/web/app/(app)/transactions/page.tsx`
- `playwright.config.ts`
- `e2e/mark-paid.spec.ts`
- `e2e/new-transaction.spec.ts`

**Frontend — modificar:**
- `apps/web/lib/api.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`

**Frontend — eliminar:**
- `apps/web/app/transactions/page.tsx` (conflicto de ruta con `(app)/transactions`)

---

### Task 1: Instalar dependencias

**Files:**
- Modify: `apps/web/package.json` (vía pnpm)
- Modify: `package.json` raíz (vía pnpm)

- [ ] **Step 1: Instalar TanStack Query en web**

```bash
pnpm --filter web add @tanstack/react-query
```

Expected: `@tanstack/react-query` aparece en `apps/web/package.json` dependencies.

- [ ] **Step 2: Instalar Playwright en root**

```bash
pnpm add -D -w @playwright/test
pnpm exec playwright install chromium
```

Expected: `@playwright/test` en root `package.json` devDependencies. Chromium descargado sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json package.json pnpm-lock.yaml
git commit -m "chore: instalar tanstack-query y playwright"
```

---

### Task 2: API — fix filtro findAll (TDD)

**Files:**
- Create: `apps/api/src/transactions/transactions.service.spec.ts`
- Modify: `apps/api/src/transactions/transactions.service.ts`

- [ ] **Step 1: Escribir test que falla**

Crear `apps/api/src/transactions/transactions.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  transaction: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  transactionAllocation: { createMany: jest.fn() },
  $transaction: jest.fn((cb: (p: typeof mockPrisma) => unknown) => cb(mockPrisma)),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('findAll', () => {
    it('filtra por allocations.some.companyId cuando se pasa companyId', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      await service.findAll({ companyId: 'company-aw' });
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            allocations: { some: { companyId: 'company-aw' } },
          }),
        }),
      );
    });

    it('no incluye companyId directo en where', async () => {
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      await service.findAll({ companyId: 'company-aw' });
      const callArgs = mockPrisma.transaction.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(callArgs.where).not.toHaveProperty('companyId');
    });
  });
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
pnpm --filter api test transactions.service
```

Expected: FAIL — "Expected: ObjectContaining({allocations: {some: {companyId: 'company-aw'}}})".

- [ ] **Step 3: Corregir transactions.service.ts**

Reemplazar `apps/api/src/transactions/transactions.service.ts` completo:

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
        ...(companyId && { allocations: { some: { companyId } } }),
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
        account: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        allocations: true,
        counterparty: true,
        category: true,
        document: true,
        account: true,
      },
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

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
pnpm --filter api test transactions.service
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/transactions/transactions.service.ts apps/api/src/transactions/transactions.service.spec.ts
git commit -m "fix(api): filtrar transacciones por allocations.some.companyId"
```

---

### Task 3: API — POST /transactions con allocations (TDD)

**Files:**
- Modify: `apps/api/src/transactions/dto/create-transaction.dto.ts`
- Modify: `apps/api/src/transactions/transactions.service.ts`
- Modify: `apps/api/src/transactions/transactions.service.spec.ts`

- [ ] **Step 1: Agregar tests que fallan**

Agregar dentro del `describe('TransactionsService')` en `transactions.service.spec.ts`, después del `describe('findAll')`:

```typescript
  describe('create', () => {
    it('crea allocations proporcionales cuando se pasa allocations[]', async () => {
      const mockTx = { id: 'tx-1', amountCLP: '80000' };
      mockPrisma.transaction.create.mockResolvedValue(mockTx);
      mockPrisma.transactionAllocation.createMany.mockResolvedValue({ count: 2 });

      await service.create({
        companyId: 'company-aw',
        type: 'EXPENSE' as const,
        amount: 80000,
        currency: 'CLP' as const,
        amountCLP: 80000,
        date: '2026-05-01',
        description: 'Contador',
        allocations: [
          { companyId: 'company-aw', percentage: 50 },
          { companyId: 'company-expro', percentage: 50 },
        ],
      });

      expect(mockPrisma.transactionAllocation.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: 'tx-1', companyId: 'company-aw', percentage: 50, amountCLP: 40000 },
          { transactionId: 'tx-1', companyId: 'company-expro', percentage: 50, amountCLP: 40000 },
        ],
      });
    });

    it('crea allocation 100% cuando no se pasan allocations', async () => {
      const mockTx = { id: 'tx-2', amountCLP: '100000' };
      mockPrisma.transaction.create.mockResolvedValue(mockTx);
      mockPrisma.transactionAllocation.createMany.mockResolvedValue({ count: 1 });

      await service.create({
        companyId: 'company-aw',
        type: 'EXPENSE' as const,
        amount: 100000,
        currency: 'CLP' as const,
        amountCLP: 100000,
        date: '2026-05-01',
        description: 'Test sin allocations',
      });

      expect(mockPrisma.transactionAllocation.createMany).toHaveBeenCalledWith({
        data: [
          { transactionId: 'tx-2', companyId: 'company-aw', percentage: 100, amountCLP: 100000 },
        ],
      });
    });
  });
```

- [ ] **Step 2: Ejecutar — deben fallar**

```bash
pnpm --filter api test transactions.service
```

Expected: FAIL en los 2 tests de `create` — `transactionAllocation.createMany` no se llama.

- [ ] **Step 3: Actualizar create-transaction.dto.ts**

Reemplazar `apps/api/src/transactions/dto/create-transaction.dto.ts` completo:

```typescript
import {
  IsString, IsEnum, IsNumber, IsOptional,
  IsDateString, IsPositive, ValidateNested,
  IsArray, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, Currency } from '@aw-finanzas/database';

export class AllocationDto {
  @IsString()
  companyId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class CreateTransactionDto {
  @IsString()
  companyId: string;

  @IsOptional() @IsString()
  accountId?: string;

  @IsOptional() @IsString()
  counterpartyId?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsString()
  documentId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber() @IsPositive()
  amount: number;

  @IsEnum(Currency) @IsOptional()
  currency?: Currency;

  @IsNumber() @IsPositive()
  amountCLP: number;

  @IsDateString()
  date: string;

  @IsOptional() @IsDateString()
  dueDate?: string;

  @IsString()
  description: string;

  @IsOptional() @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationDto)
  allocations?: AllocationDto[];
}
```

- [ ] **Step 4: Actualizar método create en transactions.service.ts**

Reemplazar solo el método `create` en `apps/api/src/transactions/transactions.service.ts`:

```typescript
  async create(dto: CreateTransactionDto) {
    const { allocations, ...txData } = dto;
    const allocs = allocations ?? [{ companyId: txData.companyId, percentage: 100 }];

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({ data: txData });
      await tx.transactionAllocation.createMany({
        data: allocs.map((a) => ({
          transactionId: transaction.id,
          companyId: a.companyId,
          percentage: a.percentage,
          amountCLP: (txData.amountCLP * a.percentage) / 100,
        })),
      });
      return transaction;
    });
  }
```

- [ ] **Step 5: Ejecutar todos los tests — deben pasar**

```bash
pnpm --filter api test transactions.service
```

Expected: PASS — 4 tests passing (2 findAll + 2 create).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/transactions/dto/create-transaction.dto.ts apps/api/src/transactions/transactions.service.ts apps/api/src/transactions/transactions.service.spec.ts
git commit -m "feat(api): soporte allocations[] en POST /transactions"
```

---

### Task 4: Frontend lib — types, api, queries, AppProviders

**Files:**
- Create: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/lib/queries.ts`
- Create: `apps/web/components/layout/AppProviders.tsx`

- [ ] **Step 1: Crear types.ts**

Crear `apps/web/lib/types.ts`:

```typescript
export interface TransactionAllocation {
  id: string;
  transactionId: string;
  companyId: string;
  percentage: string;
  amountCLP: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  status: 'PENDING' | 'PAID' | 'RECONCILED' | 'CANCELLED';
  amount: string;
  currency: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: string;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  description: string;
  comment: string | null;
  allocations: TransactionAllocation[];
  counterparty: { id: string; name: string; type: string } | null;
  category: { id: string; name: string; color: string | null } | null;
}

export interface Company {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
}

export interface CreateTransactionInput {
  companyId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  currency?: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: number;
  date: string;
  description: string;
  counterpartyId?: string;
  categoryId?: string;
  dueDate?: string;
  allocations?: Array<{ companyId: string; percentage: number }>;
}
```

- [ ] **Step 2: Reemplazar api.ts**

Reemplazar `apps/web/lib/api.ts` completo:

```typescript
import type { Transaction, Company, CreateTransactionInput } from './types';

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

export function getTransactions(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchApi<Transaction[]>(`/transactions?${qs}`);
}

export function getCompanies() {
  return fetchApi<Company[]>('/companies');
}

export function markTransactionPaid(id: string) {
  return fetchApi<Transaction>(`/transactions/${id}/paid`, { method: 'PATCH' });
}

export function createTransaction(dto: CreateTransactionInput) {
  return fetchApi<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
```

- [ ] **Step 3: Crear queries.ts**

Crear `apps/web/lib/queries.ts`:

```typescript
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, getCompanies, markTransactionPaid, createTransaction } from './api';
import type { CreateTransactionInput } from './types';

export const queryKeys = {
  companies: ['companies'] as const,
  transactions: (params: Record<string, string>) => ['transactions', params] as const,
};

export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies, queryFn: getCompanies });
}

export function useTransactions(params: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => getTransactions(params),
  });
}

export function useMarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markTransactionPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionInput) => createTransaction(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
```

- [ ] **Step 4: Crear AppProviders.tsx**

Crear `apps/web/components/layout/AppProviders.tsx`:

```tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 5: Type check**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: Sin errores.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/types.ts apps/web/lib/api.ts apps/web/lib/queries.ts apps/web/components/layout/AppProviders.tsx
git commit -m "feat(web): tipos, api client, react-query hooks y providers"
```

---

### Task 5: Layout, sidebar y scaffold de rutas

**Files:**
- Create: `apps/web/components/ui/sheet.tsx`
- Create: `apps/web/components/transactions/NewTransactionDrawer.tsx` (stub)
- Create: `apps/web/components/layout/AppSidebar.tsx`
- Create: `apps/web/app/(app)/layout.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Delete: `apps/web/app/transactions/page.tsx`

- [ ] **Step 1: Crear Sheet component**

Crear `apps/web/components/ui/sheet.tsx`:

```tsx
'use client';
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 right-0 z-50 h-full w-full max-w-sm border-l bg-white p-6 shadow-xl transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
        <X className="h-4 w-4" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 mb-6', className)} {...props} />
);

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-slate-900', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle };
```

- [ ] **Step 2: Crear NewTransactionDrawer stub**

Crear `apps/web/components/transactions/NewTransactionDrawer.tsx`:

```tsx
interface NewTransactionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyCode?: string;
}

export function NewTransactionDrawer(_props: NewTransactionDrawerProps) {
  return null;
}
```

- [ ] **Step 3: Crear AppSidebar.tsx**

Crear `apps/web/components/layout/AppSidebar.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, List, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { NewTransactionDrawer } from '@/components/transactions/NewTransactionDrawer';

const COMPANIES = ['AW', 'EXPRO'] as const;

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/cxc', label: 'CxC', Icon: ArrowDownCircle },
  { href: '/cxp', label: 'CxP', Icon: ArrowUpCircle },
  { href: '/transactions', label: 'Transacciones', Icon: List },
];

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const company = searchParams.get('company') ?? 'AW';
  const month = searchParams.get('month') ?? getDefaultMonth();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <aside className="flex h-screen w-56 flex-col border-r bg-white px-3 py-4">
        <div className="mb-6 px-2">
          <h1 className="text-sm font-bold text-slate-900">aw-finanzas</h1>
          <p className="text-xs text-slate-400">AW · EXPRO</p>
        </div>

        <div className="mb-4 flex rounded-md border p-0.5">
          {COMPANIES.map((c) => (
            <button
              key={c}
              onClick={() => updateParam('company', c)}
              className={cn(
                'flex-1 rounded py-1 text-xs font-medium transition-colors',
                company === c ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center justify-between px-1">
          <button
            onClick={() => updateParam('month', addMonths(month, -1))}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-slate-700 capitalize">
            {formatMonth(month)}
          </span>
          <button
            onClick={() => updateParam('month', addMonths(month, 1))}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={`${href}?company=${company}&month=${month}`}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                pathname === href
                  ? 'bg-slate-100 font-medium text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <Button size="sm" className="mt-4 w-full" onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva Transacción
        </Button>
      </aside>

      <NewTransactionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        defaultCompanyCode={company}
      />
    </>
  );
}
```

- [ ] **Step 4: Crear (app)/layout.tsx**

Crear `apps/web/app/(app)/layout.tsx`:

```tsx
import { Suspense } from 'react';
import { AppProviders } from '@/components/layout/AppProviders';
import { AppSidebar } from '@/components/layout/AppSidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Suspense>
          <AppSidebar />
        </Suspense>
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div className="p-8 text-sm text-slate-400">Cargando...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </AppProviders>
  );
}
```

- [ ] **Step 5: Actualizar app/layout.tsx y app/page.tsx**

Reemplazar `apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const geistSans = localFont({ src: './fonts/GeistVF.woff', variable: '--font-geist-sans', weight: '100 900' });
const geistMono = localFont({ src: './fonts/GeistMonoVF.woff', variable: '--font-geist-mono', weight: '100 900' });

export const metadata: Metadata = {
  title: 'aw-finanzas',
  description: 'Gestión financiera AplicacionesWeb · Expande PRO',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
```

Reemplazar `apps/web/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
}
```

- [ ] **Step 6: Eliminar página conflictiva**

```bash
rm "apps/web/app/transactions/page.tsx"
rmdir "apps/web/app/transactions"
```

Expected: Directorio eliminado. Ahora `/transactions` solo existe en `(app)/`.

- [ ] **Step 7: Type check y arranque**

```bash
pnpm --filter web exec tsc --noEmit
```

Expected: Sin errores. Nota: las páginas bajo `(app)/` no existen aún — el servidor arrancará con 404 en esas rutas hasta Task 6+.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/components/ui/sheet.tsx" "apps/web/components/transactions/NewTransactionDrawer.tsx" "apps/web/components/layout/AppSidebar.tsx" "apps/web/app/(app)/layout.tsx" "apps/web/app/layout.tsx" "apps/web/app/page.tsx"
git rm "apps/web/app/transactions/page.tsx"
git commit -m "feat(web): scaffold layout app, sidebar, sheet component y redirect raíz"
```

---

### Task 6: Dashboard

**Files:**
- Create: `apps/web/components/dashboard/CompanySummaryCard.tsx`
- Create: `apps/web/components/dashboard/MonthTotalBar.tsx`
- Create: `apps/web/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Crear CompanySummaryCard.tsx**

Crear `apps/web/components/dashboard/CompanySummaryCard.tsx`:

```tsx
import { Card } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';

interface Summary {
  income: number;
  expense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
}

function computeSummary(transactions: Transaction[], companyId: string): Summary {
  let income = 0, expense = 0, pendingIncome = 0, pendingExpense = 0;
  for (const tx of transactions) {
    const alloc = tx.allocations.find((a) => a.companyId === companyId);
    if (!alloc) continue;
    const amount = parseFloat(alloc.amountCLP);
    if (tx.type === 'INCOME' && tx.status === 'PAID') income += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PAID') expense += amount;
    if (tx.type === 'INCOME' && tx.status === 'PENDING') pendingIncome += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PENDING') pendingExpense += amount;
  }
  return { income, expense, balance: income - expense, pendingIncome, pendingExpense };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

interface CompanySummaryCardProps {
  company: { id: string; name: string; shortCode: string };
  transactions: Transaction[];
}

export function CompanySummaryCard({ company, transactions }: CompanySummaryCardProps) {
  const s = computeSummary(transactions, company.id);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {company.shortCode}
        </span>
        <span className="text-xs text-slate-400">{company.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400">Ingresos cobrados</p>
          <p className="text-lg font-semibold text-emerald-600">{fmt(s.income)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Egresos pagados</p>
          <p className="text-lg font-semibold text-rose-600">{fmt(s.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">CxC pendiente</p>
          <p className="text-sm font-medium text-slate-600">{fmt(s.pendingIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">CxP pendiente</p>
          <p className="text-sm font-medium text-slate-600">{fmt(s.pendingExpense)}</p>
        </div>
      </div>
      <div className="mt-4 border-t pt-3">
        <p className="text-xs text-slate-400">Resultado del mes</p>
        <p className={`text-xl font-bold ${s.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {fmt(s.balance)}
        </p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Crear MonthTotalBar.tsx**

Crear `apps/web/components/dashboard/MonthTotalBar.tsx`:

```tsx
import type { Transaction } from '@/lib/types';

function fmt(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

interface MonthTotalBarProps {
  transactions: Transaction[];
}

export function MonthTotalBar({ transactions }: MonthTotalBarProps) {
  let income = 0, expense = 0;
  for (const tx of transactions) {
    const amount = parseFloat(tx.amountCLP);
    if (tx.type === 'INCOME' && tx.status === 'PAID') income += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PAID') expense += amount;
  }
  const balance = income - expense;

  return (
    <div className="flex items-center gap-8 rounded-lg border bg-slate-900 px-6 py-4 text-white">
      <div>
        <p className="text-xs text-slate-400">Total ingresos</p>
        <p className="text-base font-semibold text-emerald-400">{fmt(income)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Total egresos</p>
        <p className="text-base font-semibold text-rose-400">{fmt(expense)}</p>
      </div>
      <div className="ml-auto">
        <p className="text-xs text-slate-400">Resultado combinado</p>
        <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {fmt(balance)}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Crear dashboard/page.tsx**

Crear `apps/web/app/(app)/dashboard/page.tsx`:

```tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { CompanySummaryCard } from '@/components/dashboard/CompanySummaryCard';
import { MonthTotalBar } from '@/components/dashboard/MonthTotalBar';

function getMonthBounds(ym: string): { dateFrom: string; dateTo: string } {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: last.toISOString().split('T')[0],
  };
}

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const { dateFrom, dateTo } = getMonthBounds(month);

  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions({ dateFrom, dateTo });

  if (loadingCo || loadingTx) {
    return <div className="p-8 text-sm text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {companies.filter((c) => c.isActive).map((company) => (
          <CompanySummaryCard key={company.id} company={company} transactions={transactions} />
        ))}
      </div>
      <MonthTotalBar transactions={transactions} />
    </div>
  );
}
```

- [ ] **Step 4: Verificar en browser**

```bash
pnpm dev
```

Navegar a `http://localhost:3000`. Expected: redirige a `/dashboard`, muestra sidebar, tarjetas de cada empresa con totales del mes actual.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/components/dashboard/CompanySummaryCard.tsx" "apps/web/components/dashboard/MonthTotalBar.tsx" "apps/web/app/(app)/dashboard/page.tsx"
git commit -m "feat(web): dashboard con CompanySummaryCard y MonthTotalBar"
```

---

### Task 7: CxC, CxP y componentes de tabla

**Files:**
- Create: `apps/web/components/transactions/TransactionTable.tsx`
- Create: `apps/web/components/transactions/MarkPaidButton.tsx`
- Create: `apps/web/app/(app)/cxc/page.tsx`
- Create: `apps/web/app/(app)/cxp/page.tsx`

- [ ] **Step 1: Crear MarkPaidButton.tsx**

Crear `apps/web/components/transactions/MarkPaidButton.tsx`:

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { useMarkPaid } from '@/lib/queries';

export function MarkPaidButton({ transactionId }: { transactionId: string }) {
  const { mutate, isPending } = useMarkPaid();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => mutate(transactionId)}
      className="text-xs"
    >
      ✓ Pagar
    </Button>
  );
}
```

- [ ] **Step 2: Crear TransactionTable.tsx**

Crear `apps/web/components/transactions/TransactionTable.tsx`:

```tsx
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MarkPaidButton } from './MarkPaidButton';
import type { Transaction } from '@/lib/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtAmount(amount: string, currency: string): string {
  const n = parseFloat(amount);
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  }
  return `${currency} ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

interface TransactionTableProps {
  transactions: Transaction[];
  showMarkPaid?: boolean;
}

export function TransactionTable({ transactions, showMarkPaid = false }: TransactionTableProps) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Sin transacciones</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-24">Fecha</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Contrapartida</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead className="w-24">Vence</TableHead>
          {showMarkPaid && <TableHead className="w-24" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.id}>
            <TableCell className="text-xs text-slate-500">{fmtDate(tx.date)}</TableCell>
            <TableCell className="text-sm">{tx.description}</TableCell>
            <TableCell className="text-xs text-slate-500">
              {tx.counterparty?.name ?? '—'}
            </TableCell>
            <TableCell className="text-right text-sm font-medium">
              {fmtAmount(tx.amount, tx.currency)}
            </TableCell>
            <TableCell className="text-xs text-slate-500">
              {tx.dueDate ? fmtDate(tx.dueDate) : '—'}
            </TableCell>
            {showMarkPaid && (
              <TableCell>
                <MarkPaidButton transactionId={tx.id} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 3: Crear cxc/page.tsx**

Crear `apps/web/app/(app)/cxc/page.tsx`:

```tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { TransactionTable } from '@/components/transactions/TransactionTable';

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function CxCPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const companyCode = searchParams.get('company') ?? 'AW';
  const [y, m] = month.split('-').map(Number);

  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: transactions = [], isLoading: loadingTx } = useTransactions(
    company
      ? {
          companyId: company.id,
          type: 'INCOME',
          status: 'PENDING',
          dateFrom: new Date(y, m - 1, 1).toISOString().split('T')[0],
          dateTo: new Date(y, m, 0).toISOString().split('T')[0],
        }
      : {},
  );

  if (loadingCo || loadingTx) return <div className="p-8 text-sm text-slate-400">Cargando...</div>;

  return (
    <div className="p-8">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Cuentas por Cobrar — {companyCode}
      </h2>
      <TransactionTable transactions={transactions} showMarkPaid />
    </div>
  );
}
```

- [ ] **Step 4: Crear cxp/page.tsx**

Crear `apps/web/app/(app)/cxp/page.tsx`:

```tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { TransactionTable } from '@/components/transactions/TransactionTable';

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function CxPPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const companyCode = searchParams.get('company') ?? 'AW';
  const [y, m] = month.split('-').map(Number);

  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: transactions = [], isLoading: loadingTx } = useTransactions(
    company
      ? {
          companyId: company.id,
          type: 'EXPENSE',
          status: 'PENDING',
          dateFrom: new Date(y, m - 1, 1).toISOString().split('T')[0],
          dateTo: new Date(y, m, 0).toISOString().split('T')[0],
        }
      : {},
  );

  if (loadingCo || loadingTx) return <div className="p-8 text-sm text-slate-400">Cargando...</div>;

  return (
    <div className="p-8">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Cuentas por Pagar — {companyCode}
      </h2>
      <TransactionTable transactions={transactions} showMarkPaid />
    </div>
  );
}
```

- [ ] **Step 5: Verificar en browser**

Navegar a `/cxc` y `/cxp`. Expected: tablas con transacciones PENDING del mes. Botón "✓ Pagar" en cada fila. Al hacer click, fila desaparece (query invalida y re-fetch).

- [ ] **Step 6: Commit**

```bash
git add "apps/web/components/transactions/MarkPaidButton.tsx" "apps/web/components/transactions/TransactionTable.tsx" "apps/web/app/(app)/cxc/page.tsx" "apps/web/app/(app)/cxp/page.tsx"
git commit -m "feat(web): CxC, CxP, TransactionTable y MarkPaidButton"
```

---

### Task 8: NewTransactionDrawer — implementación completa

**Files:**
- Modify: `apps/web/components/transactions/NewTransactionDrawer.tsx`

- [ ] **Step 1: Reemplazar stub con implementación**

Reemplazar `apps/web/components/transactions/NewTransactionDrawer.tsx` completo:

```tsx
'use client';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanies, useCreateTransaction } from '@/lib/queries';

interface FormState {
  companyCode: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: string;
  currency: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: string;
  date: string;
  dueDate: string;
  status: 'PENDING' | 'PAID';
}

interface NewTransactionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyCode?: string;
}

export function NewTransactionDrawer({ open, onOpenChange, defaultCompanyCode = 'AW' }: NewTransactionDrawerProps) {
  const { data: companies = [] } = useCompanies();
  const { mutate, isPending } = useCreateTransaction();

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState<FormState>({
    companyCode: defaultCompanyCode,
    type: 'EXPENSE',
    description: '',
    amount: '',
    currency: 'CLP',
    amountCLP: '',
    date: today,
    dueDate: '',
    status: 'PENDING',
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'amount' && next.currency === 'CLP') {
        next.amountCLP = value as string;
      }
      if (key === 'currency' && value === 'CLP') {
        next.amountCLP = next.amount;
      }
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const company = companies.find((c) => c.shortCode === form.companyCode);
    if (!company) return;

    mutate(
      {
        companyId: company.id,
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        amountCLP: parseFloat(form.amountCLP || form.amount),
        date: form.date,
        ...(form.dueDate && { dueDate: form.dueDate }),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ companyCode: defaultCompanyCode, type: 'EXPENSE', description: '', amount: '', currency: 'CLP', amountCLP: '', date: today, dueDate: '', status: 'PENDING' });
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nueva Transacción</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nt-company">Empresa</Label>
            <select
              id="nt-company"
              value={form.companyCode}
              onChange={(e) => set('companyCode', e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.shortCode}>{c.shortCode} — {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-type">Tipo</Label>
            <select
              id="nt-type"
              value={form.type}
              onChange={(e) => set('type', e.target.value as FormState['type'])}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="EXPENSE">Egreso (CxP)</option>
              <option value="INCOME">Ingreso (CxC)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-desc">Descripción *</Label>
            <Input
              id="nt-desc"
              required
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ej: Factura contador mayo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nt-amount">Monto *</Label>
              <Input
                id="nt-amount"
                required
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-currency">Moneda</Label>
              <select
                id="nt-currency"
                value={form.currency}
                onChange={(e) => set('currency', e.target.value as FormState['currency'])}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="UF">UF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {form.currency !== 'CLP' && (
            <div className="space-y-1.5">
              <Label htmlFor="nt-amountclp">Monto CLP *</Label>
              <Input
                id="nt-amountclp"
                required
                type="number"
                min="0"
                step="any"
                value={form.amountCLP}
                onChange={(e) => set('amountCLP', e.target.value)}
                placeholder="Equivalente en CLP"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nt-date">Fecha *</Label>
              <Input
                id="nt-date"
                required
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nt-due">Vencimiento</Label>
              <Input
                id="nt-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={isPending} className="mt-2">
            {isPending ? 'Guardando...' : 'Guardar Transacción'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Verificar en browser**

Con `pnpm dev`, click en "Nueva Transacción" en el sidebar. Expected: drawer desliza desde la derecha, formulario con todos los campos. Submit crea transacción y cierra el drawer. La transacción aparece en la lista.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/components/transactions/NewTransactionDrawer.tsx"
git commit -m "feat(web): NewTransactionDrawer con form completo"
```

---

### Task 9: Página de transacciones completa

**Files:**
- Create: `apps/web/app/(app)/transactions/page.tsx`

- [ ] **Step 1: Crear transactions/page.tsx**

Crear `apps/web/app/(app)/transactions/page.tsx`:

```tsx
'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { TransactionTable } from '@/components/transactions/TransactionTable';

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const companyCode = searchParams.get('company') ?? 'AW';
  const [y, m] = month.split('-').map(Number);

  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: transactions = [], isLoading } = useTransactions(
    company
      ? {
          companyId: company.id,
          dateFrom: new Date(y, m - 1, 1).toISOString().split('T')[0],
          dateTo: new Date(y, m, 0).toISOString().split('T')[0],
        }
      : {},
  );

  if (isLoading) return <div className="p-8 text-sm text-slate-400">Cargando...</div>;

  return (
    <div className="p-8">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Transacciones — {companyCode}
      </h2>
      <TransactionTable transactions={transactions} />
    </div>
  );
}
```

- [ ] **Step 2: Verificar navegación completa**

```bash
pnpm dev
```

Verificar que `/`, `/dashboard`, `/cxc`, `/cxp`, `/transactions` funcionan. Cambiar empresa y mes en el sidebar — todas las páginas deben actualizar su contenido.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(app)/transactions/page.tsx"
git commit -m "feat(web): página de transacciones completa con filtros por empresa y mes"
```

---

### Task 10: E2E con Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/mark-paid.spec.ts`
- Create: `e2e/new-transaction.spec.ts`

**Prerequisito:** `docker ps` confirma PostgreSQL corriendo. `pnpm db:seed` ejecutado. `pnpm dev` iniciado.

- [ ] **Step 1: Crear playwright.config.ts**

Crear `playwright.config.ts` en la raíz del monorepo:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: [
    {
      command: 'pnpm --filter api dev',
      port: 3001,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm --filter web dev',
      port: 3000,
      reuseExistingServer: true,
    },
  ],
});
```

- [ ] **Step 2: Escribir test marcar pagado**

Crear `e2e/mark-paid.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('marcar transacción como pagada la elimina de CxP', async ({ page }) => {
  await page.goto('/cxp');

  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const initialCount = await rows.count();

  await rows.first().getByRole('button', { name: '✓ Pagar' }).click();

  await expect(rows).toHaveCount(initialCount - 1);
});

test('marcar transacción como pagada la elimina de CxC', async ({ page }) => {
  await page.goto('/cxc');

  const rows = page.locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const initialCount = await rows.count();

  await rows.first().getByRole('button', { name: '✓ Pagar' }).click();

  await expect(rows).toHaveCount(initialCount - 1);
});
```

- [ ] **Step 3: Ejecutar test marcar pagado**

```bash
pnpm exec playwright test e2e/mark-paid.spec.ts
```

Expected: PASS — 2 tests passing.

- [ ] **Step 4: Escribir test nueva transacción**

Crear `e2e/new-transaction.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('nueva transacción aparece en la lista de transacciones', async ({ page }) => {
  await page.goto('/transactions');
  const initialCount = await page.locator('tbody tr').count();

  await page.getByRole('button', { name: 'Nueva Transacción' }).click();

  const drawer = page.locator('[data-state="open"]');
  await expect(drawer).toBeVisible();

  await page.getByLabel('Descripción *').fill('Test E2E Playwright');
  await page.getByLabel('Monto *').fill('50000');
  await page.getByLabel('Fecha *').fill(new Date().toISOString().split('T')[0]);

  await page.getByRole('button', { name: 'Guardar Transacción' }).click();

  await expect(drawer).not.toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(initialCount + 1);
  await expect(page.getByText('Test E2E Playwright')).toBeVisible();
});
```

- [ ] **Step 5: Ejecutar test nueva transacción**

```bash
pnpm exec playwright test e2e/new-transaction.spec.ts
```

Expected: PASS — 1 test passing.

- [ ] **Step 6: Commit final**

```bash
git add playwright.config.ts e2e/mark-paid.spec.ts e2e/new-transaction.spec.ts
git commit -m "test(e2e): playwright — marcar pagado y nueva transacción"
```

---

## Checklist de verificación final

```bash
# API tests
pnpm --filter api test

# Web type check
pnpm --filter web exec tsc --noEmit

# E2E (con dev server corriendo)
pnpm exec playwright test
```

- [ ] `GET /transactions?companyId=EXPRO` retorna transacciones con allocations para EXPRO (no solo donde `companyId = EXPRO`)
- [ ] Dashboard muestra tarjetas separadas AW y EXPRO con totales correctos
- [ ] Sidebar cambia empresa y mes en URL — todas las vistas reaccionan
- [ ] CxC/CxP solo muestran transacciones PENDING
- [ ] Botón "✓ Pagar" marca y la fila desaparece sin refresh manual
- [ ] Drawer crea transacción y se cierra
- [ ] Nueva transacción aparece en lista inmediatamente
