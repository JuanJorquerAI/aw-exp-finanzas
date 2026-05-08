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
        ...(companyId && { companyId }),
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
      },
    });
    if (!tx) throw new NotFoundException(`Transacción ${id} no encontrada`);
    return tx;
  }

  create(dto: CreateTransactionDto) {
    return this.prisma.transaction.create({ data: dto });
  }

  markPaid(id: string) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }
}
