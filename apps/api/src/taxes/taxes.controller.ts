import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get('monthly')
  getMonthly(
    @Query('companyId') companyId: string,
    @Query('year') yearStr: string,
    @Query('month') monthStr: string,
  ) {
    if (!companyId) throw new BadRequestException('companyId requerido');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      throw new BadRequestException('year y month deben ser números válidos');
    }
    return this.taxesService.getMonthly(companyId, year, month);
  }

  @Get('annual')
  getAnnual(
    @Query('companyId') companyId: string,
    @Query('year') yearStr: string,
  ) {
    if (!companyId) throw new BadRequestException('companyId requerido');
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) throw new BadRequestException('year debe ser un número válido');
    return this.taxesService.getAnnual(companyId, year);
  }
}
