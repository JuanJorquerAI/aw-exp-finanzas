import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsOptional()
  @IsEnum(['INCOME', 'EXPENSE', 'TRANSFER'])
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';

  @IsOptional()
  @IsEnum(['PENDING', 'PAID', 'RECONCILED', 'CANCELLED'])
  status?: 'PENDING' | 'PAID' | 'RECONCILED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  description?: string;
}
