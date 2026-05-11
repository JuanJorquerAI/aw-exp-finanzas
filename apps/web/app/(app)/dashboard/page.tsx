'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { CompanySummaryCard } from '@/components/dashboard/CompanySummaryCard';
import { MonthTotalBar } from '@/components/dashboard/MonthTotalBar';
import { useCurrency } from '@/hooks/useCurrency';

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1)
    .toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    .replace(/\bde\b/g, 'de');
}

function getMonthBounds(ym: string): { dateFrom: string; dateTo: string } {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return {
    dateFrom: first.toISOString().split('T')[0],
    dateTo: last.toISOString().split('T')[0],
  };
}

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const { dateFrom, dateTo } = getMonthBounds(month);
  const { currency, usdRate, toggle, updateRate } = useCurrency();

  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions({ dateFrom, dateTo });

  if (loadingCo || loadingTx) {
    return <div className="p-8 text-sm dark:text-slate-600 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-5 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest dark:text-slate-500 text-slate-400 mb-0.5">Resumen mensual</p>
          <h2 className="text-xl font-bold dark:text-slate-100 text-slate-900 first-letter:uppercase">{monthLabel(month)}</h2>
        </div>
        <div className="flex items-center gap-3 pt-1">
          {currency === 'USD' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs dark:text-slate-500 text-slate-400">1 USD =</span>
              <input
                type="number"
                min="1"
                step="1"
                value={usdRate}
                onChange={(e) => updateRate(parseFloat(e.target.value) || 1)}
                className="w-20 rounded border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white dark:text-slate-200 text-slate-800 px-2 py-0.5 text-xs tabular-nums focus:outline-none focus:ring-1 dark:focus:ring-slate-600 focus:ring-slate-300"
              />
              <span className="text-xs dark:text-slate-500 text-slate-400">CLP</span>
            </div>
          )}
          <button
            onClick={toggle}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              currency === 'USD'
                ? 'dark:bg-amber-950 bg-amber-50 dark:border-amber-800 border-amber-200 dark:text-amber-400 text-amber-700'
                : 'dark:bg-slate-800 bg-slate-100 dark:border-slate-700 border-slate-200 dark:text-slate-400 text-slate-600'
            }`}
          >
            {currency === 'CLP' ? 'CLP → USD' : 'USD → CLP'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {companies.filter((c) => c.isActive).map((company) => (
          <CompanySummaryCard
            key={company.id}
            company={company}
            transactions={transactions}
            displayCurrency={currency}
            usdRate={usdRate}
          />
        ))}
      </div>

      <MonthTotalBar
        transactions={transactions}
        displayCurrency={currency}
        usdRate={usdRate}
      />
    </div>
  );
}
