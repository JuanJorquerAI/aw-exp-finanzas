# aw-finanzas — Prisma Schema Completo

> **Stack**: NestJS + Prisma + PostgreSQL + Next.js 14
> **Multi-empresa nativo** (AplicacionesWeb + Expande PRO + futuras)
> **Multi-moneda** (CLP, USD, UF)
> **Listo para integrar con ExpandERP** vía `externalId` en entidades clave

---

## Decisiones de diseño

1. **`Transaction` es la entidad central**: cada movimiento de dinero (entrada o salida) es una transaction. CxC y CxP son views derivadas (transactions con `status != PAID`).
2. **`TransactionAllocation`** permite dividir un gasto entre empresas (ej: contador 50% AW / 50% EXPRO).
3. **`Document`** modela facturas chilenas (Afecta/Exenta/Boleta/NC) con neto+IVA+total.
4. **`Opportunity`** es el pipeline de proyectos por cerrar (AdOnTheGo, Casino Dreams, etc.).
5. **`source`** en transactions identifica origen (MANUAL, SHEET_IMPORT, BANK_CSV, ERP, SII) → permite reconciliar sin duplicar cuando se conecte el ERP.
6. **`externalId`** en Counterparty, Document y Transaction → mapeo bidireccional con ExpandERP el día que se integre.

---

## schema.prisma

```prisma
// ============================================================================
// aw-finanzas — schema.prisma
// ============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// ENUMS
// ============================================================================

enum TransactionType {
  INCOME      // Ingreso (cobro de factura, venta)
  EXPENSE     // Egreso (pago a proveedor, sueldo)
  TRANSFER    // Transferencia entre cuentas propias
}

enum TransactionStatus {
  PENDING     // Por pagar / por cobrar
  PAID        // Pagado / cobrado
  RECONCILED  // Conciliado contra cartola bancaria
  CANCELLED   // Anulado
}

enum TransactionSource {
  MANUAL          // Capturado manualmente en la app
  SHEET_IMPORT    // Importado del Google Sheet inicial
  BANK_CSV        // Importado de cartola bancaria
  ERP             // Vino de ExpandERP (cuando se integre)
  SII             // Vino del SII (cuando se integre)
}

enum DocumentType {
  AFECTA          // Factura afecta (con IVA)
  EXENTA          // Factura exenta
  BOLETA          // Boleta
  NOTA_CREDITO    // Nota de crédito
  NOTA_DEBITO     // Nota de débito
  HONORARIOS      // Boleta de honorarios
}

enum Currency {
  CLP
  USD
  UF
  EUR
}

enum CounterpartyType {
  CUSTOMER        // Cliente
  SUPPLIER        // Proveedor
  EMPLOYEE        // Trabajador (sueldos)
  GOVERNMENT      // SII, previred, etc.
  BANK            // Bancos (créditos, comisiones)
  OTHER
}

enum AccountType {
  BANK_CHECKING   // Cuenta corriente
  BANK_SAVINGS    // Cuenta de ahorro
  CREDIT_CARD     // Tarjeta de crédito (Visa)
  CASH            // Caja
  DIGITAL_WALLET  // MercadoPago, Webpay, etc.
  LOAN            // Crédito (BCI, Fogape)
}

enum OpportunityStage {
  PROSPECTING     // Prospecto inicial
  PROPOSAL_SENT   // Propuesta enviada
  NEGOTIATION     // En negociación
  WON             // Ganado (se convierte en proyecto/factura)
  LOST            // Perdido
  ON_HOLD         // En pausa
}

// ============================================================================
// CORE ENTITIES
// ============================================================================

model Company {
  id          String   @id @default(cuid())
  name        String   @unique             // "AplicacionesWeb", "Expande PRO"
  shortCode   String   @unique             // "AW", "EXPRO"
  rut         String?                       // RUT chileno
  legalName   String?                       // Razón social completa
  address     String?
  email       String?
  phone       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  accounts        Account[]
  transactions    Transaction[]
  allocations     TransactionAllocation[]
  documents       Document[]
  opportunities   Opportunity[]

  @@map("companies")
}

model Account {
  id            String      @id @default(cuid())
  companyId     String
  name          String                          // "Banco Estado CC", "Visa", "Caja"
  type          AccountType
  currency      Currency    @default(CLP)
  bankName      String?                          // "Banco Estado", "BCI"
  accountNumber String?                          // Últimos 4 dígitos
  initialBalance Decimal    @default(0) @db.Decimal(18, 2)
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  company       Company     @relation(fields: [companyId], references: [id])
  transactions  Transaction[]

  @@index([companyId])
  @@map("accounts")
}

model Counterparty {
  id          String           @id @default(cuid())
  type        CounterpartyType
  name        String                              // Razón social o nombre
  rut         String?          @unique             // RUT chileno
  email       String?
  phone       String?
  address     String?
  externalId  String?                             // ID en ExpandERP (futuro)
  notes       String?
  isActive    Boolean          @default(true)
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  documents       Document[]
  transactions    Transaction[]
  opportunities   Opportunity[]

  @@index([rut])
  @@index([externalId])
  @@map("counterparties")
}

model Category {
  id          String    @id @default(cuid())
  name        String                                  // "Sueldos", "IVA+PPM", "Hosting"
  type        TransactionType                         // INCOME o EXPENSE
  parentId    String?                                 // Para jerarquía
  color       String?                                 // Hex para UI
  icon        String?                                 // emoji o lucide name
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")
  transactions Transaction[]
  rules       CategorizationRule[]

  @@unique([name, parentId])
  @@index([type])
  @@map("categories")
}

model Document {
  id              String        @id @default(cuid())
  companyId       String                                  // Empresa que emite o recibe
  counterpartyId  String?
  type            DocumentType
  number          String?                                 // Nro factura
  issueDate       DateTime?
  dueDate         DateTime?
  netAmount       Decimal       @db.Decimal(18, 2)        // Neto
  ivaAmount       Decimal       @default(0) @db.Decimal(18, 2)
  totalAmount     Decimal       @db.Decimal(18, 2)        // Total
  currency        Currency      @default(CLP)
  description     String?                                 // Glosa SII
  detail          String?                                 // Detalle interno
  isSent          Boolean       @default(false)           // "Enviada" en sheet
  externalId      String?                                 // ID en SII o ExpandERP
  pdfUrl          String?                                 // Link al PDF si existe
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  company         Company       @relation(fields: [companyId], references: [id])
  counterparty    Counterparty? @relation(fields: [counterpartyId], references: [id])
  transactions    Transaction[]                           // Una factura puede tener N pagos (cuotas)

  @@index([companyId])
  @@index([counterpartyId])
  @@index([externalId])
  @@map("documents")
}

model Transaction {
  id              String              @id @default(cuid())
  companyId       String                                          // Empresa "principal" del movimiento
  accountId       String?                                          // Desde qué cuenta (null si aún no pagado)
  counterpartyId  String?
  categoryId      String?
  documentId      String?                                          // FK a factura asociada
  type            TransactionType
  status          TransactionStatus   @default(PENDING)
  source          TransactionSource   @default(MANUAL)

  // Montos
  amount          Decimal             @db.Decimal(18, 2)           // En currency original
  currency        Currency            @default(CLP)
  exchangeRate    Decimal?            @db.Decimal(18, 4)           // Si != CLP
  amountCLP       Decimal             @db.Decimal(18, 2)           // Calculado para reportes

  // Fechas
  date            DateTime                                          // Fecha del movimiento (devengado)
  dueDate         DateTime?                                         // Fecha vencimiento (CxC/CxP)
  paidAt          DateTime?                                         // Fecha real de pago

  // Metadata
  description     String                                          // Item / glosa
  comment         String?                                         // Comentario libre
  externalId      String?                                         // ID en ERP/banco
  attachmentUrl   String?

  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  company         Company             @relation(fields: [companyId], references: [id])
  account         Account?            @relation(fields: [accountId], references: [id])
  counterparty    Counterparty?       @relation(fields: [counterpartyId], references: [id])
  category        Category?           @relation(fields: [categoryId], references: [id])
  document        Document?           @relation(fields: [documentId], references: [id])
  allocations     TransactionAllocation[]

  @@index([companyId])
  @@index([date])
  @@index([status])
  @@index([dueDate])
  @@index([externalId])
  @@map("transactions")
}

// Permite dividir UN movimiento entre VARIAS empresas
// Ej: Pago al contador $80k → AW 50% / EXPRO 50%
model TransactionAllocation {
  id             String      @id @default(cuid())
  transactionId  String
  companyId      String
  percentage     Decimal     @db.Decimal(5, 2)               // 0.00 a 100.00
  amountCLP      Decimal     @db.Decimal(18, 2)              // Pre-calculado

  transaction    Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  company        Company     @relation(fields: [companyId], references: [id])

  @@unique([transactionId, companyId])
  @@index([companyId])
  @@map("transaction_allocations")
}

// ============================================================================
// PIPELINE / OPPORTUNITY
// ============================================================================

model Opportunity {
  id                 String           @id @default(cuid())
  companyId          String                                          // Empresa que vendería
  counterpartyId     String?                                         // Cliente potencial (puede ser null al inicio)
  name               String                                          // "AdOnTheGo", "Casino Dreams"
  description        String?
  stage              OpportunityStage @default(PROSPECTING)
  estimatedAmount    Decimal          @db.Decimal(18, 2)
  currency           Currency         @default(CLP)
  probability        Int              @default(50)                   // 0-100
  expectedCloseDate  DateTime?
  actualCloseDate    DateTime?
  notes              String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  company            Company          @relation(fields: [companyId], references: [id])
  counterparty       Counterparty?    @relation(fields: [counterpartyId], references: [id])

  @@index([companyId])
  @@index([stage])
  @@map("opportunities")
}

// ============================================================================
// SUPPORT
// ============================================================================

// Reglas de categorización automática (regex sobre descripción → categoría)
// Ej: "TRANSBANK" → categoryId: "Ingresos > Ventas POS"
model CategorizationRule {
  id          String   @id @default(cuid())
  pattern     String                                                // Regex o substring
  isRegex     Boolean  @default(false)
  categoryId  String
  priority    Int      @default(0)                                  // Mayor = se evalúa primero
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  category    Category @relation(fields: [categoryId], references: [id])

  @@map("categorization_rules")
}

// Tipos de cambio diarios (para reportes históricos)
model ExchangeRate {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  fromCurrency Currency
  toCurrency  Currency
  rate        Decimal  @db.Decimal(18, 6)
  source      String?                                                // "SII", "Mindicador", "Manual"

  @@unique([date, fromCurrency, toCurrency])
  @@index([date])
  @@map("exchange_rates")
}
```

---

## Seed inicial — categorías derivadas de tu sheet

```typescript
// prisma/seed.ts (extracto)

const categoriesIncome = [
  { name: 'Servicios recurrentes', type: 'INCOME', children: [
    'Fee mensual web',
    'Hosting / Mailhosting',
    'SEO / SEM',
    'Soporte ERP',
  ]},
  { name: 'Proyectos one-time', type: 'INCOME', children: [
    'Desarrollo web',
    'Implementación ERP',
    'Consultoría',
  ]},
  { name: 'Comisiones', type: 'INCOME', children: [
    'Ventas web (% sobre ventas cliente)',
  ]},
];

const categoriesExpense = [
  { name: 'Sueldos y honorarios', type: 'EXPENSE', children: [
    'Sueldo socios',
    'Sueldo developers',
    'Honorarios externos (contador, abogado)',
  ]},
  { name: 'Tributarios', type: 'EXPENSE', children: [
    'IVA + PPM',
    'F29',
    'Pagos previsionales',
  ]},
  { name: 'Financieros', type: 'EXPENSE', children: [
    'Cuota Fogape',
    'Préstamo BCI',
    'Comisiones bancarias',
    'Tarjeta Visa',
  ]},
  { name: 'Software / SaaS', type: 'EXPENSE', children: [
    'Canva',
    'Google Workspace',
    'ChatGPT',
    'Claude',
    'Notion',
    'Otros SaaS',
  ]},
  { name: 'Operacionales', type: 'EXPENSE', children: [
    'Hosting propio',
    'Mails corporativos',
    'Otros',
  ]},
];
```

---

## Vistas / queries derivadas (sin tabla nueva)

**Cuentas por pagar (CxP)**:
```sql
SELECT * FROM transactions
WHERE type = 'EXPENSE' AND status = 'PENDING'
ORDER BY due_date ASC;
```

**Cuentas por cobrar (CxC)**:
```sql
SELECT * FROM transactions
WHERE type = 'INCOME' AND status = 'PENDING'
ORDER BY due_date ASC;
```

**Resumen mensual por empresa** (con allocations):
```sql
SELECT
  c.short_code,
  DATE_TRUNC('month', t.date) AS month,
  t.type,
  SUM(ta.amount_clp) AS total
FROM transactions t
JOIN transaction_allocations ta ON ta.transaction_id = t.id
JOIN companies c ON c.id = ta.company_id
GROUP BY c.short_code, month, t.type
ORDER BY month DESC, c.short_code;
```

**Pipeline ponderado**:
```sql
SELECT
  company_id,
  SUM(estimated_amount * probability / 100) AS weighted_pipeline
FROM opportunities
WHERE stage NOT IN ('WON', 'LOST')
GROUP BY company_id;
```

---

## Mapeo desde tu Google Sheet actual

### Sección "Pagos" (B-G) → `Transaction` con `type: EXPENSE`

| Sheet column | Maps to |
|---|---|
| `ITEM` | `transaction.description` |
| `MONTO` | `transaction.amount` (CLP) |
| `Pagado` | Si "Si" → `status: PAID`; "No" → `PENDING` |
| `Comentario` | `transaction.comment` |
| `Por pagar` | (calculado, no se guarda) |
| `Empresa` (AW / EXPRO / "AW, EXPRO") | Si tiene 1 empresa → `companyId` directo + 1 allocation 100%. Si tiene varias → 1 allocation 50/50 |

### Sección "Facturación" (I-U) → `Document` + `Transaction` con `type: INCOME`

| Sheet column | Maps to |
|---|---|
| `RUT` | `counterparty.rut` (crear si no existe) |
| `Nro factura` | `document.number` |
| `Tipo factura` | `document.type` (AFECTA / EXENTA) |
| `Empresa` (col L, ej "CyR", "ICB SA") | `counterparty.name` |
| `Servicio en facto` | `document.description` |
| `Neto` / `IVA` / `Total` | `document.netAmount` / `ivaAmount` / `totalAmount` |
| `Enviada` | `document.isSent` |
| `Fecha de pago` | Si tiene fecha → `transaction.paidAt` + `status: PAID` |
| `Glosa` | `document.description` |
| `Detalle` | `document.detail` |

> **Nota**: La columna "Empresa" emisora (¿AW o EXPRO?) no está explícita en el sheet de facturación. El importer asumirá AW por defecto y permitirá corregir manual luego.

### Sección "Desglose VISA" → `Transaction` con `currency: USD` o `CLP`

Cada fila es una transaction recurrente con `category: Software/SaaS`, `account: Visa`.

### Sección "Proyectos por salir" → `Opportunity`

| Sheet column | Maps to |
|---|---|
| `Nombre del proyecto` | `opportunity.name` |
| `Monto` | `opportunity.estimatedAmount` |

Stage default: `PROPOSAL_SENT`, probability default: 50%.
