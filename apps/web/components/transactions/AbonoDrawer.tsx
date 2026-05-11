'use client';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTransaction, useAddPayment } from '@/lib/queries';
import { DatePicker } from '@/components/ui/date-picker';
import type { Transaction, TransactionPayment, TransactionAuditLog } from '@/lib/types';

function fmtAmount(amount: string, currency: string): string {
  const n = parseFloat(amount);
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  }
  return `${currency} ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

type TimelineItem =
  | { kind: 'payment'; date: string; data: TransactionPayment }
  | { kind: 'audit'; date: string; data: TransactionAuditLog };

function buildTimeline(payments: TransactionPayment[], auditLogs: TransactionAuditLog[]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...payments.map((p): TimelineItem => ({ kind: 'payment', date: p.paidAt, data: p })),
    ...auditLogs.map((a): TimelineItem => ({ kind: 'audit', date: a.createdAt, data: a })),
  ];
  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function auditLabel(log: TransactionAuditLog): string {
  if (log.action === 'MOVE_COMPANY') {
    return `Movido de ${log.fromLabel ?? log.fromValue} → ${log.toLabel ?? log.toValue}`;
  }
  return log.action;
}

interface AbonoFormProps {
  tx: Transaction;
  onClose: () => void;
}

function AbonoForm({ tx, onClose }: AbonoFormProps) {
  const { data: detail } = useTransaction(tx.id);
  const { mutate, isPending } = useAddPayment();

  const payments = detail?.payments ?? [];
  const auditLogs = detail?.auditLogs ?? [];
  const timeline = buildTimeline(payments, auditLogs);

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
  const remaining = Math.max(0, parseFloat(tx.amount) - totalPaid);

  const [amount, setAmount] = useState(remaining.toString());
  const [paidAt, setPaidAt] = useState(todayISO());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0) { setError('Monto inválido'); return; }
    if (n > remaining + 0.01) { setError(`Máximo aboneable: ${fmtAmount(remaining.toString(), tx.currency)}`); return; }
    setError('');
    mutate(
      { transactionId: tx.id, dto: { amount: n, currency: tx.currency, paidAt, note: note || undefined } },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-slate-900 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Total</span>
          <span className="font-semibold tabular-nums dark:text-slate-100">{fmtAmount(tx.amount, tx.currency)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-slate-400">Pagado</span>
          <span className="tabular-nums text-emerald-400">{fmtAmount(totalPaid.toString(), tx.currency)}</span>
        </div>
        <div className="mt-2 border-t border-slate-700 pt-2 flex justify-between">
          <span className="text-slate-300 font-medium">Pendiente</span>
          <span className="font-bold tabular-nums text-amber-400">{fmtAmount(remaining.toString(), tx.currency)}</span>
        </div>
      </div>

      {timeline.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Bitácora</p>
          <ul className="space-y-2">
            {timeline.map((item) => {
              if (item.kind === 'payment') {
                const p = item.data as TransactionPayment;
                return (
                  <li key={p.id} className="rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{fmtDate(p.paidAt)}</span>
                      <span className="text-sm font-semibold tabular-nums text-emerald-400">
                        {fmtAmount(p.amount, p.currency)}
                      </span>
                    </div>
                    {p.note && <p className="mt-1 text-xs text-slate-500">{p.note}</p>}
                  </li>
                );
              }
              const a = item.data as TransactionAuditLog;
              return (
                <li key={a.id} className="rounded-md border border-indigo-900/50 bg-indigo-950/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{fmtDate(a.createdAt)}</span>
                    <span className="text-xs text-indigo-400">{auditLabel(a)}</span>
                  </div>
                  {a.note && <p className="mt-1 text-xs text-slate-500">{a.note}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {remaining > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nuevo abono</p>

          <div className="space-y-1">
            <Label htmlFor="abono-amount" className="text-xs text-slate-400">Monto ({tx.currency})</Label>
            <Input
              id="abono-amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="tabular-nums"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-slate-400">Fecha de pago</Label>
            <DatePicker value={paidAt} onChange={setPaidAt} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="abono-note" className="text-xs text-slate-400">Nota (opcional)</Label>
            <Textarea
              id="abono-note"
              rows={2}
              placeholder="Ej: Transferencia BCI, cheque #1234…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Registrando…' : 'Registrar abono'}
          </Button>
        </form>
      )}

      {remaining <= 0 && (
        <p className="text-center text-sm text-emerald-400">✓ Deuda saldada completamente</p>
      )}
    </div>
  );
}

interface AbonoDrawerProps {
  transaction: Transaction;
}

export function AbonoDrawer({ transaction }: AbonoDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-emerald-800 bg-transparent px-2 text-xs text-emerald-500 hover:bg-emerald-950 hover:text-emerald-400 disabled:opacity-40"
        >
          $ Abonar
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base">{transaction.description}</SheetTitle>
          <p className="text-xs text-slate-500">{transaction.counterparty?.name ?? 'Sin contrapartida'}</p>
        </SheetHeader>
        <AbonoForm tx={transaction} onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
