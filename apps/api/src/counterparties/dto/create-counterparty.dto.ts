import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { CounterpartyType } from '@aw-finanzas/database';

export class CreateCounterpartyDto {
  @IsEnum(CounterpartyType)
  type: CounterpartyType;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
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
