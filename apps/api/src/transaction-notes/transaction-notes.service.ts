import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionNotesService {
  constructor(private readonly prisma: PrismaService) {}

  addNote(transactionId: string, content: string) {
    return this.prisma.transactionNote.create({
      data: { transactionId, content },
    });
  }

  getNotes(transactionId: string) {
    return this.prisma.transactionNote.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
