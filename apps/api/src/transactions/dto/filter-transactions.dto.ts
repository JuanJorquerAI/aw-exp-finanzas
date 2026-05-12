import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';
import { TransactionType, TransactionStatus, TransactionSource } from '@aw-finanzas/database';

export class FilterTransactionsDto {
  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(TransactionSource)
  source?: TransactionSource;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
