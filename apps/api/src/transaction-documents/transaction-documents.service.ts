import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  link(transactionId: string, documentId: string, note?: string) {
    return this.prisma.transactionDocument.create({
      data: { transactionId, documentId, ...(note && { note }) },
      include: { document: true },
    });
  }

  findByTransaction(transactionId: string) {
    return this.prisma.transactionDocument.findMany({
      where: { transactionId },
      include: { document: { include: { counterparty: true } } },
      orderBy: { linkedAt: 'asc' },
    });
  }

  unlink(id: string) {
    return this.prisma.transactionDocument.delete({ where: { id } });
  }
}
