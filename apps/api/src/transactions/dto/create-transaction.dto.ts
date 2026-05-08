import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsPositive,
} from 'class-validator';
import { TransactionType, Currency } from '@aw-finanzas/database';

export class CreateTransactionDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsNumber()
  @IsPositive()
  amountCLP: number;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
