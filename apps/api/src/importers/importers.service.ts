import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { importFromSheet } from '@aw-finanzas/database';
import { SheetImportDto } from './dto/sheet-import.dto';

@Injectable()
export class ImportersService {
  constructor(private readonly prisma: PrismaService) {}

  async importSheet(dto: SheetImportDto) {
    return importFromSheet(dto as any, this.prisma as any);
  }
}
