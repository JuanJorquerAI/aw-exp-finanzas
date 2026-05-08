import { z } from 'zod';

export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);
export const TransactionStatusSchema = z.enum(['PENDING', 'PAID', 'RECONCILED', 'CANCELLED']);
export const CurrencySchema = z.enum(['CLP', 'USD', 'UF', 'EUR']);

export const CreateTransactionSchema = z.object({
  companyId: z.string().min(1),
  accountId: z.string().min(1).optional(),
  counterpartyId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  documentId: z.string().min(1).optional(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  currency: CurrencySchema.default('CLP'),
  exchangeRate: z.number().positive().optional(),
  amountCLP: z.number().positive(),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  description: z.string().min(1).max(500),
  comment: z.string().optional(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;
