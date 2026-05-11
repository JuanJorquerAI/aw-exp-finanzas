import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { importFromSheet, SheetImportData } from '@aw-finanzas/database';
import { SheetImportDto } from './dto/sheet-import.dto';

interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ImportersService {
  constructor(private readonly prisma: PrismaService) {}

  async importSheet(dto: SheetImportDto, ctx: AuditContext = {}) {
    const payload: SheetImportData = dto;
    try {
      const result = await importFromSheet(payload, this.prisma);
      await this.prisma.auditLog.create({
        data: {
          action: 'IMPORT_SHEET',
          userId: ctx.userId,
          userEmail: ctx.userEmail,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          status: 'SUCCESS',
          metadata: result,
        },
      });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.prisma.auditLog.create({
        data: {
          action: 'IMPORT_SHEET',
          userId: ctx.userId,
          userEmail: ctx.userEmail,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          status: 'FAILURE',
          errorMessage: message,
        },
      });
      throw err;
    }
  }
}
