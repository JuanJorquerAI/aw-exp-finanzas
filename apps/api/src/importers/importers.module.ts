import { Module } from '@nestjs/common';
import { ImportersController } from './importers.controller';
import { ImportersService } from './importers.service';

@Module({ controllers: [ImportersController], providers: [ImportersService] })
export class ImportersModule {}
