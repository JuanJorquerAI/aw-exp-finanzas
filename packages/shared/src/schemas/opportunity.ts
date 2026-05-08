import { z } from 'zod';
import { CurrencySchema } from './transaction';

export const OpportunityStageSchema = z.enum([
  'PROSPECTING', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST', 'ON_HOLD',
]);

export const CreateOpportunitySchema = z.object({
  companyId: z.string().min(1),
  counterpartyId: z.string().min(1).optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  stage: OpportunityStageSchema.default('PROSPECTING'),
  estimatedAmount: z.number().min(0),
  currency: CurrencySchema.default('CLP'),
  probability: z.number().int().min(0).max(100).default(50),
  expectedCloseDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type CreateOpportunityDto = z.infer<typeof CreateOpportunitySchema>;
