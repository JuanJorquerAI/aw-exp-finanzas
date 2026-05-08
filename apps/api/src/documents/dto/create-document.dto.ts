import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { DocumentType, Currency } from '@aw-finanzas/database';

export class CreateDocumentDto {
  @IsString()
  companyId: string;

  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  netAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  ivaAmount?: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isSent?: boolean;
}
