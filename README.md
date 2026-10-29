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

- API: http://localhost:41891
- Web: http://localhost:41890
- Health: http://localhost:41891/health

pnpm viene fijado en `package.json` (`packageManager: pnpm@10.33.2`); Corepack lo usa sin preguntar. Después de un `pnpm install` desde cero, correr `pnpm db:generate`.

## Importar datos del Google Sheet

```bash
pnpm db:import-sheet data/sheet-mayo-2026.json
```

Importar el mismo mes otra vez no duplica nada: cada línea se compara por clave natural (factura: tipo + folio + RUT del cliente; sin folio: tipo + cliente + monto del mes; gastos: glosa del mes; oportunidades: nombre + empresa). Lo que ya existe se informa como `skipped` y no se modifica. La categoría de cada gasto sale primero de la tabla fija del importador y, si no está, de las reglas de categorización.

**Identidad de contrapartes y documentos preexistentes:**
- La identidad de clientes y proveedores se resuelve por RUT canónico (`canonicalRut`: sin puntos ni guiones, con dígito verificador en mayúscula). Si en la base de datos coexisten registros del mismo cliente en distinto formato (ej. importación bancaria sin guion y sheet con puntos), el importador busca todas las contrapartes equivalentes y reutiliza determinísticamente la más antigua sin crear duplicados.
- Si una factura del sheet coincide en empresa, tipo, folio y cliente con un documento registrado manualmente en el sistema (por ejemplo, creado vía API sin transacción asociada), el importador la omite como `skipped` para prevenir duplicar documentos tributarios y cuentas por cobrar. En ese caso, la transacción de pago bancaria debe crearse o vincularse directamente al documento existente.

## Limpiar duplicados de importaciones antiguas

```bash
pnpm db:dedupe-sheet --month 2026-05           # modo prueba: solo muestra qué borraría
pnpm db:dedupe-sheet --month 2026-05 --apply   # borra (respaldar la base antes)
```

Conserva la copia editada a mano (pagada, movida de empresa, con abonos o notas) y borra la intacta. Si dos copias tienen información distinta, no borra nada de ese grupo y lo lista como conflicto para revisar a mano.

## Tests

```bash
pnpm --filter @aw-finanzas/database test   # unitarios
pnpm db:test-up                            # Postgres desechable en :5435 (sin volumen)
pnpm test:db                               # integración: importa mayo dos veces, limpieza
```

Los tests de integración se niegan a correr si `TEST_DATABASE_URL` no apunta a una base `*_test`.

## Estructura

```
apps/api/              NestJS API (puerto 41891)
apps/web/              Next.js web (puerto 41890)
packages/database/     Prisma schema + seed + importer core
packages/shared/       Zod schemas compartidos
data/                  JSONs de importación mensual
```

## Endpoints principales

| Endpoint                                     | Descripción                    |
| -------------------------------------------- | ------------------------------ |
| `GET /health`                                | Estado del servidor y DB       |
| `GET /companies`                             | Empresas (AW, EXPRO)           |
| `GET /categories?tree=true`                  | Categorías jerárquicas         |
| `GET /transactions?type=EXPENSE&companyId=X` | Transacciones filtradas        |
| `PATCH /transactions/:id/paid`               | Marcar transacción como pagada |
| `GET /opportunities`                         | Pipeline de oportunidades      |
| `POST /importers/sheet`                      | Importar JSON del Google Sheet |

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar valores.

## Roadmap

- **Phase 0** ✅ Monorepo, API, web placeholder, importer
- **Phase 1** Dashboard mensual, CxC/CxP, formularios
- **Phase 2** Importer cartolas bancarias CSV, categorización automática
- **Phase 3** Auth multi-usuario, deploy AWS Lightsail, integración SII
- **Phase 4** Integración bidireccional ExpandERP
