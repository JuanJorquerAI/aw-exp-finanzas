import { CreateTransactionSchema, CreateCounterpartySchema } from '../index';

describe('CreateTransactionSchema', () => {
  it('acepta transacción válida', () => {
    const result = CreateTransactionSchema.safeParse({
      companyId: 'cjld2cjxh0000qzrmn831i7rn',
      type: 'EXPENSE',
      amount: 100000,
      amountCLP: 100000,
      date: '2026-05-01',
      description: 'IVA + PPM',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza montos negativos', () => {
    const result = CreateTransactionSchema.safeParse({
      companyId: 'cjld2cjxh0000qzrmn831i7rn',
      type: 'EXPENSE',
      amount: -100,
      amountCLP: -100,
      date: '2026-05-01',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza type inválido', () => {
    const result = CreateTransactionSchema.safeParse({
      companyId: 'cjld2cjxh0000qzrmn831i7rn',
      type: 'INVALID',
      amount: 100,
      amountCLP: 100,
      date: '2026-05-01',
      description: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateCounterpartySchema', () => {
  it('rechaza email inválido', () => {
    const result = CreateCounterpartySchema.safeParse({
      type: 'CUSTOMER',
      name: 'Test',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});
