'use client';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, List, Plus, ChevronLeft, ChevronRight, Sun, Moon, Receipt, LogOut, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { NewTransactionDrawer } from '@/components/transactions/NewTransactionDrawer';
import { useTheme } from '@/hooks/useTheme';
import { logoutAction } from '@/app/login/actions';

const COMPANIES = ['AW', 'EXPRO'] as const;

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/cxc', label: 'CxC', Icon: ArrowDownCircle },
  { href: '/cxp', label: 'CxP', Icon: ArrowUpCircle },
  { href: '/transactions', label: 'Transacciones', Icon: List },
  { href: '/impuestos', label: 'Impuestos', Icon: Receipt },
  { href: '/conciliacion', label: 'Conciliación', Icon: Landmark },
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
  const { theme, toggle } = useTheme();

  const company = searchParams.get('company') ?? 'AW';
  const month = searchParams.get('month') ?? getDefaultMonth();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <aside className="flex h-screen w-56 flex-col border-r border-slate-800 dark:bg-slate-950 bg-white px-3 py-5">
        <div className="mb-6 flex items-center justify-between px-2">
          <div>
            <h1 className="text-sm font-bold dark:text-white text-slate-900 tracking-tight">aw-finanzas</h1>
            <p className="text-xs dark:text-slate-600 text-slate-400 mt-0.5">AW · EXPRO</p>
          </div>
          <button
            onClick={toggle}
            className="rounded-md p-1.5 dark:text-slate-500 text-slate-400 dark:hover:text-slate-300 hover:text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="mb-4 flex rounded-md dark:bg-slate-900 bg-slate-100 p-0.5 border dark:border-slate-800 border-slate-200">
          {COMPANIES.map((c) => (
            <button
              key={c}
              onClick={() => updateParam('company', c)}
              className={cn(
                'flex-1 rounded py-1.5 text-xs font-semibold transition-colors',
                company === c
                  ? 'dark:bg-slate-700 bg-slate-900 dark:text-white text-white'
                  : 'dark:text-slate-500 text-slate-500 dark:hover:text-slate-300 hover:text-slate-700',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mb-6 flex items-center justify-between px-1">
          <button
            onClick={() => updateParam('month', addMonths(month, -1))}
            className="rounded p-0.5 dark:text-slate-600 text-slate-400 dark:hover:text-slate-300 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium dark:text-slate-400 text-slate-600 capitalize">
            {formatMonth(month)}
          </span>
          <button
            onClick={() => updateParam('month', addMonths(month, 1))}
            className="rounded p-0.5 dark:text-slate-600 text-slate-400 dark:hover:text-slate-300 hover:text-slate-700"
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
                  ? 'dark:bg-slate-800 bg-slate-100 dark:text-white text-slate-900 font-medium border-l-2 border-indigo-500 pl-1.5'
                  : 'dark:text-slate-500 text-slate-500 dark:hover:bg-slate-800/60 hover:bg-slate-50 dark:hover:text-slate-200 hover:text-slate-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setDrawerOpen(true)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Transacción
        </button>

        <form action={logoutAction} className="mt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs dark:text-slate-600 text-slate-400 dark:hover:text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <NewTransactionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        defaultCompanyCode={company}
      />
    </>
  );
}
