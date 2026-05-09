import type { Transaction } from '@/lib/types';
import type { DisplayCurrency } from '@/hooks/useCurrency';
import { fmtAmount } from '@/lib/format';

interface Summary {
  income: number;
  expense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
}

function computeSummary(transactions: Transaction[], companyId: string): Summary {
  let income = 0, expense = 0, pendingIncome = 0, pendingExpense = 0;
  for (const tx of transactions) {
    const alloc = tx.allocations.find((a) => a.companyId === companyId);
    if (!alloc) continue;
    const amount = parseFloat(alloc.amountCLP);
    if (tx.type === 'INCOME' && tx.status === 'PAID') income += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PAID') expense += amount;
    if (tx.type === 'INCOME' && tx.status === 'PENDING') pendingIncome += amount;
    if (tx.type === 'EXPENSE' && tx.status === 'PENDING') pendingExpense += amount;
  }
  return { income, expense, balance: income - expense, pendingIncome, pendingExpense };
}

interface CompanySummaryCardProps {
  company: { id: string; name: string; shortCode: string };
  transactions: Transaction[];
  displayCurrency: DisplayCurrency;
  usdRate: number;
}

export function CompanySummaryCard({ company, transactions, displayCurrency, usdRate }: CompanySummaryCardProps) {
  const s = computeSummary(transactions, company.id);
  const fmt = (n: number) => fmtAmount(n, displayCurrency, usdRate);

  return (
    <div className="rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-5 dark:shadow-none shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full dark:bg-indigo-400 bg-indigo-500" />
          <span className="text-xs font-bold dark:text-slate-300 text-slate-700 uppercase tracking-wider">{company.shortCode}</span>
        </div>
        <span className="text-xs dark:text-slate-600 text-slate-400">{company.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">Ingresos cobrados</p>
          <p className="text-xl font-bold text-emerald-500">{fmt(s.income)}</p>
        </div>
        <div>
          <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">Egresos pagados</p>
          <p className="text-xl font-bold text-rose-500">{fmt(s.expense)}</p>
        </div>
      </div>

      <div className="border-t dark:border-slate-800 border-slate-100 pt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs dark:text-slate-600 text-slate-400 mb-0.5">CxC pendiente</p>
          <p className="text-sm font-semibold dark:text-slate-300 text-slate-700">{fmt(s.pendingIncome)}</p>
        </div>
        <div>
          <p className="text-xs dark:text-slate-600 text-slate-400 mb-0.5">CxP pendiente</p>
          <p className="text-sm font-semibold dark:text-slate-300 text-slate-700">{fmt(s.pendingExpense)}</p>
        </div>
      </div>
    </div>
  );
}
