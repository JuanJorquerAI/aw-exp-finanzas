import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsBoolean,
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
  @IsString()
  @MaxLength(255)
  razonSocial?: string;

  @IsOptional()
  @IsBoolean()
  isPersonaNatural?: boolean;

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
