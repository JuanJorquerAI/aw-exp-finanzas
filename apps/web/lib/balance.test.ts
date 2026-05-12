import { describe, it, expect } from 'vitest';
import { calculateRunningBalance } from './balance';

type TxInput = { date: string; type: 'INCOME' | 'EXPENSE' | 'TRANSFER'; amountCLP: string; id: string };

describe('calculateRunningBalance', () => {
  it('accumulates income positive', () => {
    const txs: TxInput[] = [{ date: '2026-05-01', type: 'INCOME', amountCLP: '100000', id: '1' }];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(100000);
  });

  it('accumulates expense negative, returns desc order', () => {
    const txs: TxInput[] = [
      { date: '2026-05-01', type: 'INCOME', amountCLP: '100000', id: '1' },
      { date: '2026-05-02', type: 'EXPENSE', amountCLP: '30000', id: '2' },
    ];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(70000);
    expect(result[1].balance).toBe(100000);
  });

  it('handles multiple transactions same day', () => {
    const txs: TxInput[] = [
      { date: '2026-05-01', type: 'INCOME', amountCLP: '200000', id: '1' },
      { date: '2026-05-01', type: 'EXPENSE', amountCLP: '50000', id: '2' },
      { date: '2026-05-01', type: 'EXPENSE', amountCLP: '50000', id: '3' },
    ];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(100000);
  });

  it('returns empty array for no transactions', () => {
    expect(calculateRunningBalance([])).toEqual([]);
  });

  it('ignores TRANSFER type in balance calc', () => {
    const txs: TxInput[] = [
      { date: '2026-05-01', type: 'INCOME', amountCLP: '100000', id: '1' },
      { date: '2026-05-02', type: 'TRANSFER', amountCLP: '50000', id: '2' },
    ];
    const result = calculateRunningBalance(txs as any);
    expect(result[0].balance).toBe(100000);
    expect(result[1].balance).toBe(100000);
  });
});
