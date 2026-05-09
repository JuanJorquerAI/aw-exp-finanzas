'use client';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { NewTransactionDrawer } from '@/components/transactions/NewTransactionDrawer';

const COMPANIES = ['AW', 'EXPRO'] as const;

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/cxc', label: 'CxC', Icon: ArrowDownCircle },
  { href: '/cxp', label: 'CxP', Icon: ArrowUpCircle },
  { href: '/transactions', label: 'Transacciones', Icon: List },
];

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const company = searchParams.get('company') ?? 'AW';
  const month = searchParams.get('month') ?? getDefaultMonth();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <aside className="flex h-screen w-56 flex-col border-r bg-white px-3 py-4">
        <div className="mb-6 px-2">
          <h1 className="text-sm font-bold text-slate-900">aw-finanzas</h1>
          <p className="text-xs text-slate-400">AW · EXPRO</p>
        </div>

        <div className="mb-4 flex rounded-md border p-0.5">
          {COMPANIES.map((c) => (
            <button
              key={c}
              onClick={() => updateParam('company', c)}
              className={cn(
                'flex-1 rounded py-1 text-xs font-medium transition-colors',
                company === c ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center justify-between px-1">
          <button
            onClick={() => updateParam('month', addMonths(month, -1))}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-slate-700 capitalize">
            {formatMonth(month)}
          </span>
          <button
            onClick={() => updateParam('month', addMonths(month, 1))}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={`${href}?company=${company}&month=${month}`}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                pathname === href
                  ? 'bg-slate-100 font-medium text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <Button size="sm" className="mt-4 w-full" onClick={() => setDrawerOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nueva Transacción
        </Button>
      </aside>

      <NewTransactionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        defaultCompanyCode={company}
      />
    </>
  );
}
