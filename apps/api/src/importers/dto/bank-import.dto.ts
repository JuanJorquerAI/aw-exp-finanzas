import { IsIn, IsOptional, IsString } from 'class-validator';

export class BankImportDto {
  @IsString()
  accountId: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsIn(['detallado', 'historico'])
  fileType?: 'detallado' | 'historico';
}
