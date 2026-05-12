import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  createBankParser,
  importFromBank,
  importFromSheet,
  SheetImportData,
} from '@aw-finanzas/database';
import { SheetImportDto } from './dto/sheet-import.dto';
import { BankImportDto } from './dto/bank-import.dto';

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

  async importBank(
    file: Express.Multer.File,
    dto: BankImportDto,
    ctx: AuditContext = {},
  ) {
    if (!file)
      throw new BadRequestException('Archivo XLSX requerido (campo: file)');

    const bank = dto.bank ?? 'BCI';
    const fileType = dto.fileType ?? 'detallado';

    const account = await this.prisma.account.findUnique({
      where: { id: dto.accountId },
      select: { id: true, companyId: true, bankName: true },
    });
    if (!account)
      throw new BadRequestException(`Cuenta no encontrada: ${dto.accountId}`);

    try {
      const parser = createBankParser(bank, fileType);
      const rows = parser.parse(file.buffer);

      // Determinar mes de la cartola a partir de la primera fila (fallback: mes actual)
      const firstRowDate = rows[0]?.date;
      const month = firstRowDate
        ? `${firstRowDate.getFullYear()}-${String(firstRowDate.getMonth() + 1).padStart(2, '0')}`
        : new Date().toISOString().slice(0, 7);

      const bankStatement = await this.prisma.bankStatement.create({
        data: {
          companyId: account.companyId,
          accountId: account.id,
          filename: file.originalname,
          month,
          rowCount: rows.length,
        },
      });

      const result = await importFromBank(
        rows,
        {
          accountId: account.id,
          companyId: account.companyId,
          bankStatementId: bankStatement.id,
        },
        this.prisma,
      );

      await this.prisma.auditLog.create({
        data: {
          action: 'IMPORT_BANK_CSV',
          userId: ctx.userId,
          userEmail: ctx.userEmail,
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
          status: 'SUCCESS',
          metadata: {
            ...result,
            bank,
            fileType,
            accountId: account.id,
            bankStatementId: bankStatement.id,
            rowCount: rows.length,
          },
        },
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await this.prisma.auditLog.create({
        data: {
          action: 'IMPORT_BANK_CSV',
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
