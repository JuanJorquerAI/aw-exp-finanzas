import { IsString, IsNotEmpty } from 'class-validator';

export class MoveTransactionDto {
  @IsString()
  @IsNotEmpty()
  companyId!: string;
}
