import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ImportersService } from './importers.service';
import { SheetImportDto } from './dto/sheet-import.dto';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

@Controller('importers')
export class ImportersController {
  constructor(private readonly importersService: ImportersService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('sheet')
  importSheet(@Body() dto: SheetImportDto, @Req() req: AuthenticatedRequest) {
    return this.importersService.importSheet(dto, {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
