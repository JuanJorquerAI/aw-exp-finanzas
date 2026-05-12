'use client';
import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, SkipForward, ArrowDownCircle, ArrowUpCircle, ClipboardEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccounts, useBankImport, useTransactions, useCompanies } from '@/lib/queries';
import { ReviewDrawer } from '@/components/transactions/ReviewDrawer';
import type { BankImportResult, Transaction } from '@/lib/types';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function formatCLP(val: string | number) {
  return CLP.format(Number(val));
}

type TxFilter = 'all' | 'INCOME' | 'EXPENSE';

export default function ConciliacionPage() {
  const searchParams = useSearchParams();
  const companyCode = searchParams.get('company') ?? 'AW';
  const { data: companies = [] } = useCompanies();
  const company = companies.find((c) => c.shortCode === companyCode);

  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts(company?.id);
  const { mutateAsync: importBank, isPending } = useBankImport();

  const [accountId, setAccountId] = useState('');
  const [fileType, setFileType] = useState<'detallado' | 'historico'>('detallado');
  const [result, setResult] = useState<BankImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<TxFilter>('all');
  const [reviewTx, setReviewTx] = useState<Transaction | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: bankTxs = [], isLoading: loadingTxs } = useTransactions({ source: 'BANK_CSV' });
  const pending = bankTxs.filter((t: Transaction) => t.status === 'PENDING');
  const recent = bankTxs
    .filter((t: Transaction) => t.status !== 'PENDING')
    .filter((t: Transaction) => txFilter === 'all' || t.type === txFilter)
    .slice(0, 30);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Selecciona un archivo XLSX'); return; }
    if (!accountId) { setError('Selecciona una cuenta'); return; }
    try {
      const res = await importBank({ file, accountId, fileType });
      setResult(res);
      if (fileRef.current) fileRef.current.value = '';
      setFileName(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  return (
    <div className="p-8 space-y-8 w-full">
      <div>
        <h2 className="text-lg font-semibold dark:text-slate-100 text-slate-900">Conciliación bancaria</h2>
        <p className="mt-0.5 text-xs dark:text-slate-500 text-slate-400">Importa cartolas BCI · Movimientos Detallado o Histórica</p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-white p-6 space-y-4">
        <h3 className="text-sm font-medium dark:text-slate-200 text-slate-800">Subir cartola</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs dark:text-slate-400 text-slate-600">Cuenta bancaria</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white px-3 py-1.5 text-sm dark:text-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Seleccionar cuenta…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.bankName ? ` · ${a.bankName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs dark:text-slate-400 text-slate-600">Tipo de archivo</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as 'detallado' | 'historico')}
              className="w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-800 bg-white px-3 py-1.5 text-sm dark:text-slate-200 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="detallado">Movimientos Detallado (recomendado)</option>
              <option value="historico">Cartola Histórica (meses anteriores)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs dark:text-slate-400 text-slate-600">Archivo XLSX</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              'mt-1 flex cursor-pointer items-center gap-3 rounded-md border-2 border-dashed px-4 py-5 transition-colors',
              'dark:border-slate-700 border-slate-200 dark:hover:border-indigo-500 hover:border-indigo-400',
            )}
          >
            <Upload className="h-5 w-5 dark:text-slate-500 text-slate-400 shrink-0" />
            <span className="text-sm dark:text-slate-400 text-slate-500">
              {fileName ?? 'Haz clic para seleccionar archivo .xlsx'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </div>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-500">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-colors"
        >
          {isPending ? 'Importando…' : 'Importar cartola'}
        </button>
      </form>

      {/* Import result */}
      {result && (
        <div className="rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-white p-5">
          <h3 className="mb-3 text-sm font-medium dark:text-slate-200 text-slate-800">Resultado importación</h3>
          <div className="flex gap-6">
            <Stat icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Importadas" value={result.imported} color="text-emerald-500" />
            <Stat icon={<SkipForward className="h-4 w-4 dark:text-slate-500 text-slate-400" />} label="Duplicadas" value={result.skipped} color="dark:text-slate-400 text-slate-500" />
            <Stat icon={<AlertCircle className="h-4 w-4 text-amber-500" />} label="Pendientes revisión" value={result.pending} color="text-amber-500" />
          </div>
        </div>
      )}

      {/* Pending review */}
      {pending.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium dark:text-slate-200 text-slate-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Pendientes de revisión
            <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-semibold">{pending.length}</span>
          </h3>
          <BankTxTable transactions={pending} onReview={setReviewTx} />
        </div>
      )}

      {/* Recent bank transactions */}
      {!loadingTxs && bankTxs.filter((t: Transaction) => t.status !== 'PENDING').length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium dark:text-slate-200 text-slate-800">Importadas recientes</h3>
            <TxFilterTabs value={txFilter} onChange={setTxFilter} />
          </div>
          <BankTxTable transactions={recent} />
        </div>
      )}

      {!loadingTxs && bankTxs.length === 0 && !result && (
        <p className="text-sm dark:text-slate-600 text-slate-400">No hay transacciones bancarias importadas aún.</p>
      )}

      <ReviewDrawer
        transaction={reviewTx}
        open={!!reviewTx}
        onOpenChange={(o) => { if (!o) setReviewTx(null); }}
      />
    </div>
  );
}

function TxFilterTabs({ value, onChange }: { value: TxFilter; onChange: (v: TxFilter) => void }) {
  return (
    <div className="flex rounded-md border dark:border-slate-700 border-slate-200 overflow-hidden text-xs">
      {([['all', 'Todos'], ['INCOME', 'Ingresos'], ['EXPENSE', 'Egresos']] as [TxFilter, string][]).map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'px-3 py-1 transition-colors',
            value === v
              ? 'dark:bg-slate-700 bg-slate-100 dark:text-slate-200 text-slate-800 font-semibold'
              : 'dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-50',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <p className={cn('text-lg font-bold', color)}>{value}</p>
        <p className="text-xs dark:text-slate-500 text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function BankTxTable({ transactions, onReview }: { transactions: Transaction[]; onReview?: (tx: Transaction) => void }) {
  return (
    <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-slate-50">
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Fecha</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Descripción</th>
            <th className="px-4 py-2.5 text-left font-medium dark:text-slate-400 text-slate-500">Contraparte</th>
            <th className="px-4 py-2.5 text-right font-medium dark:text-slate-400 text-slate-500">Monto</th>
            <th className="px-4 py-2.5 text-center font-medium dark:text-slate-400 text-slate-500">Estado</th>
            {onReview && <th className="px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-slate-800 divide-slate-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors">
              <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500 whitespace-nowrap">
                {new Date(tx.date).toLocaleDateString('es-CL')}
              </td>
              <td className="px-4 py-2.5 dark:text-slate-300 text-slate-700 max-w-xs truncate">{tx.description}</td>
              <td className="px-4 py-2.5 dark:text-slate-400 text-slate-500">
                {tx.counterparty?.name ?? <span className="italic dark:text-slate-600 text-slate-400">Sin contraparte</span>}
              </td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap font-mono">
                <span className={cn('flex items-center justify-end gap-1', tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500')}>
                  {tx.type === 'INCOME'
                    ? <ArrowDownCircle className="h-3 w-3" />
                    : <ArrowUpCircle className="h-3 w-3" />}
                  {formatCLP(tx.amountCLP)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-center">
                <StatusBadge status={tx.status} />
              </td>
              {onReview && (
                <td className="px-3 py-2.5 text-center">
                  <button
                    onClick={() => onReview(tx)}
                    className="rounded p-1 dark:text-slate-500 text-slate-400 dark:hover:text-indigo-400 hover:text-indigo-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
                    title="Revisar"
                  >
                    <ClipboardEdit className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING:    { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    PAID:       { label: 'Ok', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    RECONCILED: { label: 'Conciliada', cls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    CANCELLED:  { label: 'Cancelada', cls: 'bg-slate-500/10 dark:text-slate-500 text-slate-400' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: '' };
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>;
}
