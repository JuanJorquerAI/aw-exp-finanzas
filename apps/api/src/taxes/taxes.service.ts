import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PPM_RATE = 0.1;      // ~10% ingresos afectos
const IVA_RATE = 0.19;     // 19%
const RETENCION_RATE = 0.1375; // 13.75% boletas honorarios

export interface TaxBreakdown {
  incomeAfecta: number;
  incomeExenta: number;
  expenseAfectaFactura: number;
  ppm: number;
  ivaDebito: number;
  ivaCredito: number;
  ivaNeto: number;
  retencionHonorarios: number;
  total: number;
}

export interface MonthlyTax {
  year: number;
  month: number;
  companyId: string;
  breakdown: TaxBreakdown;
}

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthly(companyId: string, year: number, month: number): Promise<MonthlyTax> {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        allocations: { some: { companyId } },
        date: { gte: from, lt: to },
        status: { notIn: ['CANCELLED'] },
      },
      include: { allocations: { where: { companyId } } },
    });

    let incomeAfecta = 0;
    let incomeExenta = 0;
    let expenseAfectaFactura = 0;
    let retencionBase = 0;

    for (const tx of transactions) {
      const alloc = tx.allocations[0];
      if (!alloc) continue;
      const amount = Number(alloc.amountCLP);

      if (tx.type === 'INCOME') {
        if (tx.isAfecta) incomeAfecta += amount;
        else incomeExenta += amount;
      } else if (tx.type === 'EXPENSE') {
        if (tx.isAfecta && tx.docType === 'FACTURA') expenseAfectaFactura += amount;
        if (tx.docType === 'BOLETA_HONORARIOS') retencionBase += amount;
      }
    }

    const ppm = Math.round(incomeAfecta * PPM_RATE);
    const ivaDebito = Math.round(incomeAfecta * IVA_RATE);
    const ivaCredito = Math.round(expenseAfectaFactura * IVA_RATE);
    const ivaNeto = Math.max(0, ivaDebito - ivaCredito);
    const retencionHonorarios = Math.round(retencionBase * RETENCION_RATE);
    const total = ppm + ivaNeto + retencionHonorarios;

    return {
      year,
      month,
      companyId,
      breakdown: {
        incomeAfecta,
        incomeExenta,
        expenseAfectaFactura,
        ppm,
        ivaDebito,
        ivaCredito,
        ivaNeto,
        retencionHonorarios,
        total,
      },
    };
  }

  async getAnnual(companyId: string, year: number): Promise<MonthlyTax[]> {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    return Promise.all(months.map((m) => this.getMonthly(companyId, year, m)));
  }
}
