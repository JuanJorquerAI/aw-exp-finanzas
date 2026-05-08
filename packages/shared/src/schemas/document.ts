import { z } from 'zod';
import { CurrencySchema } from './transaction';

export const DocumentTypeSchema = z.enum([
  'AFECTA', 'EXENTA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'HONORARIOS',
]);

export const CreateDocumentSchema = z.object({
  companyId: z.string().min(1),
  counterpartyId: z.string().min(1).optional(),
  type: DocumentTypeSchema,
  number: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  netAmount: z.number().min(0),
  ivaAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  currency: CurrencySchema.default('CLP'),
  description: z.string().optional(),
  detail: z.string().optional(),
  isSent: z.boolean().default(false),
});

export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
