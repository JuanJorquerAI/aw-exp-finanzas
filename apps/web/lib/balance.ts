import type { Transaction } from './types';

export type TransactionWithBalance = Transaction & { balance: number };

export function calculateRunningBalance(transactions: Transaction[]): TransactionWithBalance[] {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  const withBalance = sorted.map((tx) => {
    if (tx.type === 'INCOME') running += Number(tx.amountCLP);
    else if (tx.type === 'EXPENSE') running -= Number(tx.amountCLP);
    return { ...tx, balance: running };
  });

  return [...withBalance].reverse();
}
