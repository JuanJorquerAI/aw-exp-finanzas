import type { Transaction } from '@/lib/types';

function fmt(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

interface MonthTotalBarProps {
  transactions: Transaction[];
}

export function MonthTotalBar({ transactions }: MonthTotalBarProps) {
  let income = 0, expense = 0;
  for (const tx of transactions) {
    const amount = parseFloat(tx.amountCLP);
    if (tx.type === 'INCOME' && tx.status === 'PAID') income += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PAID') expense += amount;
  }
  const balance = income - expense;

  return (
    <div className="flex items-center gap-8 rounded-lg border bg-slate-900 px-6 py-4 text-white">
      <div>
        <p className="text-xs text-slate-400">Total ingresos</p>
        <p className="text-base font-semibold text-emerald-400">{fmt(income)}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400">Total egresos</p>
        <p className="text-base font-semibold text-rose-400">{fmt(expense)}</p>
      </div>
      <div className="ml-auto">
        <p className="text-xs text-slate-400">Resultado combinado</p>
        <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {fmt(balance)}
        </p>
      </div>
    </div>
  );
}
