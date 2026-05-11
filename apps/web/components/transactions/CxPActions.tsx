'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbonoDrawer } from './AbonoDrawer';
import { MoveCompanyButton } from './MoveCompanyButton';
import { useMarkPaid, useCancelTransaction } from '@/lib/queries';
import type { Transaction } from '@/lib/types';

interface CxPActionsProps {
  transaction: Transaction;
}

export function CxPActions({ transaction }: CxPActionsProps) {
  const { mutate: markPaid, isPending: payingFull } = useMarkPaid();
  const { mutate: cancel, isPending: cancelling } = useCancelTransaction();
  const [confirmCancel, setConfirmCancel] = useState(false);

  function handleCancel() {
    if (!confirmCancel) { setConfirmCancel(true); return; }
    cancel(transaction.id);
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={payingFull}
        onClick={() => markPaid(transaction.id)}
        className="h-7 border-emerald-800 bg-transparent px-2 text-xs text-emerald-500 hover:bg-emerald-950 hover:text-emerald-400 disabled:opacity-40"
      >
        ✓ Pagar
      </Button>

      <AbonoDrawer transaction={transaction} />

      {transaction.allocations.length === 1 && (
        <MoveCompanyButton transaction={transaction} />
      )}

      {confirmCancel ? (
        <Button
          size="sm"
          variant="outline"
          disabled={cancelling}
          onClick={handleCancel}
          onBlur={() => setConfirmCancel(false)}
          className="h-7 border-red-800 bg-transparent px-2 text-xs text-red-400 hover:bg-red-950 hover:text-red-300 disabled:opacity-40"
        >
          ¿Eliminar?
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled={cancelling}
          onClick={handleCancel}
          title="Eliminar (soft delete)"
          className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-transparent"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
