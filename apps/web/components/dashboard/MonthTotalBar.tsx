import type { Transaction } from '@/lib/types';
import type { DisplayCurrency } from '@/hooks/useCurrency';
import { fmtAmount } from '@/lib/format';

interface MonthTotalBarProps {
  transactions: Transaction[];
  displayCurrency: DisplayCurrency;
  usdRate: number;
}

export function MonthTotalBar({ transactions, displayCurrency, usdRate }: MonthTotalBarProps) {
  let income = 0, expense = 0, pendingIncome = 0, pendingExpense = 0;
  for (const tx of transactions) {
    const amount = parseFloat(tx.amountCLP);
    if (tx.type === 'INCOME' && tx.status === 'PAID') income += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PAID') expense += amount;
    if (tx.type === 'INCOME' && tx.status === 'PENDING') pendingIncome += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PENDING') pendingExpense += amount;
  }
  const balance = income - expense;
  const fmt = (n: number) => fmtAmount(n, displayCurrency, usdRate);

  return (
    <div className="rounded-xl border dark:border-slate-800 border-slate-200 dark:bg-slate-900 bg-white overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-8 flex-wrap">
        <div className="flex flex-col gap-0.5 min-w-[100px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Ingresos cobrados</p>
          <p className="text-lg font-bold tabular-nums dark:text-emerald-400 text-emerald-600">{fmt(income)}</p>
        </div>

        <div className="h-8 w-px dark:bg-slate-800 bg-slate-200 hidden sm:block" />

        <div className="flex flex-col gap-0.5 min-w-[100px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Egresos pagados</p>
          <p className="text-lg font-bold tabular-nums dark:text-rose-400 text-rose-600">{fmt(expense)}</p>
        </div>

        <div className="h-8 w-px dark:bg-slate-800 bg-slate-200 hidden sm:block" />

        <div className="flex flex-col gap-0.5 min-w-[120px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Por cobrar</p>
          <p className="text-sm font-semibold tabular-nums dark:text-amber-400 text-amber-600">{fmt(pendingIncome)}</p>
        </div>

        <div className="h-8 w-px dark:bg-slate-800 bg-slate-200 hidden sm:block" />

        <div className="flex flex-col gap-0.5 min-w-[120px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Por pagar</p>
          <p className="text-sm font-semibold tabular-nums dark:text-amber-400 text-amber-600">{fmt(pendingExpense)}</p>
        </div>

        <div className="ml-auto flex flex-col items-end gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400">Resultado neto</p>
          <p className={`text-2xl font-black tabular-nums ${balance >= 0 ? 'dark:text-emerald-300 text-emerald-700' : 'dark:text-rose-300 text-rose-700'}`}>
            {balance >= 0 ? '+' : ''}{fmt(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
