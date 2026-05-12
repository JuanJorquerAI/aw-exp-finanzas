'use client';
import Link from 'next/link';
import { AlertTriangle, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { effectiveDueDate, getAgingStatus } from '@/lib/aging';
import type { Transaction } from '@/lib/types';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

interface AlertsBannerProps {
  allPending: Transaction[];
  bankPending: Transaction[];
  companyCode: string;
}

export function AlertsBanner({ allPending, bankPending, companyCode }: AlertsBannerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueIncome  = allPending.filter((t) => t.type === 'INCOME'  && getAgingStatus(effectiveDueDate(t), today) === 'OVERDUE');
  const overdueExpense = allPending.filter((t) => t.type === 'EXPENSE' && getAgingStatus(effectiveDueDate(t), today) === 'OVERDUE');
  const overdueIncomeTotal  = overdueIncome.reduce((s, t) => s + Number(t.amountCLP), 0);
  const overdueExpenseTotal = overdueExpense.reduce((s, t) => s + Number(t.amountCLP), 0);

  const hasAlerts = overdueIncome.length > 0 || overdueExpense.length > 0 || bankPending.length > 0;
  if (!hasAlerts) return null;

  return (
    <div className="space-y-2">
      {overdueExpense.length > 0 && (
        <Alert
          icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          variant="red"
          href={`/cxp?company=${companyCode}`}
        >
          <span className="font-semibold">{overdueExpense.length} CxP vencida{overdueExpense.length !== 1 ? 's' : ''}</span>
          <span className="dark:text-rose-300/70 text-rose-700/70 mx-1">·</span>
          {CLP.format(overdueExpenseTotal)} por pagar
        </Alert>
      )}
      {overdueIncome.length > 0 && (
        <Alert
          icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          variant="amber"
          href={`/cxc?company=${companyCode}`}
        >
          <span className="font-semibold">{overdueIncome.length} CxC vencida{overdueIncome.length !== 1 ? 's' : ''}</span>
          <span className="dark:text-amber-300/70 text-amber-700/70 mx-1">·</span>
          {CLP.format(overdueIncomeTotal)} por cobrar
        </Alert>
      )}
      {bankPending.length > 0 && (
        <Alert
          icon={<Landmark className="h-3.5 w-3.5 shrink-0" />}
          variant="blue"
          href={`/conciliacion?company=${companyCode}`}
        >
          <span className="font-semibold">{bankPending.length} movimiento{bankPending.length !== 1 ? 's' : ''} bancario{bankPending.length !== 1 ? 's' : ''}</span>
          <span className="dark:text-blue-300/70 text-blue-700/70 mx-1">·</span>
          pendientes de revisión
        </Alert>
      )}
    </div>
  );
}

function Alert({
  icon, variant, href, children,
}: {
  icon: React.ReactNode;
  variant: 'red' | 'amber' | 'blue';
  href: string;
  children: React.ReactNode;
}) {
  const cls = {
    red:   'dark:bg-rose-950/30 bg-rose-50 dark:border-rose-900 border-rose-200 dark:text-rose-400 text-rose-700',
    amber: 'dark:bg-amber-950/30 bg-amber-50 dark:border-amber-900 border-amber-200 dark:text-amber-400 text-amber-700',
    blue:  'dark:bg-blue-950/30 bg-blue-50 dark:border-blue-900 border-blue-200 dark:text-blue-400 text-blue-700',
  }[variant];

  return (
    <Link
      href={href}
      className={cn('flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs transition-opacity hover:opacity-80', cls)}
    >
      {icon}
      {children}
      <span className="ml-auto text-[10px] opacity-60">Ver →</span>
    </Link>
  );
}
