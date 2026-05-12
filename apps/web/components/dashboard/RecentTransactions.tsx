import Link from 'next/link';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  companyCode: string;
  month: string;
}

export function RecentTransactions({ transactions, companyCode, month }: RecentTransactionsProps) {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  if (recent.length === 0) return null;

  return (
    <div className="rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b dark:border-slate-800 border-slate-100 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">
          Últimos movimientos
        </p>
        <Link
          href={`/transactions?company=${companyCode}&month=${month}`}
          className="text-[10px] dark:text-slate-600 text-slate-400 dark:hover:text-slate-400 hover:text-slate-600 transition-colors"
        >
          Ver todos →
        </Link>
      </div>
      <div className="divide-y dark:divide-slate-800/60 divide-slate-100">
        {recent.map((tx) => {
          const isIncome  = tx.type === 'INCOME';
          const isExpense = tx.type === 'EXPENSE';
          return (
            <div key={tx.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={cn('shrink-0', isIncome ? 'text-emerald-500' : isExpense ? 'text-rose-500' : 'dark:text-slate-500 text-slate-400')}>
                {isIncome  ? <ArrowDownCircle className="h-3.5 w-3.5" /> : <ArrowUpCircle className="h-3.5 w-3.5" />}
              </span>
              <span className="text-[10px] tabular-nums dark:text-slate-600 text-slate-400 w-10 shrink-0">
                {fmtDate(tx.date)}
              </span>
              <span className="flex-1 truncate text-xs dark:text-slate-300 text-slate-700">
                {tx.description}
              </span>
              {tx.counterparty && (
                <span className="text-[10px] dark:text-slate-600 text-slate-400 truncate max-w-[80px]">
                  {tx.counterparty.name}
                </span>
              )}
              <span className={cn('text-xs font-semibold tabular-nums font-mono shrink-0',
                isIncome ? 'text-emerald-500' : isExpense ? 'text-rose-500' : 'dark:text-slate-300 text-slate-700'
              )}>
                {isExpense ? '−' : '+'}{CLP.format(Number(tx.amountCLP))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
