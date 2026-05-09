'use client';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanies, useCreateTransaction } from '@/lib/queries';

interface FormState {
  companyCode: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: string;
  currency: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: string;
  date: string;
  dueDate: string;
}

interface NewTransactionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCompanyCode?: string;
}

const SELECT_CLS =
  'w-full rounded-md border dark:border-slate-700 border-slate-200 dark:bg-slate-900 bg-white dark:text-slate-200 text-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 dark:focus:ring-slate-600 focus:ring-slate-300';

export function NewTransactionDrawer({ open, onOpenChange, defaultCompanyCode = 'AW' }: NewTransactionDrawerProps) {
  const { data: companies = [] } = useCompanies();
  const { mutate, isPending } = useCreateTransaction();

  const today = new Date().toISOString().split('T')[0];
  const emptyForm: FormState = {
    companyCode: defaultCompanyCode,
    type: 'EXPENSE',
    description: '',
    amount: '',
    currency: 'CLP',
    amountCLP: '',
    date: today,
    dueDate: '',
  };
  const [form, setForm] = useState<FormState>(emptyForm);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'amount' && next.currency === 'CLP') next.amountCLP = value as string;
      if (key === 'currency' && value === 'CLP') next.amountCLP = next.amount;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const company = companies.find((c) => c.shortCode === form.companyCode);
    if (!company) return;

    mutate(
      {
        companyId: company.id,
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: form.currency,
        amountCLP: parseFloat(form.amountCLP || form.amount),
        date: form.date,
        ...(form.dueDate && { dueDate: form.dueDate }),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ ...emptyForm, companyCode: defaultCompanyCode });
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dark:bg-slate-950 dark:border-slate-800 bg-white w-[400px] sm:w-[420px]">
        <SheetHeader className="mb-6">
          <SheetTitle className="dark:text-slate-100 text-slate-900">Nueva Transacción</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Empresa</Label>
            <select
              value={form.companyCode}
              onChange={(e) => set('companyCode', e.target.value)}
              className={SELECT_CLS}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.shortCode}>{c.shortCode} — {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Tipo</Label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value as FormState['type'])}
              className={SELECT_CLS}
            >
              <option value="EXPENSE">Egreso (CxP)</option>
              <option value="INCOME">Ingreso (CxC)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Descripción *</Label>
            <Input
              required
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ej: Factura contador mayo"
              className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Monto *</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0"
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-600"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Moneda</Label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value as FormState['currency'])}
                className={SELECT_CLS}
              >
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
                <option value="UF">UF</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {form.currency !== 'CLP' && (
            <div className="space-y-1.5">
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Equivalente CLP *</Label>
              <Input
                required
                type="number"
                min="0"
                step="any"
                value={form.amountCLP}
                onChange={(e) => set('amountCLP', e.target.value)}
                placeholder="Monto en pesos"
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-600"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Fecha *</Label>
              <Input
                required
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Vencimiento</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set('dueDate', e.target.value)}
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            {isPending ? 'Guardando...' : 'Guardar Transacción'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
