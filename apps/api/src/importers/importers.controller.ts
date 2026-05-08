import { Controller, Post, Body } from '@nestjs/common';
import { ImportersService } from './importers.service';
import { SheetImportDto } from './dto/sheet-import.dto';

@Controller('importers')
export class ImportersController {
  constructor(private readonly importersService: ImportersService) {}

  @Post('sheet')
  importSheet(@Body() dto: SheetImportDto) {
    return this.importersService.importSheet(dto);
  }
}
