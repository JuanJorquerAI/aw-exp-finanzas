'use client';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCompanies, useCreateTransaction } from '@/lib/queries';
import { DatePicker } from '@/components/ui/date-picker';
import type { TransactionDocType } from '@/lib/types';

interface FormState {
  companyCode: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: string;
  currency: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: string;
  date: string;
  dueDate: string;
  docType: TransactionDocType;
  isAfecta: boolean;
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
    docType: 'OTRO',
    isAfecta: true,
  };
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm((prev) => ({ ...prev, companyCode: defaultCompanyCode }));
    }
  }, [open, defaultCompanyCode]);

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
        docType: form.docType,
        isAfecta: form.isAfecta,
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
            <Label htmlFor="nt-company" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Empresa</Label>
            <select
              id="nt-company"
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
            <Label htmlFor="nt-type" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Tipo</Label>
            <select
              id="nt-type"
              value={form.type}
              onChange={(e) => set('type', e.target.value as FormState['type'])}
              className={SELECT_CLS}
            >
              <option value="EXPENSE">Egreso (CxP)</option>
              <option value="INCOME">Ingreso (CxC)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-desc" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Descripción</Label>
            <Input
              id="nt-desc"
              required
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Ej: Factura contador mayo"
              className="dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nt-amount" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Monto</Label>
              <Input
                id="nt-amount"
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
              <Label htmlFor="nt-currency" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Moneda</Label>
              <select
                id="nt-currency"
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
              <Label htmlFor="nt-amountclp" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Equivalente CLP</Label>
              <Input
                id="nt-amountclp"
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
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Fecha</Label>
              <DatePicker value={form.date} onChange={(v) => set('date', v)} />
            </div>
            <div className="space-y-1.5">
              <Label className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Vencimiento</Label>
              <DatePicker value={form.dueDate} onChange={(v) => set('dueDate', v)} placeholder="Opcional" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nt-doctype" className="dark:text-slate-400 text-slate-600 text-xs uppercase tracking-wider">Tipo Documento</Label>
            <select
              id="nt-doctype"
              value={form.docType}
              onChange={(e) => set('docType', e.target.value as TransactionDocType)}
              className={SELECT_CLS}
            >
              <option value="FACTURA">Factura</option>
              <option value="BOLETA_HONORARIOS">Boleta Honorarios</option>
              <option value="OTRO">Otro / Sin documento</option>
            </select>
          </div>

          {form.docType !== 'BOLETA_HONORARIOS' && (
            <div className="flex items-center justify-between rounded-md dark:bg-slate-900 bg-slate-50 border dark:border-slate-700 border-slate-200 px-3 py-2.5">
              <div>
                <p className="text-sm dark:text-slate-200 text-slate-800 font-medium">Afecta a IVA</p>
                <p className="text-xs dark:text-slate-500 text-slate-400">IVA débito/crédito y PPM</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isAfecta}
                onClick={() => set('isAfecta', !form.isAfecta)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isAfecta ? 'bg-indigo-600' : 'dark:bg-slate-700 bg-slate-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isAfecta ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          )}

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
