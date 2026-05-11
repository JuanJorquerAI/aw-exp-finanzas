import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { CounterpartyType } from '@aw-finanzas/database';
import { IsRUT } from '@aw-finanzas/shared';

export class CreateCounterpartyDto {
  @IsEnum(CounterpartyType)
  type: CounterpartyType;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsRUT()
  rut?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
