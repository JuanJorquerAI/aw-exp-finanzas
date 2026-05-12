import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizeRut } from '@aw-finanzas/shared';
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
    const data = dto.rut ? { ...dto, rut: normalizeRut(dto.rut) } : dto;
    return this.prisma.counterparty.create({ data });
  }

  update(id: string, dto: Partial<CreateCounterpartyDto>) {
    const data = dto.rut ? { ...dto, rut: normalizeRut(dto.rut) } : dto;
    return this.prisma.counterparty.update({ where: { id }, data });
  }

  async upsertByRut(rut: string, dto: Partial<CreateCounterpartyDto>) {
    const normalizedRut = normalizeRut(rut);
    const existing = await this.prisma.counterparty.findUnique({
      where: { rut: normalizedRut },
    });
    if (existing) return existing;
    return this.prisma.counterparty.create({
      data: {
        name: '',
        type: 'OTHER',
        ...dto,
        rut: normalizedRut,
      },
    });
  }
}
