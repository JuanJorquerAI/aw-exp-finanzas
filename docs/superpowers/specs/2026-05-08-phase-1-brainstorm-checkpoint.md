# Phase 1 Brainstorm — Checkpoint

**Estado**: Secciones 1 y 2 aprobadas. Falta sección 3 (API), testing, y redactar el spec completo.

## Decisiones confirmadas

| Tema | Decisión |
|------|----------|
| Navegación | Sidebar fijo |
| Dashboard | Vista por empresa — tarjetas separadas AW y EXPRO con resultado + total combinado abajo |
| CxC/CxP marcado | Botón "✓ Pagar" inline por fila, sin confirmación |
| Form nueva transacción | Drawer lateral (desliza desde la derecha) |
| Toggle USD/CLP | Sin toggle global — cada transacción muestra su moneda original |
| Implementación | React Query (client components + mutations + invalidateQueries) |
| Estado global | URL como fuente de verdad (`?company=AW&month=2026-05`) |

## Estructura de rutas aprobada

```
apps/web/
├── app/
│   └── (app)/
│       ├── layout.tsx          — AppLayout: sidebar + main
│       ├── dashboard/page.tsx
│       ├── cxc/page.tsx
│       ├── cxp/page.tsx
│       └── transactions/page.tsx
├── components/
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   └── AppProviders.tsx
│   ├── dashboard/
│   │   ├── CompanySummaryCard.tsx
│   │   └── MonthTotalBar.tsx
│   └── transactions/
│       ├── TransactionTable.tsx
│       ├── MarkPaidButton.tsx
│       └── NewTransactionDrawer.tsx
└── lib/
    ├── api.ts
    └── queries.ts
```

## Flujo de datos aprobado

- AppSidebar: lee `?company` y `?month`, selector empresa + mes en URL
- Dashboard: `useQuery` → `GET /transactions?companyId=X&dateFrom=Y&dateTo=Z`, totales calculados en cliente
- CxC/CxP: `useQuery` → `GET /transactions?type=X&status=PENDING`, `MarkPaidButton` usa `useMutation` → `PATCH /:id/paid` → `invalidateQueries`
- NewTransactionDrawer: `useMutation` → `POST /transactions` → cierra drawer + invalida queries

## Adiciones API pendientes de diseñar

- `GET /transactions/summary?companyId=X&month=YYYY-MM` — totales para dashboard
- `POST /transactions` — DTO necesita `allocations[]` para splits multi-empresa

## Pendiente en brainstorm

- [ ] Sección 3: API additions detalladas
- [ ] Sección 4: Testing approach
- [ ] Escribir design doc completo
- [ ] Usuario revisa spec
- [ ] Transición a writing-plans
