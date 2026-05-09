'use client';
import { useSearchParams } from 'next/navigation';
import { useTransactions, useCompanies } from '@/lib/queries';
import { TransactionTable } from '@/components/transactions/TransactionTable';

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function CxCPage() {
  const searchParams = useSearchParams();
  const month = searchParams.get('month') ?? getDefaultMonth();
  const companyCode = searchParams.get('company') ?? 'AW';
  const [y, m] = month.split('-').map(Number);

  const { data: companies = [], isLoading: loadingCo } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: transactions = [], isLoading: loadingTx } = useTransactions(
    company
      ? {
          companyId: company.id,
          type: 'INCOME',
          status: 'PENDING',
          dateFrom: new Date(y, m - 1, 1).toISOString().split('T')[0],
          dateTo: new Date(y, m, 0).toISOString().split('T')[0],
        }
      : {},
  );

  if (loadingCo || loadingTx) {
    return <div className="p-8 text-sm dark:text-slate-600 text-slate-400">Cargando...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">
            Cuentas por Cobrar
          </h2>
          <p className="mt-0.5 text-xs dark:text-slate-500 text-slate-400">
            {companyCode} · ingresos pendientes
          </p>
        </div>
        <span className="rounded-full border dark:border-slate-800 border-slate-200 px-3 py-1 text-xs font-medium dark:text-slate-400 text-slate-600">
          {transactions.length} pendiente{transactions.length !== 1 ? 's' : ''}
        </span>
      </div>
      <TransactionTable transactions={transactions} showMarkPaid />
    </div>
  );
}
