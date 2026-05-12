# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

**aw-finanzas**: Sistema de gestión financiera multi-empresa (AplicacionesWeb + Expande PRO) que reemplaza un Google Sheet. Stack idéntico al ERP ExpandERP del usuario para mantener consistencia.

Owner: Juan (founder AplicacionesWeb / Expande PRO). Prefiere código que él pueda mantener solo, sin sobre-ingeniería. Trabaja en bloques de 30-60 min. Comunicación directa en español.

## Stack

```
Node: 20 LTS
Package manager: pnpm (workspaces)
Backend: NestJS 10 + Prisma 5 + PostgreSQL 16
Frontend: Next.js 14 (App Router) + React 18 + Tailwind 3 + shadcn/ui (estilo New York, color Slate)
DB local: Docker (docker-compose.yml en root)
Validation: zod (packages/shared, compartido entre api y web)
TypeScript: strict mode en todos los packages
```

## Comandos

```bash
# Setup inicial
pnpm install
docker-compose up -d
pnpm db:migrate          # prisma migrate dev
pnpm db:seed             # tsx prisma/seed.ts
pnpm dev                 # api en :3001, web en :3000

# Database
pnpm --filter @aw-finanzas/database prisma migrate dev --name <nombre>
pnpm --filter @aw-finanzas/database prisma generate
pnpm --filter @aw-finanzas/database db:seed

# Importer del sheet
pnpm db:import-sheet data/sheet-mayo-2026.json

# Build
pnpm build               # todos los packages
pnpm --filter api build
pnpm --filter web build
```

## Estructura del monorepo

```
aw-finanzas/
├── apps/api/            # NestJS — puerto 3001
├── apps/web/            # Next.js — puerto 3000
├── packages/database/   # Prisma schema + client singleton + seed
├── packages/shared/     # Schemas zod compartidos (Transaction, Document, etc.)
├── data/                # JSONs de importación (sheet-mayo-2026.json, etc.)
└── docker-compose.yml   # postgres:16 en 5432
```

## Arquitectura clave

### Entidad central: `Transaction`

Todo movimiento de dinero es una `Transaction`. CxC y CxP son vistas derivadas (transactions con `status != PAID`). No hay tablas separadas para CxC/CxP.

### Multi-empresa via `TransactionAllocation`

Un gasto compartido (ej: contador $80k entre AW y EXPRO) crea **una sola Transaction** con **dos TransactionAllocation** (50% c/u). Los reportes por empresa siempre agregan sobre `transaction_allocations`, no sobre `transactions` directamente.

### `source` en Transaction

Identifica origen: `MANUAL | SHEET_IMPORT | BANK_CSV | ERP | SII`. Permite reconciliar sin duplicar cuando se conecte ExpandERP o el SII.

### `externalId` en Counterparty, Document, Transaction

Reservado para mapeo bidireccional con ExpandERP (Phase 4).

### Importer del Google Sheet

`POST /importers/sheet` recibe JSON estructurado con secciones `payments`, `invoices`, `visa`, `opportunities`. Corre dentro de `prisma.$transaction()`. Retorna summary con conteos. También disponible como CLI (`pnpm db:import-sheet`).

## Módulos NestJS (apps/api)

| Módulo | Endpoints principales |
|--------|----------------------|
| CompaniesModule | GET/POST /companies |
| CounterpartiesModule | CRUD /counterparties |
| CategoriesModule | GET /categories (árbol), POST /categories |
| AccountsModule | CRUD /accounts |
| DocumentsModule | CRUD /documents |
| TransactionsModule | CRUD /transactions + filtros (companyId, dateFrom, dateTo, type, status) |
| OpportunitiesModule | CRUD /opportunities |
| ImportersModule | POST /importers/sheet |
| Health | GET /health → `{ status: "ok", db: "connected" }` |

## Reglas críticas

- **pnpm únicamente** — nunca npm ni yarn
- **TypeScript strict** — sin `any` salvo justificación comentada
- **No avanzar al siguiente paso si el anterior tiene errores** — pedir validación a Juan
- **Commits por cada paso completado**, mensajes claros en español
- **No instalar librerías no listadas** sin justificar
- **No implementar dashboard, auth, ni deploy** — eso es Phase 1+
- **Logs del seed e importer en español**
- Le pediré a Codex y a Antigravity que me valide si el código es correcto.

## Variables de entorno

Ver `.env.example`. Variables requeridas:
- `DATABASE_URL` — PostgreSQL connection string
- `API_PORT=3001`
- `WEB_PORT=3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`

## Checklist de validación (Phase 0)

```bash
docker ps                                              # postgres corriendo
curl http://localhost:3001/health                      # {"status":"ok","db":"connected"}
curl http://localhost:3001/companies                   # AW + EXPRO
curl http://localhost:3001/categories                  # árbol de categorías
pnpm db:import-sheet data/sheet-mayo-2026.json        # sin errores
curl "http://localhost:3001/transactions?type=EXPENSE" # 19 registros (14 payments + 5 visa)
curl "http://localhost:3001/transactions?type=INCOME"  # 14 registros
curl http://localhost:3001/opportunities               # 4 registros
```

## Roadmap

- **Phase 0** (actual): Monorepo + API + Web placeholder + Prisma + Seed + Importer
- **Phase 1**: Dashboard resumen mensual, vistas CxC/CxP, form nueva transacción, toggle USD/CLP
- **Phase 2**: Importer cartolas bancarias CSV, categorización automática, alertas WhatsApp/email
- **Phase 3**: Auth multi-usuario, deploy AWS Lightsail, integración SII
- **Phase 4**: Webhook bidireccional con ExpandERP
