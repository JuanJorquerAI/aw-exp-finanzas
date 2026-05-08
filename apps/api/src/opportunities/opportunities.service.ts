import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { OpportunityStage } from '@aw-finanzas/database';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.opportunity.findMany({
      include: { company: true, counterparty: true },
    });
  }

  findByCompany(companyId: string) {
    return this.prisma.opportunity.findMany({
      where: { companyId },
      include: { counterparty: true },
      orderBy: { estimatedAmount: 'desc' },
    });
  }

  async findOne(id: string) {
    const opp = await this.prisma.opportunity.findUnique({ where: { id } });
    if (!opp) throw new NotFoundException(`Oportunidad ${id} no encontrada`);
    return opp;
  }

  create(dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({ data: dto });
  }

  updateStage(id: string, stage: OpportunityStage) {
    return this.prisma.opportunity.update({ where: { id }, data: { stage } });
  }
}
