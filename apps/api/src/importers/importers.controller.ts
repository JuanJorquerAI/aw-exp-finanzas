import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ImportersService } from './importers.service';
import { SheetImportDto } from './dto/sheet-import.dto';
import { BankImportDto } from './dto/bank-import.dto';
import { Public } from '../auth/public.decorator';

interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

@Public()
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

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('bank')
  @UseInterceptors(FileInterceptor('file'))
  importBank(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: BankImportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.importersService.importBank(file, dto, {
      userId: req.user?.userId,
      userEmail: req.user?.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
