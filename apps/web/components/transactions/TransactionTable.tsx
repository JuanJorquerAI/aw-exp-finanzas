import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { MarkPaidButton } from './MarkPaidButton';
import { AbonoDrawer } from './AbonoDrawer';
import { CxCActions } from './CxCActions';
import { CxPActions } from './CxPActions';
import type { Transaction } from '@/lib/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtAmount(amount: string, currency: string): string {
  const n = parseFloat(amount);
  if (currency === 'CLP') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  }
  return `${currency} ${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}`;
}

interface TransactionTableProps {
  transactions: Transaction[];
  showMarkPaid?: boolean;
  showAbono?: boolean;
  showCxCActions?: boolean;
  showCxPActions?: boolean;
}

export function TransactionTable({ transactions, showMarkPaid = false, showAbono = false, showCxCActions = false, showCxPActions = false }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-12 text-center text-sm dark:text-slate-600 text-slate-400">
        Sin transacciones para este período
      </p>
    );
  }

  return (
    <div className="rounded-lg border dark:border-slate-800 border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="dark:border-slate-800 dark:hover:bg-transparent border-slate-200 hover:bg-transparent">
            <TableHead className="w-24 dark:text-slate-500 text-slate-500 text-xs">Fecha</TableHead>
            <TableHead className="dark:text-slate-500 text-slate-500 text-xs">Descripción</TableHead>
            <TableHead className="dark:text-slate-500 text-slate-500 text-xs">Contrapartida</TableHead>
            <TableHead className="text-right dark:text-slate-500 text-slate-500 text-xs">Monto</TableHead>
            <TableHead className="w-24 dark:text-slate-500 text-slate-500 text-xs">Vence</TableHead>
            {(showMarkPaid || showAbono || showCxCActions || showCxPActions) && <TableHead className="w-44" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow
              key={tx.id}
              className="dark:border-slate-800/60 border-slate-100 dark:hover:bg-slate-900/40 hover:bg-slate-50"
            >
              <TableCell className="text-xs dark:text-slate-500 text-slate-400 tabular-nums">
                {fmtDate(tx.date)}
              </TableCell>
              <TableCell className="text-sm dark:text-slate-200 text-slate-800">
                {tx.description}
              </TableCell>
              <TableCell className="text-xs dark:text-slate-500 text-slate-400">
                {tx.counterparty?.name ?? '—'}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums dark:text-slate-200 text-slate-800">
                {fmtAmount(tx.amount, tx.currency)}
              </TableCell>
              <TableCell className="text-xs dark:text-slate-500 text-slate-400 tabular-nums">
                {tx.dueDate ? fmtDate(tx.dueDate) : '—'}
              </TableCell>
              {showMarkPaid && (
                <TableCell className="text-right">
                  <MarkPaidButton transactionId={tx.id} />
                </TableCell>
              )}
              {showAbono && (
                <TableCell className="text-right">
                  <AbonoDrawer transaction={tx} />
                </TableCell>
              )}
              {showCxCActions && (
                <TableCell className="text-right">
                  <CxCActions transaction={tx} />
                </TableCell>
              )}
              {showCxPActions && (
                <TableCell className="text-right">
                  <CxPActions transaction={tx} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
