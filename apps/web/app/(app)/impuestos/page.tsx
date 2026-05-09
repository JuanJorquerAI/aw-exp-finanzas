'use client';
import { useSearchParams } from 'next/navigation';
import { useCompanies, useTaxesMonthly, useTaxesAnnual } from '@/lib/queries';
import { fmtAmount } from '@/lib/format';

function parseYM(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

function getDefaultYM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmt(n: number) {
  return fmtAmount(n, 'CLP', 1);
}

interface TaxRowProps {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
  dim?: boolean;
}

function TaxRow({ label, value, sub, highlight, dim }: TaxRowProps) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b dark:border-slate-800 border-slate-100 last:border-0 ${dim ? 'opacity-60' : ''}`}>
      <div>
        <p className={`text-sm ${highlight ? 'font-semibold dark:text-slate-100 text-slate-900' : 'dark:text-slate-300 text-slate-700'}`}>{label}</p>
        {sub && <p className="text-xs dark:text-slate-500 text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm font-mono tabular-nums ${highlight ? 'font-bold text-amber-500' : 'dark:text-slate-200 text-slate-800'}`}>
        {fmt(value)}
      </p>
    </div>
  );
}

function MonthlyPanel({ companyId, year, month }: { companyId: string; year: number; month: number }) {
  const { data, isLoading } = useTaxesMonthly(companyId, year, month);

  if (isLoading) return <div className="text-xs dark:text-slate-500 text-slate-400 py-4">Calculando...</div>;
  if (!data) return null;

  const { breakdown: b } = data;

  return (
    <div className="rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-5">
      <h3 className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-4">
        Detalle {MONTH_NAMES[month - 1]} {year}
      </h3>

      <div className="mb-4">
        <p className="text-xs font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-2">Bases</p>
        <TaxRow label="Ingresos afectos" value={b.incomeAfecta} sub="Facturas afectas emitidas" />
        <TaxRow label="Ingresos exentos" value={b.incomeExenta} sub="Facturas exentas emitidas" dim />
        <TaxRow label="Gastos con factura afecta" value={b.expenseAfectaFactura} sub="IVA crédito fiscal" />
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-2">PPM</p>
        <TaxRow label="PPM estimado" value={b.ppm} sub="~10% ingresos afectos" />
      </div>

      <div className="mb-4">
        <p className="text-xs font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-2">IVA</p>
        <TaxRow label="Débito fiscal" value={b.ivaDebito} sub="19% ingresos afectos" />
        <TaxRow label="Crédito fiscal" value={b.ivaCredito} sub="19% gastos con factura afecta" dim />
        <TaxRow label="IVA neto a pagar" value={b.ivaNeto} sub="Débito − Crédito" />
      </div>

      <div className="mb-5">
        <p className="text-xs font-semibold dark:text-slate-500 text-slate-400 uppercase tracking-wider mb-2">Retenciones</p>
        <TaxRow label="Retención honorarios" value={b.retencionHonorarios} sub="13.75% boletas recibidas" />
      </div>

      <div className="rounded-lg dark:bg-slate-800 bg-amber-50 border dark:border-slate-700 border-amber-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold dark:text-slate-100 text-slate-900">Total estimado a pagar</p>
          <p className="text-lg font-bold tabular-nums text-amber-500">{fmt(b.total)}</p>
        </div>
        <p className="text-xs dark:text-slate-500 text-slate-500 mt-1">PPM + IVA neto + Retenciones</p>
      </div>
    </div>
  );
}

function AnnualSummary({ companyId, year }: { companyId: string; year: number }) {
  const { data, isLoading } = useTaxesAnnual(companyId, year);

  if (isLoading) return <div className="text-xs dark:text-slate-500 text-slate-400 py-4">Cargando anual...</div>;
  if (!data) return null;

  const totals = data.reduce(
    (acc, m) => ({
      ppm: acc.ppm + m.breakdown.ppm,
      ivaNeto: acc.ivaNeto + m.breakdown.ivaNeto,
      retencion: acc.retencion + m.breakdown.retencionHonorarios,
      total: acc.total + m.breakdown.total,
    }),
    { ppm: 0, ivaNeto: 0, retencion: 0, total: 0 },
  );

  return (
    <div className="rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 p-5">
      <h3 className="text-xs font-bold dark:text-slate-400 text-slate-500 uppercase tracking-wider mb-4">
        Acumulado {year}
      </h3>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'PPM acumulado', value: totals.ppm },
          { label: 'IVA neto acumulado', value: totals.ivaNeto },
          { label: 'Retenciones acumuladas', value: totals.retencion },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 p-3">
            <p className="text-xs dark:text-slate-500 text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-bold tabular-nums dark:text-slate-200 text-slate-800">{fmt(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-1">
        {data.map((m) => (
          <div key={m.month} className="text-center">
            <p className="text-xs dark:text-slate-600 text-slate-400 mb-1">{MONTH_NAMES[m.month - 1]}</p>
            <div
              className="rounded text-xs font-mono tabular-nums py-1.5 px-1 dark:bg-slate-800 bg-slate-100"
              title={`${MONTH_NAMES[m.month - 1]}: ${fmt(m.breakdown.total)}`}
            >
              <span className={m.breakdown.total > 0 ? 'text-amber-500' : 'dark:text-slate-600 text-slate-400'}>
                {m.breakdown.total > 0 ? `${Math.round(m.breakdown.total / 1000)}k` : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg dark:bg-slate-800 bg-amber-50 border dark:border-slate-700 border-amber-200 p-3 flex items-center justify-between">
        <p className="text-sm font-bold dark:text-slate-100 text-slate-900">Total acumulado {year}</p>
        <p className="text-lg font-bold tabular-nums text-amber-500">{fmt(totals.total)}</p>
      </div>
    </div>
  );
}

export default function ImpuestosPage() {
  const searchParams = useSearchParams();
  const { data: companies = [] } = useCompanies();

  const companyCode = searchParams.get('company') ?? 'AW';
  const monthParam = searchParams.get('month') ?? getDefaultYM();
  const { year, month } = parseYM(monthParam);

  const company = companies.find((c) => c.shortCode === companyCode);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold dark:text-slate-100 text-slate-900">Impuestos</h2>
        <p className="text-sm dark:text-slate-500 text-slate-500 mt-1">
          Estimación PPM, IVA y retenciones — {companyCode} · {MONTH_NAMES[month - 1]} {year}
        </p>
      </div>

      {!company ? (
        <p className="text-sm dark:text-slate-500 text-slate-400">Empresa no encontrada.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg dark:bg-slate-800/50 bg-blue-50 border dark:border-slate-700 border-blue-200 p-3">
            <p className="text-xs dark:text-slate-400 text-blue-700">
              <strong>Nota:</strong> Los valores son <em>estimaciones</em> basadas en transacciones registradas.
              PPM ~10% (Primera Categoría), IVA 19%, Retención honorarios 13.75%.
              Solo incluye transacciones no canceladas del período.
            </p>
          </div>

          <MonthlyPanel companyId={company.id} year={year} month={month} />
          <AnnualSummary companyId={company.id} year={year} />
        </div>
      )}
    </div>
  );
}
