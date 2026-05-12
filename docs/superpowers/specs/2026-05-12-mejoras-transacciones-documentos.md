# Spec: Mejoras transacciones y documentos

**Fecha:** 2026-05-12  
**Estado:** Aprobado  
**Rama:** feat/phase-1-ui

---

## Contexto

aw-finanzas reemplaza un Google Sheet. Esta mejora agrega soporte real de documentos tributarios vinculados a transacciones, normalización de RUT, tabla de transacciones más completa, bitácora de notas, y mejoras en el flujo de ingreso desde cartolas bancarias.

---

## Alcance

### Incluido

1. Schema: `TransactionDocument` (N:M), `TransactionNote`, `BankStatement`, enum `REJECTED`
2. Utilidad RUT: normalizar, formatear, comparar
3. Tabla transacciones: nuevas columnas + estado editable inline + saldo acumulado
4. Gestión documentos: vincular/desvincular desde `ReviewDrawer`
5. Flujo ingreso: auto-match cartola ↔ documentos en conciliación
6. Layout: quitar `max-w-5xl` del contenedor de transacciones
7. Unit tests para todo lo anterior

### Excluido

- Upload de archivos PDF (se usa `Document.pdfUrl` como link externo por ahora)
- Auth multi-usuario
- Integración SII / ExpandERP

---

## Decisiones de arquitectura

| Decisión | Elegida | Razón |
|---|---|---|
| Documentos en tx | Join table `TransactionDocument` (N:M), drop `Transaction.documentId` | Fuente de verdad única |
| Normalización RUT | Sin puntos en DB (`12345678-9`) | Facilita comparación y evita duplicados |
| Bitácora | Modelo `TransactionNote` separado de `TransactionAuditLog` | AuditLog es automático; Notes son del usuario |

---

## Schema

### Nuevo: `TransactionDocument`

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
```

### Nuevo: `TransactionNote`

```prisma
model TransactionNote {
  id            String   @id @default(cuid())
  transactionId String
  content       String
  createdAt     DateTime @default(now())

  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@index([transactionId])
  @@map("transaction_notes")
}
```

### Nuevo: `BankStatement`

```prisma
model BankStatement {
  id          String   @id @default(cuid())
  companyId   String
  accountId   String?
  filename    String
  month       String   // "2026-05"
  importedAt  DateTime @default(now())
  rowCount    Int      @default(0)

  company      Company       @relation(fields: [companyId], references: [id])
  account      Account?      @relation(fields: [accountId], references: [id])
  transactions Transaction[]

  @@map("bank_statements")
}
```

### Modificado: `Transaction`

- Eliminar `documentId String?` (migrar datos → `TransactionDocument`)
- Agregar `bankStatementId String?`
- Relaciones: `documents TransactionDocument[]`, `notes TransactionNote[]`

### Modificado: `Document`

- Relación `transactions TransactionDocument[]`

### Modificado: `TransactionStatus`

```prisma
enum TransactionStatus {
  PENDING
  PAID
  RECONCILED
  REJECTED   // nuevo
  CANCELLED
}
```

---

## Utilidad RUT — `packages/shared/src/utils/rut.ts`

```typescript
export function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/\s/g, '').toUpperCase()
}

export function formatRut(rut: string): string {
  const clean = normalizeRut(rut)
  const [body, dv] = clean.split('-')
  if (!dv) return clean
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

export function areRutsEqual(a: string, b: string): boolean {
  return normalizeRut(a) === normalizeRut(b)
}

export function isValidRutFormat(rut: string): boolean {
  return /^\d{7,8}-[\dkK]$/i.test(normalizeRut(rut))
}
```

**Puntos de aplicación:**

| Lugar | Acción |
|---|---|
| `CounterpartiesService.create/update` | `normalizeRut(dto.rut)` antes de guardar |
| `BankCSVImporter` | `normalizeRut()` antes de upsert counterparty |
| `SheetImporter` | Ídem |
| Input RUT en web | Normalizar en `onBlur` |
| Migration de datos | Script one-shot sobre `counterparties` existentes |

**Nombres duplicados:** No se normalizan automáticamente. Upsert usa RUT como clave. Si nombre importado difiere del guardado, conservar nombre en DB y loguear en `AuditLog`. Mantenedor `/contrapartes` muestra alerta si dos registros tienen el mismo RUT normalizado.

---

## Tabla de transacciones

### Columnas

| Columna | Fuente | Estado |
|---|---|---|
| Fecha | `tx.date` | Existente |
| Descripción | `tx.description` | Existente |
| RUT | `tx.counterparty.rut` formateado | **Nuevo** |
| Monto | `tx.amountCLP` | Existente |
| Saldo | Acumulado período (calculado en frontend) | **Nuevo** |
| Fuente | `tx.source` badge | Existente |
| Docs | Count de `tx.documents` + ícono clickeable | **Nuevo** |
| Categoría | `tx.category.name` | Existente |
| Estado | `tx.status` badge editable inline | **Nuevo** |
| Acciones | Lápiz → drawer | Existente |

### Cálculo saldo acumulado

```typescript
const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
let running = 0
const withBalance = sorted.map(tx => {
  running += tx.type === 'INCOME' ? +tx.amountCLP : -tx.amountCLP
  return { ...tx, balance: running }
})
const displayed = [...withBalance].reverse() // mostrar fecha desc
```

### Estado inline

Badge en la celda Estado → popover con opciones `PENDING / PAID / REJECTED / CANCELLED`. Llama `PATCH /transactions/:id` con `{ status }`. Sin modal, sin drawer.

### Layout fix

```diff
- <div className="p-8 max-w-5xl">
+ <div className="p-8 w-full">
```

---

## Gestión de documentos en ReviewDrawer

Nueva sección **"Documentos vinculados"**:

```
[ Factura #1234 | facto.cl | $150.000 ] [×]
[ Boleta Honor. #56 | SII | $80.000  ] [×]
[ + Vincular documento ]
```

- **Vincular:** `Combobox` busca `GET /documents?counterpartyId=X`. Seleccionar → `POST /transaction-documents`.
- **Desvincular:** `DELETE /transaction-documents/:id`
- **Bitácora:** Timeline de `TransactionNote[]` + textarea para agregar nota → `POST /transactions/:id/notes`

---

## Flujo de ingreso desde cartola bancaria

### Egresos (cartola → facturas recibidas)

1. Subir cartola BCI CSV → `POST /importers/bank-csv`
2. Sistema crea `Transaction[source=BANK_CSV, bankStatementId=X]`
3. Auto-match: busca `Document` donde `counterparty.rut` está en descripción de tx Y `totalAmount ≈ tx.amount (±5%)`
4. Sugerencias en panel conciliación
5. Usuario confirma → crea `TransactionDocument`
6. Sin match → tx queda `PENDING` sin documento

### Ingresos (facturas emitidas → cobros)

Flujo inverso. Abono en cartola → sugiere facturas `PENDING` del mismo cliente y monto similar.

### Manual sin factura

Válido. Campo documentos vacío. Estado `PENDING` indica "sin respaldo aún".

---

## Tests unitarios

### `packages/shared` — `rut.test.ts`

```typescript
describe('normalizeRut', () => {
  it('strips dots', () => expect(normalizeRut('11.111.111-1')).toBe('11111111-1'))
  it('handles no dots already', () => expect(normalizeRut('11111111-1')).toBe('11111111-1'))
  it('uppercases DV k', () => expect(normalizeRut('12345678-k')).toBe('12345678-K'))
  it('trims whitespace', () => expect(normalizeRut(' 11111111-1 ')).toBe('11111111-1'))
})

describe('formatRut', () => {
  it('adds dots to 8-digit body', () => expect(formatRut('11111111-1')).toBe('11.111.111-1'))
  it('adds dots to 7-digit body', () => expect(formatRut('1111111-1')).toBe('1.111.111-1'))
  it('is idempotent on already formatted', () => expect(formatRut('11.111.111-1')).toBe('11.111.111-1'))
})

describe('areRutsEqual', () => {
  it('matches with vs without dots', () => expect(areRutsEqual('11.111.111-1', '11111111-1')).toBe(true))
  it('rejects different RUTs', () => expect(areRutsEqual('11111111-1', '22222222-2')).toBe(false))
  it('case insensitive on DV', () => expect(areRutsEqual('12345678-k', '12345678-K')).toBe(true))
})

describe('isValidRutFormat', () => {
  it('accepts valid RUT', () => expect(isValidRutFormat('11111111-1')).toBe(true))
  it('accepts k DV', () => expect(isValidRutFormat('12345678-k')).toBe(true))
  it('rejects no DV', () => expect(isValidRutFormat('11111111')).toBe(false))
})
```

### `apps/api` — `counterparties.service.spec.ts`

```typescript
it('normalizes RUT on create', async () => {
  const result = await service.create({ rut: '11.111.111-1', name: 'Test' })
  expect(result.rut).toBe('11111111-1')
})

it('rejects duplicate normalized RUT', async () => {
  await service.create({ rut: '11111111-1', name: 'A' })
  await expect(service.create({ rut: '11.111.111-1', name: 'B' })).rejects.toThrow()
})

it('upserts on matching normalized RUT during import', async () => {
  await service.create({ rut: '11111111-1', name: 'Original' })
  const result = await service.upsertByRut('11.111.111-1', { name: 'Importado' })
  expect(result.name).toBe('Original')
})
```

### `apps/api` — `transaction-documents.service.spec.ts`

```typescript
it('links document to transaction', async () => {
  const link = await service.link(txId, docId)
  expect(link.transactionId).toBe(txId)
  expect(link.documentId).toBe(docId)
})

it('prevents duplicate link', async () => {
  await service.link(txId, docId)
  await expect(service.link(txId, docId)).rejects.toThrow()
})

it('unlinks document', async () => {
  await service.link(txId, docId)
  await service.unlink(txId, docId)
  const links = await service.findByTransaction(txId)
  expect(links).toHaveLength(0)
})
```

### `apps/api` — `transaction-notes.service.spec.ts`

```typescript
it('creates note with timestamp', async () => {
  const note = await service.addNote(txId, 'Revisado con contador')
  expect(note.content).toBe('Revisado con contador')
  expect(note.createdAt).toBeInstanceOf(Date)
})

it('returns notes ordered oldest first', async () => {
  await service.addNote(txId, 'Primera')
  await service.addNote(txId, 'Segunda')
  const notes = await service.getNotes(txId)
  expect(notes[0].content).toBe('Primera')
  expect(notes[1].content).toBe('Segunda')
})
```

### Frontend — `balance.test.ts`

```typescript
describe('calculateRunningBalance', () => {
  it('accumulates income positive, expense negative', () => {
    const txs = [
      { date: '2026-05-01', type: 'INCOME', amountCLP: '100000' },
      { date: '2026-05-02', type: 'EXPENSE', amountCLP: '30000' },
    ]
    const result = calculateRunningBalance(txs)
    expect(result[0].balance).toBe(100000)
    expect(result[1].balance).toBe(70000)
  })

  it('handles multiple expenses in same day', () => {
    const txs = [
      { date: '2026-05-01', type: 'INCOME', amountCLP: '200000' },
      { date: '2026-05-01', type: 'EXPENSE', amountCLP: '50000' },
      { date: '2026-05-01', type: 'EXPENSE', amountCLP: '50000' },
    ]
    const result = calculateRunningBalance(txs)
    expect(result[result.length - 1].balance).toBe(100000)
  })

  it('returns empty array for no transactions', () => {
    expect(calculateRunningBalance([])).toEqual([])
  })
})
```

---

## Orden de implementación sugerido

1. Schema migration (fundación)
2. RUT utility + tests
3. Data migration (normalizar RUTs existentes)
4. `TransactionDocument` endpoints + tests
5. `TransactionNote` endpoints + tests
6. `BankStatement` registro en importer
7. Tabla UI: columnas nuevas + saldo + layout fix
8. ReviewDrawer: documentos + bitácora
9. Auto-match en conciliación
