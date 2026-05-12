import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  CreateCategorizationRuleDto,
  UpdateCategorizationRuleDto,
} from './dto/categorization-rule.dto';
import { applyCategorizationRules } from '@aw-finanzas/database';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree() {
    const all = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    const roots = all.filter((c) => !c.parentId);
    return roots.map((root) => ({
      ...root,
      children: all.filter((c) => c.parentId === root.id),
    }));
  }

  findAll() {
    return this.prisma.category.findMany({ where: { isActive: true } });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  // ── Categorization rules ──────────────────────────────────────────────────

  findRules() {
    return this.prisma.categorizationRule.findMany({
      orderBy: { priority: 'desc' },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  createRule(dto: CreateCategorizationRuleDto) {
    return this.prisma.categorizationRule.create({
      data: {
        pattern: dto.pattern,
        isRegex: dto.isRegex ?? false,
        categoryId: dto.categoryId,
        priority: dto.priority ?? 0,
      },
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async updateRule(id: string, dto: UpdateCategorizationRuleDto) {
    const existing = await this.prisma.categorizationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Regla ${id} no encontrada`);

    return this.prisma.categorizationRule.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true, color: true } } },
    });
  }

  async deleteRule(id: string) {
    const existing = await this.prisma.categorizationRule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Regla ${id} no encontrada`);
    await this.prisma.categorizationRule.delete({ where: { id } });
    return { deleted: true };
  }

  async testRule(text: string) {
    const categoryId = await applyCategorizationRules(text, this.prisma);
    if (!categoryId) return { matched: false, category: null };
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, color: true },
    });
    return { matched: true, category };
  }
}
