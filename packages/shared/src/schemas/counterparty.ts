import { z } from 'zod';

export const CounterpartyTypeSchema = z.enum([
  'CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'GOVERNMENT', 'BANK', 'OTHER',
]);

export const CreateCounterpartySchema = z.object({
  type: CounterpartyTypeSchema,
  name: z.string().min(1).max(255),
  rut: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCounterpartyDto = z.infer<typeof CreateCounterpartySchema>;
