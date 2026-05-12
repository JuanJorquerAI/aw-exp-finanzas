'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, List, Users } from 'lucide-react';
import { useTransactions, useCompanies } from '@/lib/queries';
import { ReviewDrawer } from './ReviewDrawer';
import { CxCActions } from './CxCActions';
import { CxPActions } from './CxPActions';
import { cn } from '@/lib/utils';
import { effectiveDueDate, getAgingStatus, getDaysLabel, type AgingStatus } from '@/lib/aging';
import type { Transaction } from '@/lib/types';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

type ViewMode = 'list' | 'counterparty';

type EnrichedTx = Transaction & { _due: Date; _aging: AgingStatus; _daysLabel: string };

const AGING_DOT: Record<AgingStatus, string> = {
  OVERDUE:  'bg-rose-500',
  DUE_SOON: 'bg-amber-400',
  OK:       'bg-emerald-500',
};

const AGING_ROW: Record<AgingStatus, string> = {
  OVERDUE:  'dark:bg-rose-950/20 bg-rose-50/60',
  DUE_SOON: 'dark:bg-amber-950/20 bg-amber-50/40',
  OK:       '',
};

const AGING_DAYS: Record<AgingStatus, string> = {
  OVERDUE:  'text-rose-500',
  DUE_SOON: 'text-amber-500',
  OK:       'dark:text-slate-400 text-slate-500',
};

interface CxPageProps {
  type: 'INCOME' | 'EXPENSE';
  title: string;
  subtitle: string;
}

export function CxPage({ type, title, subtitle }: CxPageProps) {
  const searchParams = useSearchParams();
  const companyCode = searchParams.get('company') ?? 'AW';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);

  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: allTxs = [], isLoading } = useTransactions(
    company ? { companyId: company.id, type, status: 'PENDING' } : {},
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const txs = useMemo((): EnrichedTx[] => {
    const order: Record<AgingStatus, number> = { OVERDUE: 0, DUE_SOON: 1, OK: 2 };
    return [...allTxs]
      .map((tx) => {
        const due = effectiveDueDate(tx);
        const aging = getAgingStatus(due, today);
        return { ...tx, _due: due, _aging: aging, _daysLabel: getDaysLabel(due, today) };
      })
      .sort((a, b) => order[a._aging] - order[b._aging] || a._due.getTime() - b._due.getTime());
  }, [allTxs, today]);

  const totalAmount   = txs.reduce((s, t) => s + Number(t.amountCLP), 0);
  const overdue       = txs.filter((t) => t._aging === 'OVERDUE');
  const dueSoon       = txs.filter((t) => t._aging === 'DUE_SOON');
  const overdueAmount = overdue.reduce((s, t) => s + Number(t.amountCLP), 0);
  const dueSoonAmount = dueSoon.reduce((s, t) => s + Number(t.amountCLP), 0);

  const byCounterparty = useMemo(() => {
    const groups = new Map<string, { name: string; txs: EnrichedTx[] }>();
    for (const tx of txs) {
      const key  = tx.counterparty?.id ?? '__none__';
      const name = tx.counterparty?.name ?? 'Sin contraparte';
      if (!groups.has(key)) groups.set(key, { name, txs: [] });
      groups.get(key)!.txs.push(tx);
    }
    return Array.from(groups.values()).sort((a, b) => {
      const worst = (g: { txs: EnrichedTx[] }) =>
        g.txs.some((t) => t._aging === 'OVERDUE') ? 0 :
        g.txs.some((t) => t._aging === 'DUE_SOON') ? 1 : 2;
      return worst(a) - worst(b);
    });
  }, [txs]);

  if (isLoading) {
    return <div className="p-8 text-sm dark:text-slate-600 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="p-8 w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs dark:text-slate-500 text-slate-400">{companyCode} · {subtitle}</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border dark:border-slate-700 border-slate-200 overflow-hidden text-xs">
          {(['list', 'counterparty'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 transition-colors',
                viewMode === v
                  ? 'dark:bg-slate-700 bg-slate-100 dark:text-slate-200 text-slate-800 font-semibold'
                  : 'dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-50',
              )}
            >
              {v === 'list' ? <List className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {v === 'list' ? 'Detalle' : 'Por contraparte'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Total pendiente" value={CLP.format(totalAmount)} count={txs.length} variant="default" />
        <SummaryCard label="Vencidas" value={CLP.format(overdueAmount)} count={overdue.length} variant="red" />
        <SummaryCard label="Vencen esta semana" value={CLP.format(dueSoonAmount)} count={dueSoon.length} variant="amber" />
      </div>

      {txs.length === 0 ? (
        <p className="py-12 text-center text-sm dark:text-slate-600 text-slate-400">Sin pendientes</p>
      ) : viewMode === 'list' ? (
        <ListTable txs={txs} type={type} onEdit={setReviewTx} />
      ) : (
        <CounterpartyTable groups={byCounterparty} type={type} onEdit={setReviewTx} />
      )}

      <ReviewDrawer
        transaction={reviewTx}
        open={!!reviewTx}
        onOpenChange={(o) => { if (!o) setReviewTx(null); }}
      />
    </div>
  );
}

/* ── Summary card ── */
function SummaryCard({
  label, value, count, variant,
}: {
  label: string; value: string; count: number; variant: 'default' | 'red' | 'amber';
}) {
  const colors = {
    default: { value: 'dark:text-slate-100 text-slate-900', count: 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500' },
    red:     { value: 'text-rose-500', count: 'bg-rose-500/10 text-rose-500' },
    amber:   { value: 'text-amber-500', count: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  }[variant];

  return (
    <div className="rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-white p-4">
      <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">{label}</p>
      <p className={cn('text-base font-bold font-mono', colors.value)}>{count > 0 ? value : '—'}</p>
      <span className={cn('mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', colors.count)}>
        {count} {count === 1 ? 'ítem' : 'ítems'}
      </span>
    </div>
  );
}

/* ── List table ── */
function ListTable({
  txs, type, onEdit,
}: {
  txs: EnrichedTx[]; type: 'INCOME' | 'EXPENSE'; onEdit: (tx: Transaction) => void;
}) {
  return (
    <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-x-auto">
      <table className="w-full min-w-[860px] text-xs">
        <thead>
          <tr className="border-b dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-slate-50">
            <th className="px-4 py-2.5 w-4" />
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-24">Fecha</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Descripción</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Contraparte</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-28">Vence</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-36">Días</th>
            <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500">Monto</th>
            <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
          {txs.map((tx) => (
            <tr key={tx.id} className={cn('transition-colors dark:hover:bg-slate-800/30 hover:bg-slate-50/60', AGING_ROW[tx._aging])}>
              <td className="pl-4 py-2.5">
                <span className={cn('block h-2 w-2 rounded-full', AGING_DOT[tx._aging])} />
              </td>
              <td className="px-4 py-2.5 dark:text-slate-500 text-slate-400 tabular-nums whitespace-nowrap">{fmtDate(tx.date)}</td>
              <td className="px-4 py-2.5 dark:text-slate-200 text-slate-800 max-w-xs">
                <span className="truncate block">{tx.description}</span>
              </td>
              <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500">
                {tx.counterparty?.name ?? <span className="italic dark:text-slate-600 text-slate-400">—</span>}
              </td>
              <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500 tabular-nums whitespace-nowrap">
                {fmtDate(tx._due.toISOString())}
                {!tx.dueDate && <span className="ml-1 dark:text-slate-600 text-slate-400 text-[10px]">(est.)</span>}
              </td>
              <td className={cn('px-4 py-2.5 font-medium whitespace-nowrap', AGING_DAYS[tx._aging])}>
                {tx._daysLabel}
              </td>
              <td className="px-4 py-2.5 text-right font-mono font-semibold dark:text-slate-200 text-slate-800 whitespace-nowrap">
                {CLP.format(Number(tx.amountCLP))}
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  {type === 'INCOME' ? <CxCActions transaction={tx} /> : <CxPActions transaction={tx} />}
                  <button
                    onClick={() => onEdit(tx)}
                    className="rounded p-1 dark:text-slate-600 text-slate-300 dark:hover:text-indigo-400 hover:text-indigo-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Counterparty table ── */
function CounterpartyTable({
  groups, onEdit,
}: {
  groups: { name: string; txs: EnrichedTx[] }[];
  type: 'INCOME' | 'EXPENSE';
  onEdit: (tx: Transaction) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  }

  return (
    <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-slate-50">
            <th className="px-4 py-2.5 w-4" />
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Contraparte</th>
            <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-20">Ítems</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-36">Más urgente</th>
            <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500">Total</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const worstAging = g.txs.some((t) => t._aging === 'OVERDUE') ? 'OVERDUE' :
                               g.txs.some((t) => t._aging === 'DUE_SOON') ? 'DUE_SOON' : 'OK';
            const mostUrgent = g.txs[0];
            const total = g.txs.reduce((s, t) => s + Number(t.amountCLP), 0);
            const isOpen = expanded.has(g.name);

            return (
              <>
                <tr
                  key={g.name}
                  onClick={() => toggle(g.name)}
                  className={cn(
                    'cursor-pointer border-b dark:border-slate-800/60 border-slate-100 transition-colors',
                    'dark:hover:bg-slate-800/30 hover:bg-slate-50',
                    AGING_ROW[worstAging],
                  )}
                >
                  <td className="pl-4 py-3">
                    <span className={cn('block h-2 w-2 rounded-full', AGING_DOT[worstAging])} />
                  </td>
                  <td className="px-4 py-3 dark:text-slate-200 text-slate-800 font-medium">
                    <span className="flex items-center gap-2">
                      <span className={cn('text-[10px] transition-transform', isOpen && 'rotate-90')}>▶</span>
                      {g.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center dark:text-slate-400 text-slate-500">{g.txs.length}</td>
                  <td className={cn('px-4 py-3 font-medium', AGING_DAYS[worstAging])}>
                    {mostUrgent._daysLabel}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold dark:text-slate-200 text-slate-800">
                    {CLP.format(total)}
                  </td>
                </tr>

                {isOpen && g.txs.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b dark:border-slate-800/40 border-slate-100 dark:bg-slate-900/20 bg-slate-50/50"
                  >
                    <td className="pl-6 py-2">
                      <span className={cn('block h-1.5 w-1.5 rounded-full', AGING_DOT[tx._aging])} />
                    </td>
                    <td className="px-4 py-2 dark:text-slate-300 text-slate-700 pl-8 max-w-xs">
                      <span className="truncate block">{tx.description}</span>
                      <span className="dark:text-slate-600 text-slate-400">{fmtDate(tx.date)}</span>
                    </td>
                    <td />
                    <td className={cn('px-4 py-2', AGING_DAYS[tx._aging])}>{tx._daysLabel}</td>
                    <td className="px-4 py-2 text-right font-mono dark:text-slate-300 text-slate-700">
                      <div className="flex items-center justify-end gap-2">
                        {CLP.format(Number(tx.amountCLP))}
                        <button
                          onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                          className="rounded p-0.5 dark:text-slate-600 text-slate-400 dark:hover:text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
