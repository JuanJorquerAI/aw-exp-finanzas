'use client';
import { Button } from '@/components/ui/button';
import { useMarkPaid } from '@/lib/queries';

export function MarkPaidButton({ transactionId }: { transactionId: string }) {
  const { mutate, isPending } = useMarkPaid();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => mutate(transactionId)}
      className="h-7 border-emerald-800 bg-transparent px-2 text-xs text-emerald-500 hover:bg-emerald-950 hover:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950 disabled:opacity-40"
    >
      ✓ Pagar
    </Button>
  );
}
