'use client';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCategories, useCounterparties, useUpdateTransaction, useCreateCounterparty } from '@/lib/queries';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const SELECT_CLS = 'w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white dark:text-slate-200 text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:focus:ring-slate-600 focus:ring-slate-300';
const INPUT_CLS = 'w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white dark:text-slate-200 text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:focus:ring-slate-600 focus:ring-slate-300 placeholder:dark:text-slate-600 placeholder:text-slate-400';

const COUNTERPARTY_TYPES = [
  ['CUSTOMER', 'Cliente'],
  ['SUPPLIER', 'Proveedor'],
  ['EMPLOYEE', 'Trabajador'],
  ['GOVERNMENT', 'Gobierno'],
  ['BANK', 'Banco'],
] as const;

interface ReviewDrawerProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDrawer({ transaction: tx, open, onOpenChange }: ReviewDrawerProps) {
  const { data: categories = [] } = useCategories();
  const { data: counterparties = [], refetch: refetchCounterparties } = useCounterparties();
  const { mutateAsync: update, isPending } = useUpdateTransaction();
  const { mutateAsync: createCounterparty, isPending: creatingCp } = useCreateCounterparty();

  const [categoryId, setCategoryId] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [showNewCp, setShowNewCp] = useState(false);
  const [newCp, setNewCp] = useState({ name: '', type: 'SUPPLIER', rut: '' });

  useEffect(() => {
    if (tx) {
      setCategoryId(tx.category?.id ?? '');
      setCounterpartyId(tx.counterparty?.id ?? '');
      setType(tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setShowNewCp(false);
      setNewCp({ name: '', type: 'SUPPLIER', rut: '' });
    }
  }, [tx]);

  if (!tx) return null;

  async function handleCreateCp() {
    if (!newCp.name.trim()) return;
    const created = await createCounterparty({ name: newCp.name.trim(), type: newCp.type, ...(newCp.rut && { rut: newCp.rut }) });
    await refetchCounterparties();
    setCounterpartyId(created.id);
    setShowNewCp(false);
    setNewCp({ name: '', type: 'SUPPLIER', rut: '' });
  }

  async function handleSave(markPaid: boolean) {
    if (!tx) return;
    await update({
      id: tx.id,
      dto: {
        ...(categoryId && { categoryId }),
        ...(counterpartyId && { counterpartyId }),
        type,
        ...(markPaid && { status: 'PAID' }),
      },
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md dark:bg-slate-950 bg-white overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="dark:text-slate-100 text-slate-900">Revisar transacción</SheetTitle>
        </SheetHeader>

        {/* Info */}
        <div className="rounded-lg border dark:border-slate-800 border-slate-200 dark:bg-slate-900/40 bg-slate-50 p-4 mb-6 space-y-1.5">
          <p className="text-xs dark:text-slate-500 text-slate-400">{new Date(tx.date).toLocaleDateString('es-CL')}</p>
          <p className="text-sm dark:text-slate-200 text-slate-800 font-medium">{tx.description}</p>
          <p className={cn('text-lg font-bold font-mono', tx.type === 'INCOME' ? 'text-emerald-500' : 'dark:text-slate-200 text-slate-800')}>
            {CLP.format(Number(tx.amountCLP))}
          </p>
        </div>

        <div className="space-y-5">
          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-slate-400 text-slate-600">Tipo</label>
            <div className="flex gap-2">
              {(['INCOME', 'EXPENSE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    'flex-1 rounded-md border py-2 text-xs font-semibold transition-colors',
                    type === t
                      ? t === 'INCOME'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : 'border-rose-500 bg-rose-500/10 text-rose-500'
                      : 'dark:border-slate-700 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:border-slate-600 hover:border-slate-300',
                  )}
                >
                  {t === 'INCOME' ? 'Ingreso' : 'Egreso'}
                </button>
              ))}
            </div>
          </div>

          {/* Contraparte */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium dark:text-slate-400 text-slate-600">Contraparte</label>
              <button
                onClick={() => setShowNewCp((v) => !v)}
                className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                {showNewCp ? 'Cancelar' : '+ Nueva'}
              </button>
            </div>

            {showNewCp ? (
              <div className="rounded-md border dark:border-slate-700 border-slate-200 p-3 space-y-2.5">
                <input
                  value={newCp.name}
                  onChange={(e) => setNewCp((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre / Razón social"
                  className={INPUT_CLS}
                />
                <input
                  value={newCp.rut}
                  onChange={(e) => setNewCp((p) => ({ ...p, rut: e.target.value }))}
                  placeholder="RUT (opcional)"
                  className={INPUT_CLS}
                />
                <select value={newCp.type} onChange={(e) => setNewCp((p) => ({ ...p, type: e.target.value }))} className={SELECT_CLS}>
                  {COUNTERPARTY_TYPES.map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                <Button
                  onClick={handleCreateCp}
                  disabled={!newCp.name.trim() || creatingCp}
                  size="sm"
                  className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {creatingCp ? 'Creando…' : 'Crear contraparte'}
                </Button>
              </div>
            ) : (
              <select value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)} className={SELECT_CLS}>
                <option value="">Sin contraparte</option>
                {counterparties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.rut ? ` · ${c.rut}` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium dark:text-slate-400 text-slate-600">Categoría</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={SELECT_CLS}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => handleSave(false)}
            disabled={isPending}
            variant="outline"
            className="flex-1 text-xs"
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          {tx.status === 'PENDING' && (
            <Button
              onClick={() => handleSave(true)}
              disabled={isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              {isPending ? 'Guardando…' : 'Marcar revisado'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
