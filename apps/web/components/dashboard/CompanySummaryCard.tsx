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
  const positive = s.balance >= 0;

  const totalFlow = s.income + s.expense;
  const incomeRatio = totalFlow > 0 ? (s.income / totalFlow) * 100 : 0;

  return (
    <div className="rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-5 dark:shadow-none shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-widest">{company.shortCode}</span>
          <span className="text-xs dark:text-slate-600 text-slate-400">·</span>
          <span className="text-xs dark:text-slate-600 text-slate-400">{company.name}</span>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            positive
              ? 'dark:bg-emerald-950 bg-emerald-50 dark:text-emerald-400 text-emerald-700'
              : 'dark:bg-rose-950 bg-rose-50 dark:text-rose-400 text-rose-700'
          }`}
        >
          {positive ? '+' : ''}{fmt(s.balance)}
        </span>
      </div>

      {totalFlow > 0 && (
        <div className="space-y-1">
          <div className="flex h-1.5 overflow-hidden rounded-full dark:bg-slate-800 bg-slate-100">
            <div
              className="bg-emerald-500 transition-all duration-700"
              style={{ width: `${incomeRatio}%` }}
            />
            <div className="flex-1 bg-rose-500" />
          </div>
          <div className="flex justify-between text-[10px] dark:text-slate-600 text-slate-400">
            <span>Ingresos {Math.round(incomeRatio)}%</span>
            <span>Egresos {Math.round(100 - incomeRatio)}%</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <MetricCell label="Cobrado" value={fmt(s.income)} color="emerald" />
        <MetricCell label="Pagado" value={fmt(s.expense)} color="rose" />
      </div>

      <div className="border-t dark:border-slate-800 border-slate-100 pt-4 grid grid-cols-2 gap-3">
        <PendingCell label="CxC pendiente" value={fmt(s.pendingIncome)} href={`/cxc?company=${company.shortCode}`} />
        <PendingCell label="CxP pendiente" value={fmt(s.pendingExpense)} href={`/cxp?company=${company.shortCode}`} />
      </div>
    </div>
  );
}

function MetricCell({ label, value, color }: { label: string; value: string; color: 'emerald' | 'rose' }) {
  const cls = color === 'emerald'
    ? 'dark:text-emerald-400 text-emerald-600'
    : 'dark:text-rose-400 text-rose-600';
  return (
    <div>
      <p className="text-[11px] dark:text-slate-500 text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function PendingCell({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <div>
      <p className="text-[11px] dark:text-slate-600 text-slate-400 mb-0.5">{label}</p>
      <a
        href={href}
        className="text-sm font-semibold tabular-nums dark:text-slate-300 text-slate-700 hover:underline underline-offset-2 decoration-dotted"
      >
        {value}
      </a>
    </div>
  );
}
