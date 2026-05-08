import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: FilterTransactionsDto) {
    const { companyId, type, status, dateFrom, dateTo } = filters;
    return this.prisma.transaction.findMany({
      where: {
        ...(companyId && { allocations: { some: { companyId } } }),
        ...(type && { type }),
        ...(status && { status }),
        ...((dateFrom || dateTo) && {
          date: {
            ...(dateFrom && { gte: new Date(dateFrom) }),
            ...(dateTo && { lte: new Date(dateTo) }),
          },
        }),
      },
      include: {
        allocations: true,
        counterparty: true,
        category: true,
        document: true,
        account: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        allocations: true,
        counterparty: true,
        category: true,
        document: true,
        account: true,
      },
    });
    if (!tx) throw new NotFoundException(`Transacción ${id} no encontrada`);
    return tx;
  }

  async create(dto: CreateTransactionDto) {
    const { allocations, ...txData } = dto;
    const allocs = allocations ?? [{ companyId: txData.companyId, percentage: 100 }];

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({ data: txData });
      await tx.transactionAllocation.createMany({
        data: allocs.map((a) => ({
          transactionId: transaction.id,
          companyId: a.companyId,
          percentage: a.percentage,
          amountCLP: (txData.amountCLP * a.percentage) / 100,
        })),
      });
      return transaction;
    });
  }

  markPaid(id: string) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
