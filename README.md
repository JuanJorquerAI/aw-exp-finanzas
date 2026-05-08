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
apps/api/              NestJS API (puerto 3001)
apps/web/              Next.js web (puerto 3000)
packages/database/     Prisma schema + seed + importer core
packages/shared/       Zod schemas compartidos
data/                  JSONs de importación mensual
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
