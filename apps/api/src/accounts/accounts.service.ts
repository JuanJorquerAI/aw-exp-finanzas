import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.account.findMany({ where: { isActive: true } });
  }

  findByCompany(companyId: string) {
    return this.prisma.account.findMany({
      where: { companyId, isActive: true },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException(`Cuenta ${id} no encontrada`);
    return account;
  }

  create(dto: CreateAccountDto) {
    return this.prisma.account.create({ data: dto });
  }
}
