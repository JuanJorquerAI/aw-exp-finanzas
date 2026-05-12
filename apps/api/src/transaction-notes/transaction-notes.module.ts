import { Module } from '@nestjs/common';
import { TransactionNotesService } from './transaction-notes.service';
import { TransactionNotesController } from './transaction-notes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionNotesController],
  providers: [TransactionNotesService],
  exports: [TransactionNotesService],
})
export class TransactionNotesModule {}
