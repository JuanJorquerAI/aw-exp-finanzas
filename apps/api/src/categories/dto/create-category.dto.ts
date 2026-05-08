import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { TransactionType } from '@aw-finanzas/database';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
