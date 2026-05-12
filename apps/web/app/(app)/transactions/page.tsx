'use client';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Pencil, FileText, ChevronDown } from 'lucide-react';
import { useTransactions, useCompanies, useUpdateTransactionStatus } from '@/lib/queries';
import { ReviewDrawer } from '@/components/transactions/ReviewDrawer';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import { calculateRunningBalance, type TransactionWithBalance } from '@/lib/balance';
import { formatRut } from '@/lib/counterparty';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtAmount(amount: string, currency: string) {
  const n = parseFloat(amount);
  if (currency === 'CLP') return CLP.format(n);
  return `${currency} ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2 }).format(n)}`;
}

function getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

type TxFilter = 'all' | 'INCOME' | 'EXPENSE';

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  SHEET_IMPORT: 'Sheet',
  BANK_CSV: 'Banco',
  ERP: 'ERP',
  SII: 'SII',
};

const SOURCE_CLS: Record<string, string> = {
  MANUAL: 'dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500',
  SHEET_IMPORT: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  BANK_CSV: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  ERP: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  SII: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
};

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

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const companyCode = searchParams.get('company') ?? 'AW';
  const [y, m] = month.split('-').map(Number);
  const [filter, setFilter] = useState<TxFilter>('all');
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);

  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: allTxs = [], isLoading } = useTransactions(
    company
      ? {
          companyId: company.id,
          dateFrom: new Date(y, m - 1, 1).toISOString().split('T')[0],
          dateTo: new Date(y, m, 0).toISOString().split('T')[0],
        }
      : {},
  );

  const transactions = allTxs.filter((tx: Transaction) => filter === 'all' || tx.type === filter);

  const txsWithBalance = calculateRunningBalance(transactions);

  const totalIncome = allTxs.filter((t: Transaction) => t.type === 'INCOME').reduce((s: number, t: Transaction) => s + Number(t.amountCLP), 0);
  const totalExpense = allTxs.filter((t: Transaction) => t.type === 'EXPENSE').reduce((s: number, t: Transaction) => s + Number(t.amountCLP), 0);

  // Group by date
  const grouped = txsWithBalance.reduce((acc: Record<string, TransactionWithBalance[]>, tx: TransactionWithBalance) => {
    const key = tx.date.split('T')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (isLoading) {
    return <div className="p-8 text-sm dark:text-slate-600 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="p-8 w-full">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">Transacciones</h2>
          <p className="mt-0.5 text-xs dark:text-slate-500 text-slate-400">{companyCode} · {allTxs.length} movimientos</p>
        </div>

        {/* Totals */}
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-xs dark:text-slate-500 text-slate-400">Ingresos</p>
            <p className="text-sm font-semibold text-emerald-500">{CLP.format(totalIncome)}</p>
          </div>
          <div>
            <p className="text-xs dark:text-slate-500 text-slate-400">Egresos</p>
            <p className="text-sm font-semibold text-rose-500">{CLP.format(totalExpense)}</p>
          </div>
          <div>
            <p className="text-xs dark:text-slate-500 text-slate-400">Neto</p>
            <p className={cn('text-sm font-semibold', totalIncome - totalExpense >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {CLP.format(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex rounded-md border dark:border-slate-700 border-slate-200 overflow-hidden w-fit text-xs">
        {([['all', 'Todos', allTxs.length], ['INCOME', 'Ingresos', allTxs.filter((t: Transaction) => t.type === 'INCOME').length], ['EXPENSE', 'Egresos', allTxs.filter((t: Transaction) => t.type === 'EXPENSE').length]] as [TxFilter, string, number][]).map(([v, label, count]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              'px-3 py-1.5 flex items-center gap-1.5 transition-colors',
              filter === v
                ? 'dark:bg-slate-700 bg-slate-100 dark:text-slate-200 text-slate-800 font-semibold'
                : 'dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-50',
            )}
          >
            {label}
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-medium', filter === v ? 'dark:bg-slate-600 bg-slate-200' : 'dark:bg-slate-800 bg-slate-100')}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table grouped by date */}
      {transactions.length === 0 ? (
        <p className="py-12 text-center text-sm dark:text-slate-600 text-slate-400">Sin transacciones para este período</p>
      ) : (
        <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-slate-50">
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-24">Fecha</th>
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Descripción</th>
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500 w-28">RUT</th>
                <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Categoría</th>
                <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-20">Origen</th>
                <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-12">Docs</th>
                <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500 w-32">Monto</th>
                <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500 w-32">Saldo</th>
                <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500 w-24">Estado</th>
                <th className="px-2 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <React.Fragment key={date}>
                  <tr className="dark:bg-slate-900/60 bg-slate-50/80 border-b dark:border-slate-800 border-slate-100">
                    <td colSpan={10} className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider dark:text-slate-500 text-slate-400">
                      {fmtDate(date)}
                    </td>
                  </tr>
                  {grouped[date].map((tx) => (
                    <TxRow key={tx.id} tx={tx} onReview={setReviewTx} />
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReviewDrawer
        transaction={reviewTx}
        open={!!reviewTx}
        onOpenChange={(o) => { if (!o) setReviewTx(null); }}
      />
    </div>
  );
}

const USD = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function TxRow({ tx, onReview }: { tx: TransactionWithBalance; onReview?: (tx: Transaction) => void }) {
  const { mutate: updateStatus } = useUpdateTransactionStatus();
  const isIncome = tx.type === 'INCOME';
  const isExpense = tx.type === 'EXPENSE';
  const source = tx.source ?? 'MANUAL';

  return (
    <tr className="border-b dark:border-slate-800/60 border-slate-100 dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-2.5 dark:text-slate-500 text-slate-400 tabular-nums">{fmtDate(tx.date)}</td>
      <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700 max-w-xs">
        <span className="truncate block">{tx.description}</span>
      </td>
      <td className="px-4 py-2.5 dark:text-slate-500 text-slate-400 text-[11px] tabular-nums">
        {tx.counterparty?.rut ? formatRut(tx.counterparty.rut) : <span className="dark:text-slate-700 text-slate-300">—</span>}
      </td>
      <td className="px-4 py-2.5">
        {tx.category ? (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-500">
            {tx.category.name}
          </span>
        ) : (
          <span className="dark:text-slate-700 text-slate-300">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', SOURCE_CLS[source] ?? SOURCE_CLS.MANUAL)}>
          {SOURCE_LABELS[source] ?? source}
        </span>
      </td>
      <td className="px-4 py-2.5 text-center">
        {tx.documents?.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] dark:text-indigo-400 text-indigo-600 font-medium">
            <FileText className="h-3 w-3" />{tx.documents.length}
          </span>
        ) : (
          <span className="dark:text-slate-700 text-slate-300 text-xs">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
        <span className={cn('flex items-center justify-end gap-1 font-semibold',
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
            <button className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer', STATUS_CLS[tx.status] ?? STATUS_CLS.PENDING)}>
              {STATUS_LABELS[tx.status] ?? tx.status}
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-36 p-1" align="center">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => updateStatus({ id: tx.id, status: s })}
                className={cn('w-full text-left rounded px-2 py-1.5 text-xs transition-colors', tx.status === s ? 'dark:bg-slate-700 bg-slate-100 font-semibold' : 'dark:hover:bg-slate-800 hover:bg-slate-50')}>
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
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
