import { IsString, IsOptional, MaxLength } from 'class-validator';
import { IsRUT } from '@aw-finanzas/shared';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(20)
  shortCode: string;

  @IsOptional()
  @IsRUT()
  rut?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
