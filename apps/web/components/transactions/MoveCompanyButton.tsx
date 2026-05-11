'use client';
import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompanies, useMoveTransaction } from '@/lib/queries';
import type { Transaction } from '@/lib/types';

interface MoveCompanyButtonProps {
  transaction: Transaction;
}

export function MoveCompanyButton({ transaction }: MoveCompanyButtonProps) {
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState('');
  const { data: companies = [] } = useCompanies();
  const { mutate: move, isPending } = useMoveTransaction();

  const currentCompanyId = transaction.allocations[0]?.companyId;
  const targets = companies.filter((c) => c.id !== currentCompanyId && c.isActive);

  if (targets.length === 0) return null;

  function handleConfirm() {
    if (!targetId) return;
    move({ id: transaction.id, companyId: targetId }, { onSuccess: () => setOpen(false) });
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => { setTargetId(targets[0].id); setOpen(true); }}
        title="Mover a otra empresa"
        className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-400 hover:bg-transparent"
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <select
        autoFocus
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        className="h-7 rounded border border-indigo-800 bg-slate-950 px-1.5 text-xs text-indigo-300 focus:outline-none"
      >
        {targets.map((c) => (
          <option key={c.id} value={c.id}>{c.shortCode}</option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleConfirm}
        className="h-7 border-indigo-800 bg-transparent px-2 text-xs text-indigo-400 hover:bg-indigo-950 hover:text-indigo-300 disabled:opacity-40"
      >
        {isPending ? '…' : '→'}
      </Button>
    </div>
  );
}
