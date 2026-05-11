import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { importFromSheet } from '@aw-finanzas/database';
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
    try {
      const result = await importFromSheet(dto as any, this.prisma as any);
      await this.prisma.auditLog.create({
        data: {
          action: 'IMPORT_SHEET',
          userId: ctx.userId,
          userEmail: ctx.userEmail,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          status: 'SUCCESS',
          metadata: result as object,
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
