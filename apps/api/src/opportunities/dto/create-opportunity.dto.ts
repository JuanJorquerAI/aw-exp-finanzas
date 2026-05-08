import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { OpportunityStage, Currency } from '@aw-finanzas/database';

export class CreateOpportunityDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(OpportunityStage)
  @IsOptional()
  stage?: OpportunityStage;

  @IsNumber()
  @Min(0)
  estimatedAmount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
