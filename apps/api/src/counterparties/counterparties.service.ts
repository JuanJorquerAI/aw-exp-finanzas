import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCounterpartyDto } from './dto/create-counterparty.dto';

@Injectable()
export class CounterpartiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.counterparty.findMany({ where: { isActive: true } });
  }

  async findOne(id: string) {
    const cp = await this.prisma.counterparty.findUnique({ where: { id } });
    if (!cp) throw new NotFoundException(`Contraparte ${id} no encontrada`);
    return cp;
  }

  create(dto: CreateCounterpartyDto) {
    return this.prisma.counterparty.create({ data: dto });
  }

  update(id: string, dto: Partial<CreateCounterpartyDto>) {
    return this.prisma.counterparty.update({ where: { id }, data: dto });
  }
}
