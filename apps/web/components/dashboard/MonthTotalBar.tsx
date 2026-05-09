import type { Transaction } from '@/lib/types';
import type { DisplayCurrency } from '@/hooks/useCurrency';
import { fmtAmount } from '@/lib/format';

interface MonthTotalBarProps {
  transactions: Transaction[];
  displayCurrency: DisplayCurrency;
  usdRate: number;
}

export function MonthTotalBar({ transactions, displayCurrency, usdRate }: MonthTotalBarProps) {
  let income = 0, expense = 0;
  for (const tx of transactions) {
    const amount = parseFloat(tx.amountCLP);
    if (tx.type === 'INCOME' && tx.status === 'PAID') income += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PAID') expense += amount;
  }
  const balance = income - expense;
  const fmt = (n: number) => fmtAmount(n, displayCurrency, usdRate);

  return (
    <div className="flex items-center gap-6 rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/60 bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-500 text-slate-400">Ingresos</p>
        <p className="text-base font-semibold tabular-nums dark:text-emerald-400 text-emerald-600">{fmt(income)}</p>
      </div>

      <div className="h-8 w-px dark:bg-slate-800 bg-slate-200" />

      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-500 text-slate-400">Egresos</p>
        <p className="text-base font-semibold tabular-nums dark:text-rose-400 text-rose-600">{fmt(expense)}</p>
      </div>

      <div className="ml-auto flex flex-col items-end gap-0.5">
        <p className="text-[11px] font-medium uppercase tracking-wider dark:text-slate-500 text-slate-400">Resultado</p>
        <p className={`text-xl font-bold tabular-nums ${balance >= 0 ? 'dark:text-emerald-300 text-emerald-700' : 'dark:text-rose-300 text-rose-700'}`}>
          {fmt(balance)}
        </p>
      </div>
    </div>
  );
}
