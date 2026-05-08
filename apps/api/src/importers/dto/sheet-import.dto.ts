import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';

export class PaymentDto {
  @IsString() item: string;
  @IsNumber() amount: number;
  @IsBoolean() paid: boolean;
  @IsString() comment: string;
  @IsString() company: string;
}

export class InvoiceDto {
  @IsString() rut: string;
  @IsString() number: string;
  @IsString() type: string;
  @IsString() counterparty: string;
  @IsString() service: string;
  @IsNumber() net: number;
  @IsNumber() iva: number;
  @IsNumber() total: number;
  @IsBoolean() sent: boolean;
  @IsOptional() @IsString() paidAt: string | null;
}

export class VisaItemDto {
  @IsString() item: string;
  @IsOptional() @IsNumber() amountCLP: number | null;
  @IsOptional() @IsNumber() amountUSD: number | null;
}

export class OpportunityImportDto {
  @IsString() name: string;
  @IsNumber() amount: number;
  @IsString() company: string;
}

export class SheetImportDto {
  @IsString() month: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentDto)
  payments: PaymentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceDto)
  invoices: InvoiceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisaItemDto)
  visa: VisaItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpportunityImportDto)
  opportunities: OpportunityImportDto[];

  @IsObject()
  exchangeRate: { USD_CLP: number };
}
