import { Module } from '@nestjs/common';
import { TransactionDocumentsService } from './transaction-documents.service';
import { TransactionDocumentsController } from './transaction-documents.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionDocumentsController],
  providers: [TransactionDocumentsService],
  exports: [TransactionDocumentsService],
})
export class TransactionDocumentsModule {}
