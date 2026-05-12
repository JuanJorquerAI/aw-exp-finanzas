import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCategorizationRuleDto {
  @IsString()
  pattern: string;

  @IsBoolean()
  @IsOptional()
  isRegex?: boolean;

  @IsString()
  categoryId: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;
}

export class UpdateCategorizationRuleDto {
  @IsString()
  @IsOptional()
  pattern?: string;

  @IsBoolean()
  @IsOptional()
  isRegex?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priority?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class TestRuleDto {
  @IsString()
  text: string;
}
