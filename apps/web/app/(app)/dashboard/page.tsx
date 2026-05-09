'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { CompanySummaryCard } from '@/components/dashboard/CompanySummaryCard';
import { MonthTotalBar } from '@/components/dashboard/MonthTotalBar';

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

  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const { data: transactions = [], isLoading: loadingTx } = useTransactions({ dateFrom, dateTo });

  if (loadingCo || loadingTx) {
    return <div className="p-8 text-sm text-slate-400">Cargando...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {companies.filter((c) => c.isActive).map((company) => (
          <CompanySummaryCard key={company.id} company={company} transactions={transactions} />
        ))}
      </div>
      <MonthTotalBar transactions={transactions} />
    </div>
  );
}
