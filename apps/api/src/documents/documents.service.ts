import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.document.findMany({ include: { counterparty: true } });
  }

  findByCompany(companyId: string) {
    return this.prisma.document.findMany({
      where: { companyId },
      include: { counterparty: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { counterparty: true, transactionLinks: { include: { transaction: true } } },
    });
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    return doc;
  }

  create(dto: CreateDocumentDto) {
    return this.prisma.document.create({ data: dto });
  }
}
