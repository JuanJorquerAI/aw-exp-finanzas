import { Card } from '@/components/ui/card';
import type { Transaction } from '@/lib/types';

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

function fmt(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

interface CompanySummaryCardProps {
  company: { id: string; name: string; shortCode: string };
  transactions: Transaction[];
}

export function CompanySummaryCard({ company, transactions }: CompanySummaryCardProps) {
  const s = computeSummary(transactions, company.id);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {company.shortCode}
        </span>
        <span className="text-xs text-slate-400">{company.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-400">Ingresos cobrados</p>
          <p className="text-lg font-semibold text-emerald-600">{fmt(s.income)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Egresos pagados</p>
          <p className="text-lg font-semibold text-rose-600">{fmt(s.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">CxC pendiente</p>
          <p className="text-sm font-medium text-slate-600">{fmt(s.pendingIncome)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">CxP pendiente</p>
          <p className="text-sm font-medium text-slate-600">{fmt(s.pendingExpense)}</p>
        </div>
      </div>
      <div className="mt-4 border-t pt-3">
        <p className="text-xs text-slate-400">Resultado del mes</p>
        <p className={`text-xl font-bold ${s.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          {fmt(s.balance)}
        </p>
      </div>
    </Card>
  );
}
