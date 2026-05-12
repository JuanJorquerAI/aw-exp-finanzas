import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionsDto } from './dto/filter-transactions.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: FilterTransactionsDto) {
    const { companyId, type, status, source, dateFrom, dateTo } = filters;
    return this.prisma.transaction.findMany({
      where: {
        ...(companyId && { allocations: { some: { companyId } } }),
        ...(type && { type }),
        ...(status && { status }),
        ...(source && { source }),
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
        account: true,
        documents: {
          include: { document: { include: { counterparty: true } } },
        },
        notes: { orderBy: { createdAt: 'asc' } },
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
        account: true,
        documents: {
          include: { document: { include: { counterparty: true } } },
        },
        notes: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { paidAt: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!tx) throw new NotFoundException(`Transacción ${id} no encontrada`);
    return tx;
  }

  async create(dto: CreateTransactionDto) {
    const { allocations, companyId, date, dueDate, ...rest } = dto;
    const allocs = allocations ?? [{ companyId, percentage: 100 }];
    const txData = {
      ...rest,
      companyId,
      date: new Date(date),
      ...(dueDate && { dueDate: new Date(dueDate) }),
    };

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

  async moveToCompany(id: string, companyId: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: { allocations: true, company: true },
    });
    if (!tx) throw new NotFoundException(`Transacción ${id} no encontrada`);
    if (tx.allocations.length !== 1) {
      throw new BadRequestException(
        'Solo se pueden mover transacciones con asignación simple (100% una empresa)',
      );
    }

    const targetCompany = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!targetCompany)
      throw new NotFoundException(`Empresa ${companyId} no encontrada`);

    return this.prisma.$transaction(async (prisma) => {
      await prisma.transactionAllocation.update({
        where: { id: tx.allocations[0].id },
        data: { companyId },
      });
      const updated = await prisma.transaction.update({
        where: { id },
        data: { companyId },
        include: { allocations: true, counterparty: true },
      });
      await prisma.transactionAuditLog.create({
        data: {
          transactionId: id,
          action: 'MOVE_COMPANY',
          fromValue: tx.companyId,
          toValue: companyId,
          fromLabel: tx.company.shortCode,
          toLabel: targetCompany.shortCode,
        },
      });
      return updated;
    });
  }

  cancel(id: string) {
    return this.prisma.transaction.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  update(
    id: string,
    dto: {
      categoryId?: string;
      counterpartyId?: string;
      type?: string;
      status?: string;
      description?: string;
    },
  ) {
    const data: Record<string, unknown> = {};
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId || null;
    if (dto.counterpartyId !== undefined)
      data.counterpartyId = dto.counterpartyId || null;
    if (dto.type) data.type = dto.type;
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'PAID') data.paidAt = new Date();
    }
    if (dto.description) data.description = dto.description;
    return this.prisma.transaction.update({
      where: { id },
      data,
      include: { allocations: true, counterparty: true, category: true },
    });
  }

  async updateStatus(
    id: string,
    status: 'PENDING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'RECONCILED',
  ) {
    await this.findOne(id);
    return this.prisma.transaction.update({
      where: { id },
      data: { status },
    });
  }

  async addPayment(transactionId: string, dto: CreatePaymentDto) {
    const tx = await this.findOne(transactionId);

    return this.prisma.$transaction(async (prisma) => {
      const payment = await prisma.transactionPayment.create({
        data: {
          transactionId,
          amount: dto.amount,
          ...(dto.currency && {
            currency: dto.currency as 'CLP' | 'USD' | 'UF' | 'EUR',
          }),
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          note: dto.note ?? null,
          ...(dto.accountId && { accountId: dto.accountId }),
        },
      });

      const agg = await prisma.transactionPayment.aggregate({
        where: { transactionId },
        _sum: { amount: true },
      });

      const totalPaid = Number(agg._sum.amount ?? 0);
      const totalAmount = Number(tx.amount);

      if (totalPaid >= totalAmount) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'PAID', paidAt: payment.paidAt },
        });
      }

      return payment;
    });
  }
}
