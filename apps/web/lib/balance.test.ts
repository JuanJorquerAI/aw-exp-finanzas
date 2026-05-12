import { describe, it, expect } from 'vitest';
import { calculateRunningBalance } from './balance';
import type { Transaction } from './types';

function tx(id: string, date: string, type: Transaction['type'], amountCLP: string): Transaction {
  return { id, date, type, amountCLP, status: 'PENDING', source: 'MANUAL', documents: [], notes: [] } as unknown as Transaction;
}

describe('calculateRunningBalance', () => {
  it('accumulates income positive', () => {
    const result = calculateRunningBalance([tx('1', '2026-05-01', 'INCOME', '100000')]);
    expect(result[0].balance).toBe(100000);
  });

  it('accumulates expense negative, returns desc order', () => {
    const result = calculateRunningBalance([
      tx('1', '2026-05-01', 'INCOME', '100000'),
      tx('2', '2026-05-02', 'EXPENSE', '30000'),
    ]);
    expect(result[0].balance).toBe(70000);
    expect(result[1].balance).toBe(100000);
  });

  it('handles multiple transactions same day', () => {
    const result = calculateRunningBalance([
      tx('1', '2026-05-01', 'INCOME', '200000'),
      tx('2', '2026-05-01', 'EXPENSE', '50000'),
      tx('3', '2026-05-01', 'EXPENSE', '50000'),
    ]);
    expect(result[0].balance).toBe(100000);
  });

  it('returns empty array for no transactions', () => {
    expect(calculateRunningBalance([])).toEqual([]);
  });

  it('ignores TRANSFER type in balance calc', () => {
    const result = calculateRunningBalance([
      tx('1', '2026-05-01', 'INCOME', '100000'),
      tx('2', '2026-05-02', 'TRANSFER', '50000'),
    ]);
    expect(result[0].balance).toBe(100000);
    expect(result[1].balance).toBe(100000);
  });
});
