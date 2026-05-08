import { IsString, IsEnum, IsOptional } from 'class-validator';
import { AccountType, Currency } from '@aw-finanzas/database';

export class CreateAccountDto {
  @IsString()
  companyId: string;

  @IsString()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;
}
